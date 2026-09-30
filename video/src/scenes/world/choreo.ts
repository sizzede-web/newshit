// Choreography for the continuous 3D "world" shot (reveal → designs → line-up).
// Pure functions of time so the 2D overlays can project the same 3D points.

import * as THREE from "three";
import { Easing } from "remotion";
import { EASE, clamp, lerp, ramp } from "../../lib/ease";
import { HEIGHT, T, WIDTH } from "../../timeline";
import type { DesignId } from "../../three/designs";
import type { Vec3 } from "../../three/Products";

type Key = { t: number; v: number[]; ease?: (n: number) => number };

/** Multi-key vector track; `ease` on a key shapes the segment arriving at it. */
const track = (t: number, keys: Key[]): number[] => {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= b.t) {
      const p = (b.ease ?? EASE.smooth)(clamp((t - a.t) / (b.t - a.t)));
      return a.v.map((x, j) => lerp(x, b.v[j], p));
    }
  }
  return keys[keys.length - 1].v;
};

// ------------------------------------------------------------- camera ---

export type Cam = { pos: Vec3; target: Vec3; fov: number };

export const worldCamera = (t: number): Cam => {
  const v = track(t, [
    { t: 3.35, v: [0, 2.4, 14.6, 0, 1.55, 0] },
    { t: 4.0, v: [0, 2.4, 14.6, 0, 1.55, 0] },
    { t: 7.25, v: [0.8, 2.2, 13.2, 0, 1.6, 0], ease: EASE.soft },
    { t: 8.0, v: [0.5, 2.25, 11.0, -0.55, 1.85, 0], ease: EASE.inOut },
    { t: 11.5, v: [-0.3, 2.0, 10.3, -0.75, 1.8, 0], ease: (n) => n },
    { t: 12.15, v: [0, 2.7, 17.2, 0, 1.55, 0], ease: EASE.inOut },
    { t: 14.0, v: [0.35, 2.6, 16.7, 0.15, 1.55, 0], ease: (n) => n },
    { t: 14.6, v: [4.3, 2.5, 16.8, 4.3, 1.2, 0], ease: EASE.inOut },
    { t: 16.1, v: [4.6, 2.35, 16.0, 4.35, 1.2, 0], ease: (n) => n },
  ]);
  return { pos: [v[0], v[1], v[2]], target: [v[3], v[4], v[5]], fov: 28 };
};

const cam = new THREE.PerspectiveCamera(28, WIDTH / HEIGHT, 0.1, 200);
/** Projects a world point to composition pixels for time `t`. */
export const project = (t: number, p: Vec3) => {
  const c = worldCamera(t);
  cam.fov = c.fov;
  cam.position.set(...c.pos);
  cam.lookAt(...c.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(cam);
  return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT };
};

// ------------------------------------------------------------ designs ---

export const SWAP_ORDER: DesignId[] = [
  "nordlicht",
  "sonnenkorn",
  "amore",
  "kiez",
  "gruenzeug",
  "bergmann",
  "hafenblau",
  "brandlo",
];

const STEP = Math.PI / 4;
export const PRINT_DUR = 0.34;

/** Which designs are on the cup at time t and how far the print has run. */
export const cupPrint = (t: number) => {
  let from: DesignId = "brandlo";
  let to: DesignId = "brandlo";
  let fromK = -1;
  let toK = -1;
  let p = 1;
  T.designSwaps.forEach((ts, k) => {
    if (t >= ts) {
      from = k === 0 ? "brandlo" : SWAP_ORDER[k - 1];
      fromK = k - 1;
      to = SWAP_ORDER[k];
      toK = k;
      p = ramp(t, ts, PRINT_DUR, EASE.smooth);
    }
  });
  // logo of design k is centred where the cup faces the camera once swap k settles
  const uFor = (k: number) => 0.5 - ((k + 1) * STEP) / (Math.PI * 2);
  return { from: { id: from, u: uFor(fromK) }, to: { id: to, u: uFor(toK) }, p, index: toK };
};

