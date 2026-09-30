// Print designs rendered onto <canvas> and wrapped around the 3D products.
// Every design is fictional sample artwork ("so könnte dein Becher aussehen").

import { COLORS, FONTS } from "../brand";
import { rand } from "../lib/ease";

export const TEX_W = 2176; // ≈ circumference : height of the cup (keeps type undistorted)
export const TEX_H = 1024;

export type DesignId =
  | "blank"
  | "brandlo"
  | "nordlicht"
  | "sonnenkorn"
  | "amore"
  | "kiez"
  | "gruenzeug"
  | "bergmann"
  | "hafenblau";

export type Design = {
  id: DesignId;
  name: string;
  kind: string;
  lid: string;
  /** Background colour of the stage while this design is on the cup. */
  stage: string;
  /** Headline colour that reads on `stage`. */
  ink: string;
  draw: (ctx: CanvasRenderingContext2D, cx: number) => void;
};

const font = (weight: number, size: number, family: string = FONTS.display, style = "normal") =>
  `${style} ${weight} ${size}px "${family}"`;

/** Draws `fn` centred at cx and again one texture-width left/right so it wraps seamlessly. */
const wrapped = (ctx: CanvasRenderingContext2D, cx: number, fn: (x: number) => void) => {
  for (const off of [-TEX_W, 0, TEX_W]) {
    ctx.save();
    fn(cx + off);
    ctx.restore();
  }
};

const text = (
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  f: string,
  color: string,
  spacing = 0,
) => {
  ctx.font = f;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(str, x, y);
  ctx.letterSpacing = "0px";
};

/** The brandlo wordmark: "brandl" + an accent ring as the "o" (a cup seen from above). */
export const drawWordmark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  size: number,
  color: string,
  accent: string,
) => {
  ctx.font = font(800, size);
  ctx.letterSpacing = `${-size * 0.045}px`;
  const w = ctx.measureText("brandl").width;
  const xh = size * 0.54;
  const ringR = xh * 0.5;
  const gap = size * 0.02;
  const total = w + gap + ringR * 2;
  const left = x - total / 2;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("brandl", left, baseline);
  ctx.letterSpacing = "0px";
  const cx = left + w + gap + ringR;
  const cy = baseline - ringR;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.arc(cx, cy, ringR * 0.52, 0, Math.PI * 2, true);
  ctx.fillStyle = accent;
  ctx.fill("evenodd");
};

