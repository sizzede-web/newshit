import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, ramp } from "../lib/ease";
import { useTime } from "../lib/time";

/** Mounts children only inside [start, end) of absolute time — time is never re-based. */
export const Scene: React.FC<{ start: number; end: number; children: React.ReactNode; z?: number }> = ({
  start,
  end,
  children,
  z = 0,
}) => {
  const t = useTime();
  if (t < start || t >= end) return null;
  return <AbsoluteFill style={{ zIndex: z }}>{children}</AbsoluteFill>;
};

type MaskProps = {
  /** 0→1 entrance progress. */
  p: number;
  /** 0→1 exit progress (moves up and out). */
  out?: number;
  children: React.ReactNode;
  blur?: boolean;
  from?: number;
};

/** Line-masked slide reveal – the backbone of Apple-style kinetic type. */
export const Mask: React.FC<MaskProps> = ({ p, out = 0, children, blur = true, from = 115 }) => {
  const hidden = (p <= 0.001 && out <= 0) || out >= 0.999;
  const y = (1 - p) * from - out * 125;
  const b = blur ? (1 - p) * 10 + out * 10 : 0;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "top",
        padding: "0.08em 0.04em 0.16em",
        margin: "-0.08em -0.04em -0.16em",
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${y}%) rotate(${(1 - p) * 3}deg)`,
          transformOrigin: "0% 100%",
          opacity: hidden ? 0 : Math.min(1, p * 2.5) * (1 - out),
          filter: b > 0.05 ? `blur(${b}px)` : undefined,
        }}
      >
        {children}
      </span>
    </span>
  );
};

type WordsProps = {
  text: string;
  start: number;
  stagger?: number;
  dur?: number;
  outAt?: number;
  outDur?: number;
  style?: React.CSSProperties;
  wordStyle?: (word: string, i: number) => React.CSSProperties | undefined;
};

/** Staggered word-by-word mask reveal. */
export const Words: React.FC<WordsProps> = ({
  text,
  start,
  stagger = 0.06,
  dur = 0.55,
  outAt,
  outDur = 0.32,
  style,
  wordStyle,
}) => {
  const t = useTime();
  const words = text.split(" ");
  return (
    <span style={style}>
      {words.map((w, i) => {
        const p = ramp(t, start + i * stagger, dur, EASE.out);
        const out = outAt === undefined ? 0 : ramp(t, outAt + i * 0.02, outDur, EASE.in);
        return (
          <span key={i}>
            <Mask p={p} out={out}>
              <span style={wordStyle?.(w, i)}>{w}</span>
            </Mask>
            {i < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </span>
  );
};

/** Animated film grain from a pre-baked noise tile (cheap per frame). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const url = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    const img = ctx.createImageData(256, 256);
    let s = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = (s >> 8) & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }, []);
  const k = Math.floor(frame / 2);
  const ox = (k * 73) % 256;
  const oy = (k * 151) % 256;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${url})`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/** Horizontal motion-blur filter (SVG) – `amount` in px. */
export const useDirectionalBlur = (id: string, amount: number) => {
  const a = Math.round(amount * 2) / 2;
  const filterId = `${id}-${a}`;
  const defs =
    a > 0.2 ? (
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId} x="-20%" y="-5%" width="140%" height="110%">
          <feGaussianBlur stdDeviation={`${a} 0`} />
        </filter>
      </svg>
    ) : null;
  return { defs, filter: a > 0.2 ? `url(#${filterId})` : undefined };
};
