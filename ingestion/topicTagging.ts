/**
 * Lightweight keyword-based topic tagging. This is a deliberate, honest
 * stand-in for real NLP/LLM tagging — it matches known AI entity/topic
 * keywords against the title+summary and returns whichever match, falling
 * back to a generic "AI" tag. No model call, no chunking, just a
 * word-boundary regex — appropriate for a feed pipeline that shouldn't need
 * an LLM to know an article mentions "OpenAI".
 */
const KNOWN_TOPICS: { label: string; pattern: RegExp }[] = [
  { label: "OpenAI", pattern: /\bopenai\b/i },
  { label: "Anthropic", pattern: /\banthropic|claude\b/i },
  { label: "Google DeepMind", pattern: /\bgoogle deepmind|deepmind|gemini\b/i },
  { label: "Meta AI", pattern: /\bmeta ai|llama\b/i },
  { label: "Microsoft", pattern: /\bmicrosoft|copilot\b/i },
  { label: "NVIDIA", pattern: /\bnvidia\b/i },
  { label: "Mistral AI", pattern: /\bmistral\b/i },
  { label: "Hugging Face", pattern: /\bhugging face\b/i },
  { label: "Perplexity", pattern: /\bperplexity\b/i },
  { label: "AI Regulation", pattern: /\bregulation|ai act|policy\b/i },
  { label: "Funding", pattern: /\bfunding|raises|valuation|series [a-e]\b/i },
  { label: "Robotics", pattern: /\brobot|robotics|humanoid\b/i },
  { label: "Open Source", pattern: /\bopen[- ]source|open[- ]weight\b/i },
  { label: "Model Release", pattern: /\bmodel|release|launch/i },
];

export function deriveTopics(title: string, summary: string): string[] {
  const text = `${title} ${summary}`;
  const matched = KNOWN_TOPICS.filter((t) => t.pattern.test(text)).map((t) => t.label);
  return matched.length > 0 ? matched.slice(0, 4) : ["AI"];
}

const AI_RELEVANCE_RE =
  /\b(ai|a\.i\.|llm|llms|gpt|chatgpt|claude|gemini|deepseek|openai|anthropic|machine learning|generative ai|artificial intelligence|neural network|transformer|robotics|fine-tuning|inference|vllm|hugging face)\b/i;

/** Matches GraphOne's ai_regex gatekeeper concept — used to filter a publisher's general feed down to AI-relevant items. */
export function isAiRelevant(title: string, summary: string): boolean {
  return AI_RELEVANCE_RE.test(`${title} ${summary}`);
}
