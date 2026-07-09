/**
 * Zero-cost LLM summarization waterfall: Gemini free tier -> Groq free tier
 * -> Pollinations.ai (no key needed, always available). Adapted from the
 * *architecture* of GraphOne's MultiModelClient
 * (ingestion/atlas_ingestion/llm/multi_model_client.py) — same three tiers,
 * same JSON-mode request shapes, same "429 triggers fallback" behavior, same
 * markdown-code-fence stripping before JSON.parse. Not a verbatim port.
 *
 * Deliberately different from GraphOne's client:
 * - No sys.exit(1) on a missing GEMINI_API_KEY. Their script uses that as a
 *   startup health gate for a dedicated batch job; this runs inline inside
 *   real-time ingestion, which must never block on LLM availability — a
 *   missing key (or an exhausted waterfall) just means generateAiSummary()
 *   returns null and the caller falls back to the RSS description.
 * - Fewer retries and shorter backoffs (GraphOne: 3 retries, 120s client
 *   timeout, up to 15s*(attempt+1) Gemini backoff) — appropriate for their
 *   slow, dedicated extraction batch, not for a pipeline that summarizes
 *   dozens of articles per ingest run and is already tuned for speed.
 *
 * Real free-tier limits this module paces against (verified where noted —
 * see the per-tier IntervalGate constants below for the actual numbers and
 * sources):
 * - Gemini: exact RPM unconfirmed (Google no longer publishes a static
 *   free-tier table; per-account and viewable only in an authenticated
 *   AI Studio dashboard). Paced conservatively since we can't be sure.
 * - Groq (llama-3.1-8b-instant): confirmed from Groq's own docs — 30 RPM,
 *   14.4K RPD, 6K TPM, 500K TPD. TPM is the real constraint, not RPM. This
 *   is enforced, not assumed: MAX_PROMPT_TITLE_CHARS/MAX_PROMPT_SOURCE_CHARS
 *   (see buildSummaryPrompt) hard-cap prompt size regardless of how long an
 *   upstream RSS description or page meta description happens to be, and
 *   MAX_COMPLETION_TOKENS hard-caps the response — worst case ~710
 *   tokens/request, comfortably under the 800-token budget groqGate's
 *   7.5 req/min pacing assumes (~5,325 TPM worst case vs the 6K limit).
 * - Pollinations.ai: confirmed from their own API docs — anonymous/no-key
 *   use is capped at 1 request per 15 seconds *per IP*, not unlimited as
 *   originally assumed here. Since every article that reaches this tier in
 *   a single ingest run shares one GitHub Actions runner's IP, concurrent
 *   fallback calls were colliding and 429-ing each other — fixed via
 *   pollinationsGate below.
 */

const GEMINI_MODEL = "gemini-flash-lite-latest";
const GROQ_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 20_000;
// A single pass through all 3 tiers, not a repeated full waterfall. Any
// article that still ends up with a weak/fallback summary just falls back
// to its RSS description (see pipeline.ts) — retrying the full waterfall
// again 1.5s later rarely changes the outcome for a genuine failure and
// mostly just doubles worst-case latency, so a single pass is a safe trade
// of a small amount of coverage for a real speed win at real ingestion
// volume.
const WATERFALL_RETRIES = 1;

/**
 * Serializes calls with a minimum spacing between them — a proper per-tier
 * rate limiter, unlike the plain concurrency cap below (Semaphore), which
 * only bounds how many calls are in flight at once and says nothing about
 * how *frequently* a single provider gets hit. Acquisitions are chained
 * through a promise queue so callers are served in order, each waiting out
 * whatever's left of the minimum interval since the last acquisition.
 */
class IntervalGate {
  private nextAvailableAt = 0;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  acquire(): Promise<void> {
    const turn = this.queue.then(async () => {
      const wait = this.nextAvailableAt - Date.now();
      if (wait > 0) await sleep(wait);
      this.nextAvailableAt = Date.now() + this.minIntervalMs;
    });
    // Swallow rejections in the chain itself so one failed wait doesn't
    // wedge every caller queued behind it — callers still see their own
    // turn's promise (which never rejects; sleep() can't throw).
    this.queue = turn.catch(() => {});
    return turn;
  }
}

// ~13.3 req/min — deliberately conservative given the exact Gemini free-tier
// RPM couldn't be confirmed (commonly-cited third-party figure is ~15 RPM,
// unverified). Gemini is the first tier every article tries, so it's the
// most exposed to a wrong guess here; erring conservative just means a few
// more articles fall through to Groq, which is harmless.
const GEMINI_MIN_INTERVAL_MS = 4500;
// ~7.5 req/min — paced to the confirmed 6K TPM budget (the binding Groq
// limit) assuming ~800 tokens/request worst case, not the higher 30 RPM
// headline number.
const GROQ_MIN_INTERVAL_MS = 8000;
// Confirmed 1 req/15s per IP; +500ms margin for clock/network jitter so we
// never land exactly on the boundary.
const POLLINATIONS_MIN_INTERVAL_MS = 15_500;

