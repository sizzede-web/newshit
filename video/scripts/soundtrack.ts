// Procedural soundtrack + sound design for the Brandlo launch film.
//
// Everything is synthesized from scratch (no samples, no licences) and every
// hit is placed from the same timeline the picture uses (src/timeline.ts).
//
//   node scripts/soundtrack.ts   →  public/audio/soundtrack.wav (48 kHz, 16-bit, stereo)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BEAT, DURATION, T } from "../src/timeline.ts";

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const TAU = Math.PI * 2;

type Bus = { l: Float32Array; r: Float32Array };
const bus = (): Bus => ({ l: new Float32Array(N), r: new Float32Array(N) });

const master = bus(); // dry, not side-chained (drums, fx)
const music = bus(); // side-chained by the kick (bass, pads, plucks)
const verb = bus(); // reverb send
const echo = bus(); // ping-pong delay send

// ------------------------------------------------------------ helpers ---

let seed = 1337;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** Writes a mono voice `fn(i, t)` into a bus from `start` for `dur` seconds. */
const voice = (
  target: Bus,
  start: number,
  dur: number,
  fn: (t: number) => number,
  opts: { gain?: number; pan?: number | ((t: number) => number); verb?: number; echo?: number } = {},
) => {
  const g = opts.gain ?? 1;
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor((start + dur) * SR));
  for (let i = s0; i < s1; i++) {
    const t = i / SR - start;
    const v = fn(t) * g;
    const p = typeof opts.pan === "function" ? opts.pan(t) : (opts.pan ?? 0);
    const gl = Math.cos(((p + 1) * Math.PI) / 4);
    const gr = Math.sin(((p + 1) * Math.PI) / 4);
    target.l[i] += v * gl;
    target.r[i] += v * gr;
    if (opts.verb) {
      verb.l[i] += v * gl * opts.verb;
      verb.r[i] += v * gr * opts.verb;
    }
    if (opts.echo) {
      echo.l[i] += v * gl * opts.echo;
      echo.r[i] += v * gr * opts.echo;
    }
  }
};

/** Stateful RBJ biquad; call `set` whenever the cutoff moves. */
class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  type: "lp" | "hp" | "bp";
  constructor(type: "lp" | "hp" | "bp", f: number, q = 0.707) {
    this.type = type;
    this.set(f, q);
  }
  set(f: number, q = 0.707) {
    const w = (TAU * clamp(f, 20, SR * 0.45)) / SR;
    const cw = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    let b0: number;
    let b1: number;
    let b2: number;
    if (this.type === "lp") {
      b0 = (1 - cw) / 2;
      b1 = 1 - cw;
      b2 = (1 - cw) / 2;
    } else if (this.type === "hp") {
      b0 = (1 + cw) / 2;
      b1 = -(1 + cw);
      b2 = (1 + cw) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cw) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Band-limited saw (polyBLEP). */
const makeSaw = (freq: number, phase0 = 0) => {
  let ph = phase0;
  const inc = freq / SR;
  return () => {
    ph += inc;
    if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < inc) {
      const x = ph / inc;
      v -= x + x - x * x - 1;
    } else if (ph > 1 - inc) {
      const x = (ph - 1) / inc;
      v -= x * x + x + x + 1;
    }
    return v;
  };
};

const env = (t: number, a: number, d: number) => (t < a ? t / a : Math.exp(-(t - a) / d));
const adsr = (t: number, dur: number, a: number, r: number) =>
  t < a ? t / a : t < dur ? 1 : Math.max(0, 1 - (t - dur) / r);

// --------------------------------------------------------- instruments ---

const kicks: number[] = [];

const kick = (at: number, amp = 1) => {
  kicks.push(at);
  let ph = 0;
  voice(master, at, 0.6, (t) => {
    const f = 46 + 130 * Math.exp(-t / 0.03);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * Math.exp(-t / 0.28);
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.5 : 0;
    return Math.tanh((body + click) * 1.8) * 0.9;
  }, { gain: amp });
};

const clap = (at: number, amp = 1) => {
  const bp = new Biquad("bp", 1300, 0.9);
  const hp = new Biquad("hp", 600);
  voice(master, at, 0.4, (t) => {
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.008) : 0), 0);
    const tail = t > 0.022 ? Math.exp(-(t - 0.022) / 0.11) : 0;
    return hp.run(bp.run(noise() * (bursts * 0.6 + tail))) * 1.6;
  }, { gain: amp * 0.55, verb: 0.35 });
};