// ---------------------------------------------------------------- cup ---

const bounce = (t: number, land: number, amp = 0.24) => {
  if (t < land) return 0;
  const d = t - land;
  return amp * Math.exp(-7 * d) * Math.abs(Math.sin((Math.PI * d) / 0.2));
};

const fall = (t: number, start: number, land: number, height: number) => {
  if (t >= land) return 0;
  return lerp(height, 0, Easing.in(Easing.quad)(clamp((t - start) / (land - start))));
};

export const cupState = (t: number) => {
  const y = fall(t, 3.35, T.drop, 7.8) + bounce(t, T.drop);
  const x = t < 11.5 ? lerp(0, -2.35, ramp(t, T.revealOut, 0.75, EASE.inOut)) : lerp(-2.35, -4.3, ramp(t, 11.5, 0.65, EASE.inOut));
  const spin = lerp(-Math.PI * 4, 0, ramp(t, 3.35, 2.3, EASE.out));
  const turns = T.designSwaps.reduce((acc, ts) => acc + STEP * ramp(t, ts - 0.04, 0.46, EASE.inOut), 0);
  const sway = 0.12 * Math.sin((t - 5) * 1.4) * ramp(t, 5, 1.5);
  const tiltX = lerp(0.32, 0, ramp(t, 3.35, 0.65, EASE.in));
  const wobble = t > T.drop ? 0.07 * Math.exp(-5 * (t - T.drop)) * Math.sin(22 * (t - T.drop)) : 0;
  const beatPunch = T.designSwaps.reduce((acc, ts) => acc + 0.035 * Math.exp(-9 * Math.max(0, t - ts)) * (t >= ts ? 1 : 0), 0);
  const scale = (1 + beatPunch) * (1 - ramp(t, T.sizes, 0.22, EASE.in));
  return {
    position: [x, y, 0] as Vec3,
    rotation: [tiltX, spin + turns + sway, wobble] as Vec3,
    scale,
  };
};

// ---------------------------------------------------------- line-up ---

export const LINEUP_X = { cup: -4.3, bag: 0, bowl: 4.3 } as const;
export const SIZE_X = { s: LINEUP_X.bowl - 3.7, m: LINEUP_X.bowl, l: LINEUP_X.bowl + 4.5 } as const;
export const SIZE_SCALE = { s: 0.85, m: 1.3, l: 1.7 } as const;

export const bagState = (t: number) => {
  const start = T.bagLand - 0.42;
  const y = fall(t, start, T.bagLand, 7.5) + bounce(t, T.bagLand, 0.2);
  const ry = lerp(1.1, -0.32, ramp(t, start, 0.9, EASE.out));
  const scale = t < start ? 0 : 1 - ramp(t, T.sizes + 0.03, 0.22, EASE.in);
  return { position: [LINEUP_X.bag, y, 0] as Vec3, rotation: [0, ry, 0] as Vec3, scale };
};

export const bowlState = (t: number) => {
  const start = T.bowlLand - 0.42;
  const y = fall(t, start, T.bowlLand, 7.5) + bounce(t, T.bowlLand, 0.2);
  const ry = lerp(-1.0, 0.2, ramp(t, start, 0.9, EASE.out)) + 0.15 * Math.sin(t * 0.8);
  return {
    position: [LINEUP_X.bowl, y, 0] as Vec3,
    rotation: [0, ry, 0] as Vec3,
    scale: t < start ? 0 : SIZE_SCALE.m,
  };
};

export const sizeBowlState = (t: number, which: "s" | "l") => {
  const start = which === "s" ? T.sizeBowls[0] : T.sizeBowls[1];
  const p = ramp(t, start, 0.55, EASE.back);
  return {
    position: [SIZE_X[which], 0, 0] as Vec3,
    rotation: [0, 0.25 + 0.15 * Math.sin(t * 0.8 + (which === "s" ? 1 : 2)), 0] as Vec3,
    scale: SIZE_SCALE[which] * p,
  };
};
