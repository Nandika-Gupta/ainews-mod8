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
 */

const GEMINI_MODEL = "gemini-flash-lite-latest";
const GROQ_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 20_000;
const WATERFALL_RETRIES = 2;

interface WaterfallResult {
  result: Record<string, unknown> | null;
  rateLimited: boolean;
}

const FAILED: WaterfallResult = { result: null, rateLimited: false };

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

/** Tier 1: Gemini free tier. Returns (result, rateLimited) — a 429 signals the caller to back off before falling through. */
async function tryGemini(prompt: string, apiKey: string): Promise<WaterfallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) return { result: null, rateLimited: true };
    if (!res.ok) return FAILED;

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return FAILED;
    return { result: safeParseJson(text), rateLimited: false };
  } catch {
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
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) return { result: null, rateLimited: true };
    if (!res.ok) return FAILED;

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string") return FAILED;
    return { result: safeParseJson(text), rateLimited: false };
  } catch {
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
    if (!res.ok) return FAILED;
    const text = await res.text();
    return { result: safeParseJson(text), rateLimited: false };
  } catch {
    return FAILED;
  }
}

/** Waterfall: Gemini -> Groq -> Pollinations, retried a couple of times with a short backoff between full passes. */
async function generateJson(prompt: string): Promise<Record<string, unknown> | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  for (let attempt = 0; attempt < WATERFALL_RETRIES; attempt++) {
    if (geminiKey) {
      const { result, rateLimited } = await tryGemini(prompt, geminiKey);
      if (result) return result;
      if (rateLimited) await sleep(4000); // matches GraphOne's brief Gemini free-tier backoff
    }

    if (groqKey) {
      const { result } = await tryGroq(prompt, groqKey);
      if (result) return result;
    }

    const { result } = await tryPollinations(prompt);
    if (result) return result;

    if (attempt < WATERFALL_RETRIES - 1) await sleep(1500 * (attempt + 1));
  }

  return null;
}

function buildSummaryPrompt(title: string, description: string): string {
  return `You are summarizing an AI industry news article for a news aggregator. Write a concise, factual 2-3 sentence summary in your own words (do not just copy the input) that captures what happened and why it matters to someone following AI news. Do not start with phrases like "This article discusses" or "The author explains".

Title: ${title}
Source description: ${description || "(no description provided)"}

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
