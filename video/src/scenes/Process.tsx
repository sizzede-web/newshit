import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../brand";
import { Mask, Words } from "../components/Motion";
import { EASE, clamp, lerp, ramp } from "../lib/ease";
import { useTime } from "../lib/time";
import { T } from "../timeline";

const STEPS = [
  { n: "01", title: "Design-Check", desc: "Kostenlose Prüfung deiner Datei" },
  { n: "02", title: "Druckfreigabe", desc: "Realistische Vorschau, dein Go" },
  { n: "03", title: "Produktion", desc: "Zertifiziert & qualitätsgeprüft" },
  { n: "04", title: "Lieferung", desc: "Sicher verpackt bis vor die Tür" },
];

const TRACK = { x0: 170, x1: 1750, y: 420 } as const;
const nodeX = (i: number) => lerp(TRACK.x0, TRACK.x1, i / (STEPS.length - 1));

/** Rolling odometer digit. */
const Digit: React.FC<{ d: string; p: number; offset: number }> = ({ d, p, offset }) => {
  const n = Number(d);
  if (Number.isNaN(n)) return <span>{d}</span>;
  const pos = (10 + n + offset * 10) * p;
  const base = Math.floor(pos);
  const f = pos - base;
  return (
    <span style={{ display: "inline-block", position: "relative", overflow: "hidden", verticalAlign: "top", height: "1.02em" }}>
      <span style={{ visibility: "hidden" }}>{d}</span>
      <span style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${-f * 100}%)` }}>{base % 10}</span>
      <span style={{ position: "absolute", left: 0, top: "100%", transform: `translateY(${-f * 100}%)` }}>{(base + 1) % 10}</span>
    </span>
  );
};

const Odometer: React.FC<{ value: string; p: number }> = ({ value, p }) => (
  <span>
    {value.split("").map((c, i) => (
      <Digit key={i} d={c} p={p} offset={i} />
    ))}
  </span>
);

const STATS = [
  { value: "5–6", unit: "Wochen", label: "Standard-Lieferzeit", hi: false },
  { value: "3–4", unit: "Wochen", label: "Mit Priority-Service", hi: true },
  { value: "0", unit: "€", label: "Versteckte Kosten", hi: false },
];

/** 19.5–24 s · Dark scene: the 4-step process + delivery stats. */
export const Process: React.FC = () => {
  const t = useTime();
  // circular reveal out of the "Freigegeben" button
  const iris = ramp(t, T.irisDark, 0.5, EASE.inOut);
  const radius = iris * 2300;
  // pushed back when the next sheet slides over
  const back = ramp(t, T.sheet, 0.5, EASE.inOut);

  // progress head position along the track
  const head = STEPS.reduce((acc, _, i) => {
    if (i === 0) return acc;
    return acc + ramp(t, T.steps[i - 1] + 0.05, T.steps[i] - T.steps[i - 1], EASE.inOut);
  }, 0);
  const headX = lerp(TRACK.x0, TRACK.x1, head / (STEPS.length - 1));
  const trackIn = ramp(t, 19.8, 0.7, EASE.out);

  return (
    <AbsoluteFill
      style={{
        clipPath: iris < 1 ? `circle(${radius}px at 1020px 862px)` : undefined,
        transform: `scale(${1 - back * 0.06})`,
        filter: back > 0.01 ? `brightness(${1 - back * 0.5})` : undefined,
      }}
    >
      <AbsoluteFill style={{ background: COLORS.ink }} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(255,90,31,0.16) 0%, rgba(255,90,31,0) 70%), radial-gradient(40% 40% at 90% 100%, rgba(255,184,150,0.08) 0%, rgba(255,184,150,0) 70%)",
        }}
      />
      {/* dotted grid */}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1.4px, transparent 1.6px)",
          backgroundSize: "40px 40px",
          backgroundPosition: `${-t * 12}px 0px`,
          maskImage: "radial-gradient(70% 70% at 50% 45%, black 20%, transparent 80%)",
          opacity: 0.8,
        }}
      />

      {/* headline */}
      <div style={{ position: "absolute", left: 170, top: 118 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 20, letterSpacing: "0.14em", color: COLORS.accent, opacity: ramp(t, 19.65, 0.4) }}>
          SO EINFACH GEHT'S
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: FONTS.display,
            fontWeight: 650,
            fontSize: 92,
            letterSpacing: "-0.05em",
            color: COLORS.white,
            whiteSpace: "nowrap",
          }}
        >
          <Words
            text="Von der Idee bis zur Lieferung."
            start={19.68}
            stagger={0.05}
            wordStyle={(w) =>
              w === "Lieferung." ? { fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, color: COLORS.accentSoft, letterSpacing: "-0.02em" } : undefined
            }
          />
        </div>
      </div>

      {/* track */}
      <div
        style={{
          position: "absolute",
          left: TRACK.x0,
          top: TRACK.y - 1,
          width: (TRACK.x1 - TRACK.x0) * trackIn,
          height: 2,
          background: "rgba(255,255,255,0.14)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: TRACK.x0,
          top: TRACK.y - 2,
          width: headX - TRACK.x0,
          height: 4,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${COLORS.accentDeep}, ${COLORS.accent} 70%, ${COLORS.accentSoft})`,
          boxShadow: "0 0 24px rgba(255,90,31,0.7)",
          opacity: t >= T.steps[0] ? 1 : 0,
        }}
      />
      {t >= T.steps[0] && head < STEPS.length - 1 ? (
        <div
          style={{
            position: "absolute",
            left: headX - 40,
            top: TRACK.y - 40,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,184,150,0.9) 0%, rgba(255,90,31,0.35) 35%, rgba(255,90,31,0) 70%)",
          }}
        />
      ) : null}

      {STEPS.map((s, i) => {
        const on = ramp(t, T.steps[i], 0.3, EASE.out);
        const appear = ramp(t, 19.9 + i * 0.07, 0.6, EASE.out);
        const pulse = ramp(t, T.steps[i], 0.7, EASE.out);
        const x = nodeX(i);
        return (
          <div key={s.n}>
            {pulse > 0 && pulse < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: x - 18,
                  top: TRACK.y - 18,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: `2px solid ${COLORS.accent}`,
                  transform: `scale(${1 + pulse * 2.4})`,
                  opacity: 1 - pulse,
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                left: x - 14,
                top: TRACK.y - 14,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: on > 0 ? COLORS.accent : COLORS.ink,
                border: `2px solid ${on > 0 ? COLORS.accent : "rgba(255,255,255,0.3)"}`,
                boxShadow: on > 0 ? "0 0 30px rgba(255,90,31,0.8)" : "none",
                transform: `scale(${appear * (1 + 0.3 * Math.sin(clamp(on) * Math.PI))})`,
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: i === 0 ? x - 14 : i === STEPS.length - 1 ? x - 380 + 14 : x - 190,
                top: TRACK.y + 44,
                width: 380,
                textAlign: i === 0 ? "left" : i === STEPS.length - 1 ? "right" : "center",
                opacity: 0.35 + 0.65 * on,
              }}
            >
              <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.12em", color: on > 0 ? COLORS.accent : COLORS.muted }}>
                <Mask p={appear}>{s.n}</Mask>
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontFamily: FONTS.display,
                  fontSize: 42,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  color: COLORS.white,
                }}
              >
                <Mask p={appear}>{s.title}</Mask>
              </div>
              <div style={{ marginTop: 8, fontFamily: FONTS.display, fontSize: 21, color: "#A39E96", letterSpacing: "-0.005em" }}>
                <Mask p={ramp(t, T.steps[i], 0.5)}>{s.desc}</Mask>
              </div>
            </div>
          </div>
        );
      })}

      {/* stats */}
      {STATS.map((s, i) => {
        const p = ramp(t, T.stats[i], 0.6, EASE.out);
        const roll = ramp(t, T.stats[i], 0.9, EASE.out);
        const x = 170 + i * 540;
        return (
          <div
            key={s.label}
            style={{
              position: "absolute",
              left: x,
              top: 690,
              width: 500,
              height: 270,
              borderRadius: 30,
              background: s.hi ? "linear-gradient(160deg, rgba(255,90,31,0.22), rgba(255,90,31,0.05))" : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${s.hi ? "rgba(255,90,31,0.7)" : "rgba(255,255,255,0.1)"}`,
              boxSizing: "border-box",
              padding: "34px 38px",
              opacity: p,
              transform: `translateY(${(1 - p) * 60}px) scale(${0.96 + 0.04 * p})`,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.display,
                fontWeight: 700,
                fontSize: 128,
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: s.hi ? COLORS.accent : COLORS.white,
                display: "flex",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              <Odometer value={s.value} p={roll} />
              <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em", color: s.hi ? COLORS.accentSoft : "#CFCAC2" }}>{s.unit}</span>
            </div>
            <div
              style={{
                marginTop: 26,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONTS.mono,
                fontSize: 19,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: s.hi ? COLORS.accentSoft : "#A39E96",
              }}
            >
              {s.hi ? <span style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accent, boxShadow: "0 0 12px rgba(255,90,31,0.9)" }} /> : null}
              {s.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