const hat = (at: number, open = false, amp = 1, pan = 0.25) => {
  const hp = new Biquad("hp", 7500, 0.8);
  voice(master, at, open ? 0.3 : 0.08, (t) => hp.run(noise()) * Math.exp(-t / (open ? 0.09 : 0.022)), {
    gain: amp * (open ? 0.2 : 0.13),
    pan,
  });
};

const bassNote = (at: number, dur: number, note: number, amp = 1) => {
  const saw = makeSaw(midi(note));
  const lp = new Biquad("lp", 300, 1.1);
  voice(music, at, dur + 0.06, (t) => {
    lp.set(180 + 650 * Math.exp(-t / 0.09), 1.1);
    const sub = Math.sin(TAU * midi(note) * t);
    return (lp.run(saw()) * 0.6 + sub * 0.6) * adsr(t, dur, 0.004, 0.05);
  }, { gain: amp * 0.34 });
};

const pad = (at: number, dur: number, notes: number[], amp = 1, cutoff = 1500) => {
  notes.forEach((n, k) => {
    [-0.09, 0, 0.1].forEach((det, j) => {
      const saw = makeSaw(midi(n + det), (k * 0.37 + j * 0.21) % 1);
      const lp = new Biquad("lp", cutoff, 0.7);
      voice(music, at, dur + 0.8, (t) => lp.run(saw()) * adsr(t, dur, 0.35, 0.7), {
        gain: amp * 0.05,
        pan: (j - 1) * 0.6 + (k % 2 ? 0.12 : -0.12),
        verb: 0.4,
      });
    });
  });
};

const pluck = (at: number, note: number, amp = 1, pan = 0) => {
  const saw = makeSaw(midi(note));
  const saw2 = makeSaw(midi(note + 0.06));
  const lp = new Biquad("lp", 3000, 1.4);
  voice(music, at, 0.45, (t) => {
    lp.set(420 + 4200 * Math.exp(-t / 0.05), 1.4);
    return lp.run((saw() + saw2()) * 0.5) * Math.exp(-t / 0.16);
  }, { gain: amp * 0.16, pan, verb: 0.25, echo: 0.3 });
};

const bell = (at: number, note: number, amp = 1, pan = 0, decay = 0.6) => {
  const f = midi(note);
  voice(master, at, decay * 4, (t) => {
    const mod = Math.sin(TAU * f * 3.5 * t) * 1.2 * Math.exp(-t / 0.15);
    return Math.sin(TAU * f * t + mod) * env(t, 0.002, decay);
  }, { gain: amp * 0.16, pan, verb: 0.5 });
};

const impact = (at: number, amp = 1) => {
  let ph = 0;
  const lp = new Biquad("lp", 2500);
  voice(master, at, 2.4, (t) => {
    const f = 30 + 55 * Math.exp(-t / 0.08);
    ph += f / SR;
    const boom = Math.sin(TAU * ph) * Math.exp(-t / 0.7);
    lp.set(300 + 5000 * Math.exp(-t / 0.05));
    const crack = lp.run(noise()) * Math.exp(-t / 0.18) * 0.5;
    return Math.tanh((boom * 1.1 + crack) * 1.4);
  }, { gain: amp * 0.8, verb: 0.3 });
  // wide crash
  const hp = new Biquad("hp", 4000);
  voice(master, at, 2.2, (t) => hp.run(noise()) * Math.exp(-t / 0.6), { gain: amp * 0.1, pan: 0.4, verb: 0.4 });
  const hp2 = new Biquad("hp", 4200);
  voice(master, at, 2.2, (t) => hp2.run(noise()) * Math.exp(-t / 0.6), { gain: amp * 0.1, pan: -0.4, verb: 0.4 });
};

const riser = (from: number, to: number, amp = 1) => {
  const bp = new Biquad("bp", 400, 2.5);
  const dur = to - from;
  let ph = 0;
  voice(master, from, dur, (t) => {
    const p = t / dur;
    bp.set(300 * Math.pow(30, p), 2.5);
    ph += (200 + 1400 * p * p) / SR;
    return (bp.run(noise()) * 1.4 + Math.sin(TAU * ph) * 0.12) * p * p;
  }, { gain: amp * 0.35, pan: (t) => Math.sin(t * 9) * 0.3, verb: 0.3 });
};

