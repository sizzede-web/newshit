import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { staticFile, useDelayRender } from "remotion";
import { FONTS } from "../brand";

const fontPromise = Promise.all([
  loadFont({
    family: FONTS.display,
    url: staticFile("fonts/inter-tight-latin-wght-normal.woff2"),
    weight: "100 900",
  }),
  loadFont({
    family: FONTS.serif,
    url: staticFile("fonts/instrument-serif-latin-400-italic.woff2"),
    style: "italic",
    weight: "400",
  }),
  loadFont({
    family: FONTS.serif,
    url: staticFile("fonts/instrument-serif-latin-400-normal.woff2"),
    style: "normal",
    weight: "400",
  }),
  loadFont({
    family: FONTS.mono,
    url: staticFile("fonts/geist-mono-latin-wght-normal.woff2"),
    weight: "100 900",
  }),
]);

/**
 * True once all brand fonts are usable. Gate <ThreeCanvas> on this so canvas
 * textures are drawn with the real typefaces before the first WebGL frame.
 * The render is held (delayRender) until the gated tree has committed.
 */
export const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("fonts for canvas textures"));
  useEffect(() => {
    let alive = true;
    fontPromise.then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, continueRender, handle]);
  return ready;
};
