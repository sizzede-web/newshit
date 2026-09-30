// Renders the transparent product "photos" used by the 2D scenes into public/shots/.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const HEADLESS =
  process.env.REMOTION_BROWSER ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const ids = ["shot-cup-brandlo", "shot-cup-kiez", "shot-bag", "shot-bowl"];
const out = join(process.cwd(), "public", "shots");
mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: join(process.cwd(), "src/index.ts") });
const common = { serveUrl, browserExecutable: HEADLESS, chromiumOptions: { gl: "swangle" } };
for (const id of ids) {
  const composition = await selectComposition({ ...common, id });
  const output = join(out, `${id.replace("shot-", "")}.png`);
  await renderStill({ ...common, composition, output, imageFormat: "png" });
  console.log("rendered", output);
}