const geminiGate = new IntervalGate(GEMINI_MIN_INTERVAL_MS);
const groqGate = new IntervalGate(GROQ_MIN_INTERVAL_MS);
const pollinationsGate = new IntervalGate(POLLINATIONS_MIN_INTERVAL_MS);

const DEBUG = !!process.env.LLM_SUMMARIZER_DEBUG;
function debug(msg: string): void {
  if (DEBUG) console.log(`  [llm-debug] ${msg}`);
}

/**
 * A GLOBAL concurrency gate across every call into this module, not just a
 * per-source one. pipeline.ts bounds LLM calls to 4-at-a-time *within* a
 * single source, but up to 4 sources also run concurrently — meaning up to
 * 4×4=16 LLM requests could fire at once with no cross-source coordination.
 * The per-tier IntervalGates above are what actually keep each provider's
 * real-world rate limit from being violated; this cap is now a secondary
 * backstop that just bounds how many articles are mid-summarization (and
 * how many open HTTP connections/timers exist) at once, so a burst of new
 * articles can't pile up an unbounded number of pending waterfall attempts
 * all waiting on the same interval gates at once.
 */
class Semaphore {
  private available: number;
  private readonly queue: (() => void)[] = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.available--;
        resolve();
      });
    });
  }

  release(): void {
    this.available++;
    const next = this.queue.shift();
    if (next) next();
  }
}

const GLOBAL_LLM_CONCURRENCY = 4;
const llmGate = new Semaphore(GLOBAL_LLM_CONCURRENCY);

interface WaterfallResult {
  result: Record<string, unknown> | null;
}

const FAILED: WaterfallResult = { result: null };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strips a ```json ... ``` or ``` ... ``` wrapper some models add despite being asked for raw JSON. */
function stripMarkdownFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.slice(3);
  if (t.endsWith("```")) t = t.slice(0, -3);
  return t.trim();
}

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(stripMarkdownFence(text));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Tier 1: Gemini free tier. */
async function tryGemini(prompt: string, apiKey: string): Promise<WaterfallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: MAX_COMPLETION_TOKENS },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) {
      debug(`Gemini -> 429 rate limited`);
      return FAILED;
    }
    if (!res.ok) {
      debug(`Gemini -> HTTP ${res.status} ${res.statusText}`);
      return FAILED;
    }

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      debug(`Gemini -> no text in response: ${JSON.stringify(data).slice(0, 200)}`);
      return FAILED;
    }
    const parsed = safeParseJson(text);
    debug(`Gemini -> ${parsed ? "success" : `failed to parse JSON from: ${text.slice(0, 150)}`}`);
    return { result: parsed };
  } catch (err) {
    debug(`Gemini -> exception: ${(err as Error).name}: ${(err as Error).message}`);
    return FAILED;
  }
}

/** Tier 2: Groq free tier — OpenAI-compatible chat completions API. */
async function tryGroq(prompt: string, apiKey: string): Promise<WaterfallResult> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: MAX_COMPLETION_TOKENS,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) {
      debug(`Groq -> 429 rate limited`);
      return FAILED;
    }
    if (!res.ok) {
      debug(`Groq -> HTTP ${res.status} ${res.statusText}`);
      return FAILED;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      debug(`Groq -> no content in response: ${JSON.stringify(data).slice(0, 200)}`);
      return FAILED;
    }
    const parsed = safeParseJson(text);
    debug(`Groq -> ${parsed ? "success" : `failed to parse JSON from: ${text.slice(0, 150)}`}`);
    return { result: parsed };
  } catch (err) {
    debug(`Groq -> exception: ${(err as Error).name}: ${(err as Error).message}`);
    return FAILED;
  }
}

/** Tier 3: Pollinations.ai — free, public, no API key. Response body is the raw completion text, not a wrapped JSON envelope. */
async function tryPollinations(prompt: string): Promise<WaterfallResult> {
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model: "openai", jsonMode: true }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      debug(`Pollinations -> HTTP ${res.status} ${res.statusText}`);
      return FAILED;
    }
    const text = await res.text();
    const parsed = safeParseJson(text);
    debug(`Pollinations -> ${parsed ? "success" : `failed to parse JSON from: ${text.slice(0, 150)}`}`);
    return { result: parsed };
  } catch (err) {
    debug(`Pollinations -> exception: ${(err as Error).name}: ${(err as Error).message}`);
    return FAILED;
  }
}

