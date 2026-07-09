/**
 * Centralized source-key -> bundled logo filename mapping (files live in /public/logos).
 * PublisherIcon is the single component that resolves a source to its visual — every
 * place a logo appears (listing table, Popular Sources, Related News, article byline)
 * renders through it, so adding a key here makes the logo appear everywhere at once
 * instead of being wired up per-component.
 *
 * This map only needs the highest-quality tier: a hand-picked local SVG. Any source key
 * with NO entry here isn't missing a logo — PublisherIcon automatically fetches that
 * source's live favicon by domain at runtime (no setup needed, works out of the box on
 * Vercel), and only drops to the tinted generic icon if even the favicon fails to load.
 *
 * TODO — the following don't have a bundled SVG yet (none could be sourced within this
 * dev sandbox's network allowlist — only the npm registry and github.com are reachable
 * here, and none of the icon sets on npm cover traditional news publishers). They already
 * get a real logo in production via the live-favicon tier; add a line below only if you
 * want to pin a specific hand-picked SVG instead of relying on the favicon:
 *   - reuters       (Reuters)
 *   - theverge      (The Verge)
 *   - bloomberg     (Bloomberg)
 *   - mittr         (MIT Technology Review)
 *   - venturebeat   (VentureBeat)
 *   - theinfo       (The Information)
 *   - wired         (Wired)
 *   - nature        (Nature)
 *   - siliconangle  (SiliconANGLE)
 */
export const SOURCE_LOGOS: Record<string, string> = {
  openai: "openai.svg",
  anthropic: "anthropic.svg",
  google: "google.svg",
  meta: "meta.svg",
  nvidia: "nvidia.svg",
  microsoft: "microsoft.svg",
  huggingface: "huggingface.svg",
  mistralai: "mistralai.svg",
  perplexity: "perplexity.svg",
  techcrunch: "techcrunch.svg",
  arstechnica: "arstechnica.svg",
  theregister: "theregister.svg",
};