export const DESIGNS: Record<DesignId, Design> = {
  blank: {
    id: "blank",
    name: "Blanko",
    kind: "",
    lid: "#F6F4F0",
    stage: COLORS.paper,
    ink: COLORS.ink,
    draw: (ctx) => {
      ctx.fillStyle = "#FBFAF7";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
    },
  },
  brandlo: {
    id: "brandlo",
    name: "brandlo",
    kind: "Kaffeebecher · 12 oz",
    lid: "#F7F5F1",
    stage: COLORS.accent,
    ink: COLORS.white,
    draw: (ctx, cx) => {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      // accent foot band + hairline
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(0, TEX_H * 0.84, TEX_W, TEX_H * 0.16);
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(0, TEX_H * 0.815, TEX_W, 6);
      wrapped(ctx, cx, (x) => {
        drawWordmark(ctx, x, TEX_H * 0.53, 210, COLORS.ink, COLORS.accent);
        text(ctx, "BECHER MIT DEINEM LOGO", x, TEX_H * 0.64, font(500, 34, FONTS.mono), COLORS.mutedDark, 10);
      });
      // small repeat marks around the back
      wrapped(ctx, cx + TEX_W / 2, (x) => {
        text(ctx, "Macht mal.", x, TEX_H * 0.5, font(400, 120, FONTS.serif, "italic"), COLORS.ink);
      });
    },
  },
  nordlicht: {
    id: "nordlicht",
    name: "Café Nordlicht",
    kind: "Coffee-to-go · 12 oz",
    lid: "#141414",
    stage: "#0E1830",
    ink: "#F6F1E4",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#13203D";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.save();
      ctx.filter = "blur(26px)";
      const bands = ["#2EC4B6", "#7BDFF2", "#9B5DE5"];
      bands.forEach((c, i) => {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = c;
        ctx.lineWidth = 70 - i * 14;
        ctx.beginPath();
        for (let x = -40; x <= TEX_W + 40; x += 16) {
          const y = TEX_H * (0.24 + i * 0.07) + Math.sin((x / TEX_W) * Math.PI * 6 + i) * 46;
          if (x === -40) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + rand(i) * 0.6})`;
        ctx.beginPath();
        ctx.arc(rand(i + 3) * TEX_W, rand(i + 9) * TEX_H * 0.5, 1.5 + rand(i + 5) * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      wrapped(ctx, cx, (x) => {
        text(ctx, "CAFÉ", x, TEX_H * 0.45, font(500, 40, FONTS.mono), "#9FE7E0", 18);
        text(ctx, "Nordlicht", x, TEX_H * 0.66, font(400, 230, FONTS.serif, "italic"), "#F6F1E4");
        text(ctx, "KAFFEE & KUCHEN", x, TEX_H * 0.77, font(500, 32, FONTS.mono), "#9FB3D9", 12);
      });
    },
  },
  sonnenkorn: {
    id: "sonnenkorn",
    name: "Bäckerei Sonnenkorn",
    kind: "Kaffeebecher · 8 oz",
    lid: "#FFFFFF",
    stage: "#FFE9A8",
    ink: "#4A2208",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#F4C542";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      wrapped(ctx, cx, (x) => {
        const sy = TEX_H * 0.33;
        ctx.fillStyle = "#E3A21A";
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a - 0.07) * 150, sy + Math.sin(a - 0.07) * 150);
          ctx.lineTo(x + Math.cos(a) * 250, sy + Math.sin(a) * 250);
          ctx.lineTo(x + Math.cos(a + 0.07) * 150, sy + Math.sin(a + 0.07) * 150);
          ctx.fill();
        }
        ctx.fillStyle = "#B8541A";
        ctx.beginPath();
        ctx.arc(x, sy, 132, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, "Sonnenkorn", x, TEX_H * 0.74, font(800, 150), "#4A2208", -5);
        text(ctx, "BÄCKEREI · HANDWERK", x, TEX_H * 0.84, font(500, 34, FONTS.mono), "#7A3E12", 12);
      });
    },
  },
  amore: {
    id: "amore",
    name: "Gelato Amore",
    kind: "Kaffeebecher · 8 oz",
    lid: "#FFFFFF",
    stage: "#FFDCE7",
    ink: "#B3122E",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#FFC9DA";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.strokeStyle = "#FFF3F7";
      ctx.lineWidth = 22;
      for (let row = 0; row < 12; row++) {
        ctx.beginPath();
        for (let x = 0; x <= TEX_W; x += 12) {
          const y = row * 92 + Math.sin((x / TEX_W) * Math.PI * 24) * 14;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      wrapped(ctx, cx, (x) => {
        ctx.fillStyle = "#FFC9DA";
        ctx.beginPath();
        ctx.ellipse(x, TEX_H * 0.53, 420, 230, 0, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, "amore", x, TEX_H * 0.6, font(400, 260, FONTS.serif, "italic"), "#D7263D");
        text(ctx, "GELATO ARTIGIANALE", x, TEX_H * 0.71, font(500, 32, FONTS.mono), "#B3122E", 12);
      });
    },
  },
  kiez: {
    id: "kiez",
    name: "Kiez Kaffee",
    kind: "Doppelwandig · 12 oz",
    lid: "#101010",
    stage: "#C6F432",
    ink: "#0C0C0D",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.strokeStyle = "#2B2B2B";
      ctx.lineWidth = 3;
      ctx.font = font(900, 150);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      for (let row = 0; row < 7; row++) {
        const y = 140 + row * 150;
        const shift = (row % 2) * -300;
        for (let x = shift; x < TEX_W; x += 980) ctx.strokeText("KIEZ KAFFEE", x, y);
      }
      wrapped(ctx, cx, (x) => {
        ctx.fillStyle = "#101010";
        ctx.fillRect(x - 330, TEX_H * 0.26, 660, TEX_H * 0.52);
        text(ctx, "KIEZ", x, TEX_H * 0.52, font(900, 250), "#FFFFFF", -8);
        text(ctx, "KAFFEE", x, TEX_H * 0.7, font(900, 150), "#FFFFFF", 4);
        ctx.fillStyle = "#C6F432";
        ctx.beginPath();
        ctx.arc(x + 300, TEX_H * 0.29, 78, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(x + 300, TEX_H * 0.29);
        ctx.rotate(-0.25);
        text(ctx, "No. 36", 0, 12, font(800, 38), "#101010", -1);
      });
    },
  },
  gruenzeug: {
    id: "gruenzeug",
    name: "Grünzeug",
    kind: "Kaltgetränk · 16 oz",
    lid: "#FFFFFF",
    stage: "#D9EAD9",
    ink: "#1D4A34",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#2F6B4F";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      for (let i = 0; i < 90; i++) {
        ctx.save();
        ctx.translate(rand(i * 3) * TEX_W, rand(i * 7 + 1) * TEX_H);
        ctx.rotate(rand(i * 11) * Math.PI);
        ctx.fillStyle = rand(i * 5) > 0.5 ? "#3F8A63" : "#4FA077";
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      wrapped(ctx, cx, (x) => {
        ctx.fillStyle = "#F3EEDC";
        ctx.beginPath();
        ctx.roundRect(x - 420, TEX_H * 0.36, 840, 300, 150);
        ctx.fill();
        text(ctx, "grünzeug", x, TEX_H * 0.57, font(800, 160), "#2F6B4F", -6);
        text(ctx, "BOWLS & SALATE", x, TEX_H * 0.6 + 30, font(500, 30, FONTS.mono), "#2F6B4F", 12);
      });
    },
  },
  bergmann: {
    id: "bergmann",
    name: "Bergmann Coffee",
    kind: "Kaffeebecher · 16 oz",
    lid: "#151515",
    stage: "#EFE3D2",
    ink: "#2A1D10",
    draw: (ctx, cx) => {
      ctx.fillStyle = COLORS.kraft;
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rand(i) > 0.5 ? "rgba(90,60,30,0.12)" : "rgba(255,240,220,0.10)";
        ctx.fillRect(rand(i + 0.3) * TEX_W, rand(i + 0.7) * TEX_H, 3, 3);
      }
      wrapped(ctx, cx, (x) => {
        ctx.strokeStyle = "#1A140E";
        ctx.lineWidth = 12;
        ctx.lineJoin = "round";
        ctx.beginPath();
        const pts = [
          [-380, 0.5], [-220, 0.3], [-120, 0.4], [30, 0.16], [170, 0.36], [260, 0.28], [380, 0.5],
        ];
        pts.forEach(([dx, fy], i) => {
          const px = x + dx;
          const py = TEX_H * fy;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        text(ctx, "BERGMANN", x, TEX_H * 0.7, font(700, 140), "#1A140E", 22);
        text(ctx, "COFFEE ROASTERS", x, TEX_H * 0.8, font(500, 34, FONTS.mono), "#3A2A18", 14);
      });
    },
  },
  hafenblau: {
    id: "hafenblau",
    name: "Hafenblau",
    kind: "Coffee-to-go · 12 oz",
    lid: "#FFFFFF",
    stage: "#DCE4FF",
    ink: "#14268C",
    draw: (ctx, cx) => {
      ctx.fillStyle = "#1F3FCC";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < 5; i++) ctx.fillRect(0, TEX_H * 0.8 + i * 44, TEX_W, 18);
      wrapped(ctx, cx, (x) => {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, TEX_H * 0.3, 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 60, TEX_H * 0.3 + 20);
        ctx.quadraticCurveTo(x, TEX_H * 0.3 + 80, x + 60, TEX_H * 0.3 + 20);
        ctx.moveTo(x, TEX_H * 0.3 - 55);
        ctx.lineTo(x, TEX_H * 0.3 + 70);
        ctx.stroke();
        text(ctx, "Hafenblau", x, TEX_H * 0.62, font(800, 170), "#FFFFFF", -6);
        text(ctx, "FISCHBRÖTCHEN & KAFFEE", x, TEX_H * 0.71, font(500, 30, FONTS.mono), "#BFD0FF", 12);
      });
    },
  },
};

/** Paper-bag front/back artwork (brandlo on kraft). */
export const drawBagFace = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = COLORS.kraft;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rand(i + 11) > 0.5 ? "rgba(90,60,30,0.10)" : "rgba(255,240,220,0.10)";
    ctx.fillRect(rand(i + 0.2) * w, rand(i + 0.9) * h, 3, 3);
  }
  drawWordmark(ctx, w / 2, h * 0.5, 190, COLORS.ink, COLORS.accent);
  text(ctx, "brandlo.de", w / 2, h * 0.6, font(500, 34, FONTS.mono), "#3A2A18", 6);
  ctx.fillStyle = "rgba(60,40,20,0.18)";
  ctx.fillRect(0, h * 0.93, w, 4);
};

/** Paper-bag side gusset (kraft with a centre crease). */
export const drawBagSide = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#BB9064";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(60,35,10,0.35)");
  g.addColorStop(0.52, "rgba(255,235,200,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

/** Ice-cream bowl band (white with accent waves). */
export const drawBowl = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * 0.62 + Math.sin((x / w) * Math.PI * 16) * 26);
  ctx.lineTo(w, h);
  ctx.fill();
  ctx.fillStyle = COLORS.accentSoft;
  ctx.fillRect(0, h * 0.12, w, 10);
  for (const cx of [w * 0.5, w * 0.0, w * 1.0, w * 0.25, w * 0.75]) {
    drawWordmark(ctx, cx, h * 0.47, 110, COLORS.ink, COLORS.accent);
  }
};