const whoosh = (at: number, dur: number, amp = 1, dir = 1, up = true) => {
  const bp = new Biquad("bp", 600, 1.2);
  voice(master, at, dur, (t) => {
    const p = t / dur;
    const f = up ? 250 * Math.pow(24, p) : 6000 * Math.pow(1 / 24, p);
    bp.set(f, 1.2);
    return bp.run(noise()) * Math.pow(Math.sin(Math.PI * p), 1.5) * 1.8;
  }, { gain: amp * 0.45, pan: (t) => dir * (2 * (t / dur) - 1) * 0.8, verb: 0.2 });
};

const click = (at: number, amp = 1, freq = 2400) => {
  const hp = new Biquad("hp", 1500);
  voice(master, at, 0.05, (t) => (Math.sin(TAU * freq * t) * 0.6 + hp.run(noise()) * 0.4) * Math.exp(-t / 0.006), { gain: amp * 0.35 });
};

const pop = (at: number, amp = 1, hi = 900) => {
  let ph = 0;
  voice(master, at, 0.18, (t) => {
    ph += (hi * 0.35 + hi * Math.exp(-t / 0.03)) / SR;
    return Math.sin(TAU * ph) * Math.exp(-t / 0.05);
  }, { gain: amp * 0.35, verb: 0.2 });
};

const thud = (at: number, amp = 1) => {
  let ph = 0;
  const lp = new Biquad("lp", 900);
  voice(master, at, 0.4, (t) => {
    ph += (60 + 90 * Math.exp(-t / 0.02)) / SR;
    return Math.tanh(Math.sin(TAU * ph) * Math.exp(-t / 0.12) * 1.5 + lp.run(noise()) * Math.exp(-t / 0.02) * 0.4);
  }, { gain: amp * 0.55 });
};

const zip = (at: number, amp = 1) => {
  // "print head" sweep: bright, fast, downward
  const bp = new Biquad("bp", 5000, 3);
  voice(master, at, 0.34, (t) => {
    const p = t / 0.34;
    bp.set(7000 * Math.pow(0.12, p), 3);
    return bp.run(noise()) * Math.sin(Math.PI * p) * 2.2;
  }, { gain: amp * 0.25, pan: (t) => 0.5 - t * 2.5, verb: 0.15 });
};

const tickRoll = (at: number, dur: number, amp = 1) => {
  // odometer ticks slowing down
  let t = 0;
  let k = 0;
  while (t < dur) {
    click(at + t, amp * (1 - t / dur) * 0.5, 3200 + (k % 2) * 400);
    t += 0.025 + 0.12 * Math.pow(t / dur, 2);
    k++;
  }
};

const reverseSwell = (to: number, dur: number, amp = 1) => {
  const hp = new Biquad("hp", 2500);
  voice(master, to - dur, dur, (t) => hp.run(noise()) * Math.pow(t / dur, 3), { gain: amp * 0.3, verb: 0.5 });
};

// ----------------------------------------------------------- harmony ---

// A-minor loop (vi–IV–I–V in C): Am7 · Fmaj7 · Cmaj7 · Gadd9
const CHORDS = [
  { root: 45, notes: [57, 60, 64, 67] }, // Am7
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 48, notes: [55, 60, 64, 71] }, // Cmaj7
  { root: 43, notes: [55, 59, 62, 69] }, // Gadd9
];
const BAR = BEAT * 4;
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR) % 4];

type Section = { from: number; to: number; drums: "full" | "half" | "none"; plucks: "16th" | "8th" | "none"; bass: boolean };
const SECTIONS: Section[] = [
  { from: 0, to: 4, drums: "none", plucks: "none", bass: false },
  { from: 4, to: 8, drums: "full", plucks: "8th", bass: true },
  { from: 8, to: 11.5, drums: "full", plucks: "16th", bass: true },
  { from: 11.5, to: 12, drums: "none", plucks: "16th", bass: false },
  { from: 12, to: 15.5, drums: "full", plucks: "8th", bass: true },
  { from: 16, to: 19.25, drums: "half", plucks: "8th", bass: true },
  { from: 20, to: 26.5, drums: "full", plucks: "16th", bass: true },
];

// ------------------------------------------------------------- score ---

// Pads under everything except the breath before the outro.
for (let bar = 0; bar < 14; bar++) {
  const at = bar * BAR;
  if (at >= 26.5) break;
  const c = CHORDS[bar % 4];
  const dur = Math.min(BAR, 26.6 - at);
  pad(at, dur, c.notes, bar < 2 ? 0.8 : 1, bar < 2 ? 700 + bar * 500 : 1600);
}

