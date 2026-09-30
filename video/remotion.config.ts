import { Config } from "@remotion/cli/config";

// Use the Chromium headless shell that ships with this environment instead of
// downloading one, and render WebGL (React Three Fiber) in software.
const HEADLESS_SHELL =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

if (process.env.REMOTION_BROWSER !== "download") {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER ?? HEADLESS_SHELL);
}
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(14);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
