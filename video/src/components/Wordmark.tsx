import { COLORS, FONTS } from "../brand";
import { EASE, clamp } from "../lib/ease";
import { Mask } from "./Motion";

type Props = {
  size: number;
  color?: string;
  accent?: string;
  /** Optional 0→1 build-on progress (letters rise, ring pops). Omit for static. */
  p?: number;
  /** Override for the ring scale (e.g. when the ring flies in separately). */
  ringScale?: number;
};

const LETTERS = ["b", "r", "a", "n", "d", "l"];

/** "brandl" + accent ring as the "o" – a coffee cup seen from above. */
export const Wordmark: React.FC<Props> = ({ size, color = COLORS.ink, accent = COLORS.accent, p, ringScale }) => {
  const xh = size * 0.54;
  const animated = p !== undefined;
  const ringP = animated ? EASE.back(clamp((p - 0.45) / 0.55)) : 1;
  const rs = ringScale ?? ringP;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: FONTS.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.045em",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {animated
        ? LETTERS.map((l, i) => (
            <Mask key={i} p={EASE.out(clamp((p - i * 0.06) / 0.5))} blur={false}>
              {l}
            </Mask>
          ))
        : "brandl"}
      <span
        style={{
          display: "inline-block",
          width: xh,
          height: xh,
          marginLeft: size * 0.02,
          borderRadius: "50%",
          border: `${xh * 0.24}px solid ${accent}`,
          boxSizing: "border-box",
          transform: `scale(${rs})`,
          transformOrigin: "50% 50%",
        }}
      />
    </div>
  );
};
