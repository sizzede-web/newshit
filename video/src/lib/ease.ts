import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../timeline";

export const EASE = {
  /** Snappy expo-style out – the default for anything entering. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Heavy in-out for camera moves and big transitions. */
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  /** Smooth in-out for secondary motion. */
  smooth: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
} as const;

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Eased 0→1 progress of `t` over [start, start + dur]. */
export const ramp = (t: number, start: number, dur: number, ease: (n: number) => number = EASE.out) =>
  interpolate(t, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/** Piecewise interpolation with clamping, in seconds. */
export const keys = (
  t: number,
  times: number[],
  values: number[],
  ease: (n: number) => number = EASE.smooth,
) =>
  interpolate(t, times, values, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/** Physical spring starting at `start` seconds (0 before). */
export const springAt = (
  t: number,
  start: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) => {
  if (t < start) return 0;
  return spring({
    frame: (t - start) * FPS,
    fps: FPS,
    config: { damping: 14, stiffness: 160, mass: 1, ...config },
  });
};

/** Deterministic pseudo random in [0, 1). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