/** Waterfall: Gemini -> Groq -> Pollinations, retried a couple of times with a short backoff between full passes. */
async function generateJsonGated(prompt: string): Promise<Record<string, unknown> | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  debug(`starting waterfall — GEMINI_API_KEY ${geminiKey ? "present" : "MISSING"}, GROQ_API_KEY ${groqKey ? "present" : "MISSING"}`);

  for (let attempt = 0; attempt < WATERFALL_RETRIES; attempt++) {
    if (geminiKey) {
      await geminiGate.acquire();
      const { result } = await tryGemini(prompt, geminiKey);
      if (result) return result;
      // No extra ad-hoc backoff on a 429 here — geminiGate already enforces
      // real spacing between every Gemini call globally (including the
      // very next article's attempt), which supersedes a local per-call
      // sleep.
    } else {
      debug(`skipping Gemini — no key`);
    }

    if (groqKey) {
      await groqGate.acquire();
      const { result } = await tryGroq(prompt, groqKey);
      if (result) return result;
    } else {
      debug(`skipping Groq — no key`);
    }

    await pollinationsGate.acquire();
    const { result } = await tryPollinations(prompt);
    if (result) return result;

    if (attempt < WATERFALL_RETRIES - 1) await sleep(1500 * (attempt + 1));
  }

  debug(`all tiers failed after ${WATERFALL_RETRIES} attempt(s)`);
  return null;
}

/**
 * Acquires a global concurrency slot (see llmGate above) before starting the
 * waterfall, and holds it for the whole attempt — including any rate-limit
 * backoff sleep — so at most GLOBAL_LLM_CONCURRENCY articles are ever
 * mid-summarization at once across the entire ingest run, regardless of how
 * many sources are running concurrently.
 */
async function generateJson(prompt: string): Promise<Record<string, unknown> | null> {
  await llmGate.acquire();
  try {
    return await generateJsonGated(prompt);
  } finally {
    llmGate.release();
  }
}

// Every upstream source that can feed `description` into this prompt is
// *supposed* to already be length-bounded (feedParser.ts slices RSS
// summaries to 500 chars, metadataExtractor.ts's bodyExcerpt caps at 600),
// except one: pipeline.ts's enrichValidated() also falls back to a page's
// raw OG/JSON-LD meta description with no cap of its own — by convention
// those are short (~150-300 chars), but that's a web-author convention, not
// something this codebase enforces. The Groq TPM pacing above assumes a
// bounded worst-case prompt size, so truncating here — the one true
// chokepoint every source funnels through — is what actually makes that
// assumption hold, rather than relying on every current and future source
// to independently remember to cap itself.
const MAX_PROMPT_TITLE_CHARS = 200;
const MAX_PROMPT_SOURCE_CHARS = 600;
// Caps completion size on both Gemini and Groq (see maxOutputTokens/
// max_tokens above) — without this, Groq's TPM budget (which counts
// prompt + completion together) has no hard ceiling on the completion side,
// even though a "4-5 sentence summary" instruction keeps it short in
// practice. 250 tokens is still generous headroom over a typical 100-180
// token summary, while keeping worst-case request size (prompt ~460 tokens
// + completion 250 = ~710) comfortably under groqGate's 7.5 req/min * 800
// token/request pacing budget — ~5,325 TPM worst case against a 6,000 TPM
// limit, ~11% margin.
const MAX_COMPLETION_TOKENS = 250;

function buildSummaryPrompt(title: string, description: string): string {
  const boundedTitle = title.slice(0, MAX_PROMPT_TITLE_CHARS);
  const boundedDescription = description.slice(0, MAX_PROMPT_SOURCE_CHARS);
  return `You are summarizing an AI industry news article for a news aggregator. Write a factual 4-5 sentence summary in your own words (do not just copy the input) based ONLY on the source text below — do not invent details, numbers, or claims that aren't in it. Capture what happened and why it matters to someone following AI news. Do not start with phrases like "This article discusses" or "The author explains", and do not repeat the title verbatim as a sentence.

Title: ${boundedTitle}
Source text: ${boundedDescription}

Respond with ONLY this JSON shape and nothing else: {"summary": "..."}`;
}

/**
 * Generates a real AI summary for an article via the free-tier waterfall.
 * Returns null (never throws) if every tier fails or no keys are configured
 * — callers should fall back to the RSS description, never block ingestion.
 */
export async function generateAiSummary(title: string, description: string): Promise<string | null> {
  if (!title && !description) return null;

  const result = await generateJson(buildSummaryPrompt(title, description));
  const summary = result?.summary;
  return typeof summary === "string" && summary.trim().length > 0 ? summary.trim() : null;
}
