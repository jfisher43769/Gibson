// Writes the Gibson Cup geometry into the two drawing kits that cannot import it.
//
// scripts/promo/kit.js and the inline kit inside scripts/promo/render.mjs are read as
// TEXT and spliced into a headless page as a plain <script>, so `import` is not available
// to them. They therefore carry a generated copy of the path list. This script writes it;
// verify.js fails the build if either copy drifts from src/lib/cup.js.
//
// Run after any change to src/lib/cup.js:  node scripts/sync-cup.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cupPathsLiteral } from "../src/lib/cup.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CUP_MARKER = "const CUP_D=[";

// Replaces the generated line in place, leaving every other line of the kit alone.
function sync(relPath) {
  const file = join(HERE, relPath);
  const src = readFileSync(file, "utf8");
  const start = src.indexOf(CUP_MARKER);
  if (start === -1) throw new Error(`${relPath}: no "${CUP_MARKER}" line to replace`);
  const end = src.indexOf("\n", start);
  if (end === -1) throw new Error(`${relPath}: generated line is not terminated`);
  const next = src.slice(0, start) + cupPathsLiteral() + src.slice(end);
  if (next === src) return `${relPath}: already up to date`;
  writeFileSync(file, next);
  return `${relPath}: updated`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const p of ["promo/kit.js", "promo/render.mjs"]) console.log(sync(p));
}
