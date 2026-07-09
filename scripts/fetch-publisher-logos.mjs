#!/usr/bin/env node
/**
 * Downloads a real logo/favicon for every source in data/news.ts that doesn't
 * already have a bundled SVG, saving it into public/logos/ and printing the
 * lines to paste into lib/data/sourceLogos.ts.
 *
 * This sandbox blocks every one of these hosts, so it can't run here — run it
 * yourself with `node scripts/fetch-publisher-logos.mjs` from the project root
 * on a machine with normal internet access. Requires Node 18+ (uses global fetch).
 *
 * For each source it tries, in order:
 *   1. https://{domain}/favicon.ico           (the site's own favicon — best fidelity)
 *   2. https://www.google.com/s2/favicons     (a broad-coverage aggregator fallback)
 * The first one that returns a real image gets saved.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = path.join(__dirname, "..", "public", "logos");

// Sources already covered by a hand-picked bundled SVG (see lib/data/sourceLogos.ts) — skip these.
const ALREADY_BUNDLED = new Set([
  "openai", "anthropic", "google", "meta", "nvidia", "microsoft",
  "huggingface", "mistralai", "perplexity", "techcrunch", "arstechnica", "theregister",
]);

// key -> domain, mirrors SOURCES in data/news.ts
const SOURCES = {
  reuters: "reuters.com",
  theverge: "theverge.com",
  bloomberg: "bloomberg.com",
  mittr: "technologyreview.com",
  venturebeat: "venturebeat.com",
  theinfo: "theinformation.com",
  wired: "wired.com",
  nature: "nature.com",
  siliconangle: "siliconangle.com",
};

async function fetchImage(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) return null; // reject empty/near-empty placeholder responses
  const ext = contentType.includes("svg") ? "svg" : contentType.includes("png") ? "png" : contentType.includes("ico") ? "ico" : "png";
  return { buf, ext };
}

async function run() {
  await mkdir(LOGOS_DIR, { recursive: true });
  const results = [];

  for (const [key, domain] of Object.entries(SOURCES)) {
    if (ALREADY_BUNDLED.has(key)) continue;

    let image = null;
    try {
      image = await fetchImage(`https://${domain}/favicon.ico`);
    } catch {
      // network error — fall through to aggregator
    }
    if (!image) {
      try {
        image = await fetchImage(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      } catch {
        // both failed — leave this source on the live-fetch fallback in PublisherIcon
      }
    }

    if (image) {
      const filename = `${key}.${image.ext}`;
      await writeFile(path.join(LOGOS_DIR, filename), image.buf);
      results.push({ key, filename, status: "saved" });
      console.log(`✓ ${key} -> public/logos/${filename}`);
    } else {
      results.push({ key, status: "failed" });
      console.log(`✗ ${key} — could not fetch a usable image, leaving it on the runtime favicon fallback`);
    }
  }

  const saved = results.filter((r) => r.status === "saved");
  if (saved.length) {
    console.log("\nAdd these lines to lib/data/sourceLogos.ts:\n");
    for (const r of saved) console.log(`  ${r.key}: "${r.filename}",`);
  }
  console.log(`\nDone: ${saved.length}/${results.length} logos downloaded.`);
}

run();
