// Single source of truth for timing. Both the picture (Remotion) and the
// synthesized soundtrack (scripts/soundtrack.ts) read from this file, so every
// cut, hit and whoosh lands on the same beat.

export const FPS = 60;
export const DURATION = 30; // seconds
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2 s

/** Scene windows in seconds (absolute). Overlaps are transitions. */
export const SCENES = {
  hook: { start: 0, end: 3.6 },
  world: { start: 3.35, end: 16.1 }, // reveal → designs → product line-up (one continuous 3D shot)
  check: { start: 15.75, end: 20.0 },
  process: { start: 19.45, end: 24.2 },
  ambassador: { start: 23.7, end: 27.05 },
  outro: { start: 26.95, end: 30.0 },
} as const;

/** Key moments inside scenes (absolute seconds). */
export const T = {
  hookWords: [0.5, 1.0, 2.0, 2.5],
  hookFlick: 1.62,
  iris: 3.0,
  drop: 4.0,
  taglineIn: 5.25,
  revealOut: 7.25,
  designSwaps: [8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5],
  designLines: [8.0, 9.0, 10.0, 11.0],
  lineupHead: 12.0,
  bagLand: 12.5,
  bowlLand: 13.0,
  sizes: 14.0,
  sizeBowls: [14.25, 14.5],
  whip: 15.75,
  fileDrop: 16.75,
  uploadDone: 17.25,
  checks: [17.5, 17.75, 18.0],
  click: 18.75,
  approved: 19.0,
  irisDark: 19.45,
  steps: [20.0, 20.5, 21.0, 21.5],
  stats: [22.0, 22.5, 23.0],
  sheet: 23.7,
  cards: [24.0, 24.25, 24.5],
  like: 25.5,
  breath: 26.75,
  motto: [27.0, 27.25, 27.75, 28.0],
  lockup: 28.5,
  cta: 29.0,
} as const;
