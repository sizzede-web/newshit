import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../brand";
import { Mask } from "../components/Motion";
import { EASE, ramp, springAt } from "../lib/ease";
import { useTime } from "../lib/time";
import { T } from "../timeline";

const serif: React.CSSProperties = {
  fontFamily: FONTS.serif,
  fontStyle: "italic",
  fontWeight: 400,
  letterSpacing: "-0.02em",
};

/** 0–3.5 s · Cold open on black: "Dein Kaffee geht raus. / Deine Marke geht mit." */
export const Hook: React.FC = () => {
  const t = useTime();
  const [w1, w2, w3, w4] = T.hookWords;

  // opening blip: the accent dot pops on and off before the first word
  const blipIn = springAt(t, 0.08, { damping: 11, stiffness: 220 });
  const blipOut = ramp(t, 0.38, 0.14, EASE.in);
  const blip = blipIn * (1 - blipOut);

  const flick = ramp(t, T.hookFlick, 0.3, EASE.in);
  const iris = ramp(t, T.iris, 0.42, EASE.in);
  const settle = ramp(t, w4, 0.5, EASE.out);

  const line: React.CSSProperties = {
    display: "block",
    whiteSpace: "nowrap",
  };

  const glowX = 50 + 6 * Math.sin(t * 0.9);

  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 60% at ${glowX}% 55%, rgba(255,90,31,${0.1 + 0.08 * settle}) 0%, rgba(255,90,31,0) 70%)`,
        }}
      />
      {/* opening blip */}
      {blip > 0.001 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.accent, transform: `scale(${blip})` }} />
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.display,
          fontWeight: 650,
          fontSize: 176,
          lineHeight: 1.02,
          letterSpacing: "-0.055em",
          color: COLORS.white,
          textAlign: "center",
        }}
      >
        {/* part one */}
        {flick < 1 ? (
          <div style={{ position: "absolute" }}>
            <span style={line}>
              <Mask p={ramp(t, w1, 0.5)} out={flick}>
                Dein
              </Mask>{" "}
              <Mask p={ramp(t, w1 + 0.08, 0.5)} out={ramp(t, T.hookFlick + 0.03, 0.3, EASE.in)}>
                Kaffee
              </Mask>
            </span>
            <span style={line}>
              <Mask p={ramp(t, w2, 0.5)} out={ramp(t, T.hookFlick + 0.05, 0.3, EASE.in)}>
                geht
              </Mask>{" "}
              <Mask p={ramp(t, w2 + 0.08, 0.5)} out={ramp(t, T.hookFlick + 0.08, 0.3, EASE.in)}>
                <span style={serif}>raus</span>
                <span style={{ color: COLORS.accent }}>.</span>
              </Mask>
            </span>
          </div>
        ) : null}

        {/* part two */}
        {t >= w3 - 0.05 ? (
          <div
            style={{
              position: "absolute",
              transform: `scale(${1 - 0.06 * iris})`,
              filter: iris > 0.02 ? `blur(${iris * 8}px)` : undefined,
            }}
          >
            <span style={line}>
              <Mask p={ramp(t, w3, 0.5)}>Deine</Mask>{" "}
              <Mask p={ramp(t, w3 + 0.08, 0.5)}>Marke</Mask>
            </span>
            <span style={line}>
              <Mask p={ramp(t, w4, 0.5)}>geht</Mask>{" "}
              <Mask p={ramp(t, w4 + 0.08, 0.5)}>
                <span style={{ ...serif, color: COLORS.accent }}>mit</span>
              </Mask>
              <span
                style={{
                  display: "inline-block",
                  width: "0.19em",
                  height: "0.19em",
                  marginLeft: "0.04em",
                  borderRadius: "50%",
                  background: COLORS.accent,
                  transform: `scale(${springAt(t, w4 + 0.22, { damping: 10, stiffness: 240 }) + iris * iris * 160})`,
                  transformOrigin: "50% 50%",
                  filter: "none",
                }}
              />
            </span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
