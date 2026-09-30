import { AbsoluteFill, Img, staticFile } from "remotion";
import { BRAND, COLORS, FONTS } from "../brand";
import { Mask } from "../components/Motion";
import { Wordmark } from "../components/Wordmark";
import { EASE, clamp, ramp, springAt } from "../lib/ease";
import { useTime } from "../lib/time";
import { T } from "../timeline";

const serif: React.CSSProperties = {
  fontFamily: FONTS.serif,
  fontStyle: "italic",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

/** 27–30 s · Motto, then the logo lock-up with CTA. */
export const Outro: React.FC = () => {
  const t = useTime();
  const [a, b, c, d] = T.motto;
  const mottoOut = ramp(t, T.lockup - 0.12, 0.3, EASE.in);
  const lock = ramp(t, T.lockup, 0.9, EASE.out);
  const push = 1 + 0.035 * ramp(t, T.lockup, 1.5, EASE.soft);
  const tag = ramp(t, T.lockup + 0.3, 0.6, EASE.out);
  const cta = springAt(t, T.cta, { damping: 15, stiffness: 180 });
  const products = [
    { src: "shots/cup-brandlo.png", x: -560, w: 250, delay: 0.1, rot: -6 },
    { src: "shots/bag.png", x: 0, w: 330, delay: 0.0, rot: 0 },
    { src: "shots/bowl.png", x: 560, w: 270, delay: 0.2, rot: 5 },
  ];
  return (
    <AbsoluteFill style={{ background: COLORS.paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 60% at 50% 45%, rgba(255,184,150,${0.28 * lock}) 0%, rgba(255,184,150,0) 70%)`,
        }}
      />

      {/* motto */}
      {mottoOut < 1 ? (
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.display,
            fontWeight: 650,
            fontSize: 132,
            lineHeight: 1.05,
            letterSpacing: "-0.055em",
            color: COLORS.ink,
            textAlign: "center",
            transform: `scale(${1 - mottoOut * 0.08})`,
            opacity: 1 - mottoOut,
            filter: mottoOut > 0.01 ? `blur(${mottoOut * 14}px)` : undefined,
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>
            <Mask p={ramp(t, a, 0.45)}>Du</Mask> <Mask p={ramp(t, a + 0.07, 0.45)}>sagst</Mask>{" "}
            <Mask p={ramp(t, b, 0.45)}>
              <span style={{ ...serif, color: COLORS.accent }}>„Macht mal“.</span>
            </Mask>
          </div>
          <div style={{ whiteSpace: "nowrap" }}>
            <Mask p={ramp(t, c, 0.45)}>Wir</Mask> <Mask p={ramp(t, c + 0.07, 0.45)}>erledigen</Mask>{" "}
            <Mask p={ramp(t, d, 0.45)}>
              <span style={serif}>den Rest.</span>
            </Mask>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* lock-up */}
      {t >= T.lockup - 0.05 ? (
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <div style={{ position: "absolute", top: 180, width: "100%", display: "flex", justifyContent: "center" }}>
            <Wordmark size={230} p={lock} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 452,
              width: "100%",
              textAlign: "center",
              fontFamily: FONTS.display,
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: "-0.025em",
              color: COLORS.mutedDark,
              opacity: tag,
              transform: `translateY(${(1 - tag) * 16}px)`,
            }}
          >
            {BRAND.tagline}
          </div>
          <div
            style={{
              position: "absolute",
              top: 540,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 22,
              opacity: clamp(cta * 2),
              transform: `translateY(${(1 - cta) * 24}px) scale(${0.94 + 0.06 * cta})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: COLORS.accent,
                color: COLORS.white,
                borderRadius: 999,
                padding: "20px 34px",
                fontFamily: FONTS.display,
                fontSize: 30,
                fontWeight: 650,
                letterSpacing: "-0.02em",
                boxShadow: "0 16px 40px rgba(255,90,31,0.35)",
              }}
            >
              Jetzt anfragen
              <span style={{ display: "inline-block", transform: `translateX(${Math.sin(t * 6) * 4}px)` }}>→</span>
            </div>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 28,
                letterSpacing: "0.04em",
                color: COLORS.ink,
                border: `1.5px solid ${COLORS.line}`,
                borderRadius: 999,
                padding: "18px 30px",
              }}
            >
              {BRAND.url}
            </div>
          </div>
          {products.map((p) => {
            const s = springAt(t, T.lockup + 0.25 + p.delay, { damping: 15, stiffness: 120 });
            return (
              <Img
                key={p.src}
                src={staticFile(p.src)}
                style={{
                  position: "absolute",
                  left: 960 + p.x - p.w / 2,
                  top: 700 - (p.w - 250) * 0.9 + (1 - s) * 420,
                  width: p.w,
                  transform: `rotate(${p.rot * (1 - s * 0.6)}deg)`,
                  opacity: clamp(s * 3),
                }}
              />
            );
          })}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
