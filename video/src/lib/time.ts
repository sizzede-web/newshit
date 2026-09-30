import { useCurrentFrame, useVideoConfig } from "remotion";

/** Absolute composition time in seconds (scenes never re-base time). */
export const useTime = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};
