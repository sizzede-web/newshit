// Copies the self-hosted font files from @fontsource into public/fonts so the
// composition can load them via staticFile() (no network needed at render time).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "fonts");
mkdirSync(out, { recursive: true });

const files = [
  ["@fontsource-variable/inter-tight", "inter-tight-latin-wght-normal.woff2"],
  ["@fontsource-variable/inter-tight", "inter-tight-latin-ext-wght-normal.woff2"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-400-italic.woff2"],
  ["@fontsource/instrument-serif", "instrument-serif-latin-400-normal.woff2"],
  ["@fontsource-variable/geist-mono", "geist-mono-latin-wght-normal.woff2"],
];

for (const [pkg, file] of files) {
  copyFileSync(join(root, "node_modules", pkg, "files", file), join(out, file));
  console.log("copied", file);
}