for (const s of SECTIONS) {
  for (let t = s.from; t < s.to - 1e-6; t += BEAT) {
    const beatIdx = Math.round(t / BEAT);
    const c = chordAt(t);
    if (s.drums === "full") {
      kick(t);
      if (beatIdx % 2 === 1) clap(t);
      hat(t + BEAT / 2, true, 1, 0.3);
      hat(t + BEAT / 4, false, 0.6, -0.3);
      hat(t + (3 * BEAT) / 4, false, 0.6, -0.3);
    } else if (s.drums === "half") {
      if (beatIdx % 2 === 0) kick(t, 0.9);
      hat(t + BEAT / 2, false, 0.9, 0.3);
    }
    if (s.bass) {
      bassNote(t, BEAT * 0.45, c.root - 12, 1);
      bassNote(t + BEAT / 2, BEAT * 0.4, c.root + 12, 0.7);
    }
    if (s.plucks !== "none") {
      const steps = s.plucks === "16th" ? 4 : 2;
      const pattern = [0, 2, 1, 3, 2, 1, 3, 0];
      for (let k = 0; k < steps; k++) {
        const at = t + (k * BEAT) / steps;
        const idx = pattern[(beatIdx * steps + k) % pattern.length];
        pluck(at, c.notes[idx] + 12, k === 0 ? 1 : 0.7, (idx - 1.5) * 0.3);
      }
    }
  }
}

// Clap roll into the design section.
for (let k = 0; k < 8; k++) clap(7.5 + (k * BEAT) / 8, 0.25 + k * 0.08);

// ------------------------------------------------------ sound design ---

// Hook
pop(0.08, 0.6, 1400);
T.hookWords.forEach((w, i) => {
  thud(w, 0.9);
  bell(w, [69, 72, 76, 79][i], 0.5, (i - 1.5) * 0.3, 0.5);
});
whoosh(T.hookFlick - 0.05, 0.4, 0.7, 1, true);
riser(2.1, T.iris + 0.42, 0.9);
whoosh(T.iris, 0.45, 0.9, -1, true);
whoosh(3.42, 0.6, 0.7, 1, false);
reverseSwell(T.drop, 0.6, 0.8);

// Drop + reveal
impact(T.drop, 1.1);
whoosh(T.revealOut - 0.1, 0.6, 0.6, 1, true);
bell(T.taglineIn, 76, 0.4, 0.2, 0.8);

// Design swaps (print head)
T.designSwaps.forEach((ts, i) => {
  zip(ts, 1);
  click(ts, 0.5, 1800 + i * 150);
});

// Line-up
whoosh(11.45, 0.6, 0.7, -1, true);
kick(12, 0.9);
thud(T.bagLand, 1);
thud(T.bowlLand, 1);
pop(T.sizes, 0.6, 700);
pop(T.sizes + 0.03, 0.5, 600);
pop(T.sizeBowls[0], 0.7, 1100);
pop(T.sizeBowls[1], 0.7, 800);
riser(14.9, T.whip, 0.5);

// Whip into the Design-Check
whoosh(T.whip - 0.05, 0.4, 1.1, -1, true);
click(16.2, 0.5, 1600);
thud(T.fileDrop, 0.6);
click(T.fileDrop, 0.6, 1400);
bell(T.uploadDone, 84, 0.45, 0.2, 0.4);
T.checks.forEach((c, i) => bell(c, [76, 79, 84][i], 0.5, 0.3, 0.35));
bell(17.25, 72, 0.25, -0.2, 0.6);
click(T.click, 1.1, 2200);
click(T.click + 0.07, 0.6, 1700);
bell(T.approved, 79, 0.6, -0.1, 0.9);
bell(T.approved + 0.08, 84, 0.6, 0.1, 0.9);
bell(T.approved + 0.16, 88, 0.45, 0.2, 1.1);
riser(18.9, T.irisDark + 0.5, 0.9);
whoosh(T.irisDark, 0.55, 0.9, 1, true);

// Process
impact(20, 0.9);
T.steps.forEach((s, i) => bell(s, [69, 72, 76, 81][i], 0.55, -0.45 + i * 0.3, 0.45));
T.stats.forEach((s) => {
  thud(s, 0.5);
  tickRoll(s, 0.8, 0.8);
});

// Sheet + cards
whoosh(T.sheet - 0.05, 0.55, 0.8, 1, true);
T.cards.forEach((c, i) => whoosh(c - 0.05, 0.35, 0.5, i % 2 ? 1 : -1, true));
pop(T.like, 1, 1000);
for (let k = 0; k < 6; k++) bell(T.like + 0.05 + k * 0.09, 84 + [0, 3, 7, 12, 15, 19][k], 0.18, (k % 2 ? 1 : -1) * 0.5, 0.25);

