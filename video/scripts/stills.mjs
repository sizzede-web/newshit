// Renders review stills at given times (seconds): node scripts/stills.mjs 4.2 8.3 ...
// Bundles once, then renders each frame – much faster than repeated `remotion still`.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const HEADLESS =
  process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const outDir = process.env.STILLS_DIR ?? "stills";
mkdirSync(outDir, { recursive: true });

const times = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: join(process.cwd(), "src/index.ts") });
const common = {
  serveUrl,
  browserExecutable: HEADLESS,
  chromiumOptions: { gl: "swangle" },
};
const composition = await selectComposition({ ...common, id: process.env.COMP ?? "BrandloLaunch" });
for (const s of times) {
  const frame = Math.round(s * composition.fps);
  const output = join(outDir, `t${s.toFixed(2)}.png`);
  const t0 = Date.now();
  await renderStill({ ...common, composition, frame, output, scale: Number(process.env.SCALE ?? 0.5) });
  console.log(`${output}  (${Date.now() - t0} ms)`);
}