// Breath → motto → lock-up
reverseSwell(T.motto[0], 0.35, 0.8);
const MOTTO_NOTES = [67, 71, 74, 76];
T.motto.forEach((m, i) => {
  thud(m, 0.55);
  pluck(m, MOTTO_NOTES[i], 1.4, (i - 1.5) * 0.3);
  pluck(m, MOTTO_NOTES[i] - 12, 1.0, 0);
});
pad(27, 1.5, [55, 59, 62, 69], 0.8, 1000);
bassNote(27, 1.4, 31, 0.8);
riser(27.6, T.lockup, 0.8);
impact(T.lockup, 1.2);
pad(T.lockup, 1.3, [48, 55, 60, 64, 71, 74], 1.3, 2200);
bassNote(T.lockup, 1.2, 36, 1);
bell(T.lockup, 84, 0.6, 0, 1.2);
bell(T.lockup + 0.12, 91, 0.35, 0.3, 1.2);
bell(T.cta, 88, 0.35, -0.3, 0.8);
click(T.cta, 0.5, 2000);

// ------------------------------------------------------------- mixing ---

// Kick side-chain on the music bus.
const duck = new Float32Array(N).fill(1);
for (const k of kicks) {
  const s0 = Math.floor(k * SR);
  for (let i = s0; i < Math.min(N, s0 + SR * 0.4); i++) {
    const t = (i - s0) / SR;
    const g = 1 - 0.75 * Math.exp(-t / 0.09);
    duck[i] = Math.min(duck[i], g);
  }
}

// Ping-pong delay (dotted eighth).
const delayed = bus();
{
  const d = Math.floor(BEAT * 0.75 * SR);
  const fb = 0.38;
  for (let i = d; i < N; i++) {
    delayed.l[i] = echo.l[i - d] + fb * delayed.r[i - d];
    delayed.r[i] = echo.r[i - d] + fb * delayed.l[i - d];
  }
}

// Freeverb-style reverb on the send bus.
const reverb = (input: Float32Array, spread: number) => {
  const out = new Float32Array(N);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((c) => Math.floor(((c + spread) * SR) / 44100));
  const aps = [556, 441, 341, 225].map((a) => Math.floor(((a + spread) * SR) / 44100));
  const room = 0.86;
  const damp = 0.3;
  for (const len of combs) {
    const buf = new Float32Array(len);
    let idx = 0;
    let store = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      store = y * (1 - damp) + store * damp;
      buf[idx] = input[i] * 0.015 + store * room;
      idx = (idx + 1) % len;
      out[i] += y;
    }
  }
  for (const len of aps) {
    const buf = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const x = out[i];
      buf[idx] = x + b * 0.5;
      out[i] = b - x;
      idx = (idx + 1) % len;
    }
  }
  return out;
};
const verbL = reverb(verb.l, 0);
const verbR = reverb(verb.r, 23);

const L = new Float32Array(N);
const R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = master.l[i] + music.l[i] * duck[i] + delayed.l[i] * 0.5 * duck[i] + verbL[i] * 1.0;
  R[i] = master.r[i] + music.r[i] * duck[i] + delayed.r[i] * 0.5 * duck[i] + verbR[i] * 1.0;
}

// Tail fade over the last 0.4 s so the file ends cleanly.
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = t > DURATION - 0.4 ? Math.max(0, (DURATION - t) / 0.4) : 1;
  L[i] *= g;
  R[i] *= g;
}

// Glue: soft-knee compression + saturating limiter, normalised to -1 dBFS.
let envF = 0;
for (let i = 0; i < N; i++) {
  const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  envF = x > envF ? envF + (x - envF) * 0.01 : envF + (x - envF) * 0.0002;
  const over = Math.max(0, envF - 0.5);
  const g = 1 / (1 + over * 1.2);
  L[i] = Math.tanh(L[i] * g * 0.9);
  R[i] = Math.tanh(R[i] * g * 0.9);
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.89 / peak;

// ---------------------------------------------------------------- WAV ---

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), i * 4);
  data.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public", "audio", "soundtrack.wav");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.concat([header, data]));
console.log(`wrote ${outPath} (${DURATION}s, peak ${(20 * Math.log10(peak)).toFixed(1)} dB pre-normalise)`);
