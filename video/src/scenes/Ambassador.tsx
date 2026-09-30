import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLORS, FONTS } from "../brand";
import { Mask, Words } from "../components/Motion";
import { EASE, clamp, rand, ramp, springAt } from "../lib/ease";
import { useTime } from "../lib/time";
import { T } from "../timeline";

const CARD = { y: 318, w: 530, h: 640, gap: 40 } as const;
const cardX = (i: number) => (1920 - (CARD.w * 3 + CARD.gap * 2)) / 2 + i * (CARD.w + CARD.gap);
const ILLU_H = 470;

// ---------------------------------------------------------- vignettes ---

const Street: React.FC<{ t: number }> = ({ t }) => {
  const far = Array.from({ length: 14 }, (_, i) => ({ w: 60 + rand(i) * 70, h: 110 + rand(i + 20) * 150 }));
  const near = Array.from({ length: 10 }, (_, i) => ({ w: 90 + rand(i + 40) * 90, h: 70 + rand(i + 60) * 120 }));
  const row = (items: { w: number; h: number }[], speed: number, color: string, base: number, window?: string) => {
    let x = -((t * speed) % 900);
    const els: React.ReactNode[] = [];
    for (let rep = 0; rep < 3; rep++) {
      items.forEach((b, i) => {
        els.push(
          <div
            key={`${rep}-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: base - b.h,
              width: b.w,
              height: b.h,
              background: color,
              borderRadius: "6px 6px 0 0",
              backgroundImage: window
                ? `linear-gradient(${window} 0 0), radial-gradient(${window} 2.5px, transparent 3px)`
                : undefined,
              backgroundSize: window ? "0 0, 22px 26px" : undefined,
              backgroundPosition: "0 0, 8px 10px",
            }}
          />,
        );
        x += b.w + 8;
      });
    }
    return els;
  };
  const bob = Math.abs(Math.sin(t * 7.5));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #FFD6BD 0%, #FFEBDD 70%)" }}>
      <div style={{ position: "absolute", left: 330, top: 70, width: 130, height: 130, borderRadius: "50%", background: "#FFB48C" }} />
      {row(far, 22, "#F3C6A8", 360, "rgba(255,255,255,0.35)")}
      {row(near, 55, "#E8A47E", 380, "rgba(255,236,220,0.55)")}
      <div style={{ position: "absolute", left: 0, top: 380, right: 0, bottom: 0, background: "#EAD5C0" }} />
      <div
        style={{
          position: "absolute",
          left: -((t * 160) % 80),
          top: 430,
          width: 900,
          height: 5,
          backgroundImage: "linear-gradient(90deg, #D7BCA2 0 40px, transparent 40px 80px)",
          backgroundSize: "80px 5px",
        }}
      />
      <Img
        src={staticFile("shots/cup-brandlo.png")}
        style={{
          position: "absolute",
          left: 130,
          top: 118 - bob * 12,
          width: 270,
          transform: `rotate(${Math.sin(t * 7.5) * 3}deg)`,
          filter: "drop-shadow(0 18px 18px rgba(80,40,10,0.18))",
        }}
      />
    </div>
  );
};

const Office: React.FC<{ t: number }> = ({ t }) => {
  const bars = [0.45, 0.7, 0.55, 0.9, 0.75];
  const grow = ramp(t, T.cards[1] + 0.2, 1.2, EASE.out);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #E4EAEE 0%, #F1F4F6 100%)" }}>
      {/* window with blinds */}
      <div style={{ position: "absolute", left: 300, top: 40, width: 190, height: 220, borderRadius: 10, background: "#D5E2EA", overflow: "hidden" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 10 + i * 24, height: 10, background: "rgba(255,255,255,0.7)" }} />
        ))}
      </div>
      {/* desk */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, height: 26, background: "#C9A97F" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 406, bottom: 0, background: "#B99468" }} />
      {/* laptop */}
      <div style={{ position: "absolute", left: 40, top: 196, width: 270, height: 176, borderRadius: "12px 12px 4px 4px", background: "#1B1B1E", padding: 12, boxSizing: "border-box" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 6, background: "#26262B", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 12, top: 12, width: 90, height: 8, borderRadius: 4, background: "#3A3A42" }} />
          <div style={{ position: "absolute", left: 12, top: 26, width: 60, height: 8, borderRadius: 4, background: "#3A3A42" }} />
          {bars.map((b, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 18 + i * 42,
                bottom: 12,
                width: 26,
                height: 90 * b * grow,
                borderRadius: 4,
                background: i === 3 ? COLORS.accent : "#4A4A53",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 16, top: 368, width: 318, height: 14, borderRadius: "0 0 10px 10px", background: "#9EA3A8" }} />
      {/* steam */}
      <svg style={{ position: "absolute", left: 340, top: 60 }} width={160} height={160} viewBox="0 0 160 160">
        {[0, 1, 2].map((i) => {
          const phase = ((t * 0.8 + i * 0.33) % 1 + 1) % 1;
          return (
            <path
              key={i}
              d={`M${50 + i * 30} 150 C ${30 + i * 30} 115, ${75 + i * 30} 95, ${50 + i * 30} 60 S ${40 + i * 30} 20, ${55 + i * 30} 0`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
              opacity={Math.sin(phase * Math.PI) * 0.9}
              transform={`translate(0 ${-phase * 30})`}
            />
          );
        })}
      </svg>
      <Img
        src={staticFile("shots/cup-brandlo.png")}
        style={{ position: "absolute", left: 318, top: 160, width: 200, filter: "drop-shadow(0 12px 12px rgba(40,30,20,0.18))" }}
      />
    </div>
  );
};

const Heart: React.FC<{ size: number; fill: string; stroke?: string }> = ({ size, fill, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 2.8 4.5 6.6 4.5c2.2 0 3.7 1.2 5.4 3.1 1.7-1.9 3.2-3.1 5.4-3.1 3.8 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z"
      fill={fill}
      stroke={stroke ?? "none"}
      strokeWidth={1.8}
    />
  </svg>
);

const Social: React.FC<{ t: number }> = ({ t }) => {
  const liked = t >= T.like;
  const pop = springAt(t, T.like, { damping: 8, stiffness: 320 });
  const likes = Math.round(1860 + 621 * ramp(t, T.cards[2] + 0.2, 2.2, EASE.soft));
  const fmt = likes.toLocaleString("de-DE");
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(90% 80% at 50% 30%, #2A2A30 0%, #141416 70%)" }}>
      <div
        style={{
          position: "absolute",
          left: (CARD.w - 310) / 2,
          top: 34,
          width: 310,
          height: 470,
          borderRadius: 38,
          background: "#FFFFFF",
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
          fontFamily: FONTS.display,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 16px 12px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#C6F432",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 15,
              color: "#101010",
            }}
          >
            K
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink, letterSpacing: "-0.01em" }}>kiezkaffee</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>Berlin-Kreuzberg</div>
          </div>
        </div>
        <div style={{ width: 310, height: 300, background: "linear-gradient(160deg, #D4FA55 0%, #B6E322 100%)", position: "relative", overflow: "hidden" }}>
          <Img src={staticFile("shots/cup-kiez.png")} style={{ position: "absolute", left: 45, top: 10, width: 220, transform: `rotate(${-4 + Math.sin(t * 1.5) * 2}deg)` }} />
          {/* double-tap heart */}
          {pop > 0 ? (
            <div
              style={{
                position: "absolute",
                left: 155 - 60,
                top: 150 - 60,
                transform: `scale(${pop * (1 - ramp(t, T.like + 0.55, 0.25, EASE.in))})`,
                opacity: 1 - ramp(t, T.like + 0.55, 0.25),
              }}
            >
              <Heart size={120} fill="#FFFFFF" />
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px 6px" }}>
          <div style={{ transform: `scale(${liked ? 1 + 0.35 * Math.sin(clamp((t - T.like) / 0.3) * Math.PI) : 1})` }}>
            <Heart size={26} fill={liked ? "#FF3040" : "none"} stroke={liked ? "#FF3040" : COLORS.ink} />
          </div>
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path d="M20 12a8 8 0 1 1-3.1-6.3L21 4l-1.3 4.2A8 8 0 0 1 20 12z" fill="none" stroke={COLORS.ink} strokeWidth={1.8} strokeLinejoin="round" />
          </svg>
          <svg width={24} height={24} viewBox="0 0 24 24">
            <path d="M3 11 21 3l-8 18-2-8-8-2z" fill="none" stroke={COLORS.ink} strokeWidth={1.8} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ padding: "2px 16px", fontSize: 15, fontWeight: 700, color: COLORS.ink }}>Gefällt {fmt} Mal</div>
        <div style={{ padding: "4px 16px", fontSize: 14, color: COLORS.ink }}>
          <b>kiezkaffee</b> Neue Becher sind da. <span style={{ color: "#3B5FB5" }}>#kiezkaffee</span>
        </div>
      </div>
      {/* floating hearts */}
      {liked
        ? Array.from({ length: 9 }, (_, i) => {
            const start = T.like + 0.05 + i * 0.09;
            const p = ramp(t, start, 1.4, EASE.soft);
            if (p <= 0 || p >= 1) return null;
            const x = 380 + Math.sin(p * 6 + i) * 22 + (rand(i) - 0.5) * 60;
            const y = 430 - p * 360;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, opacity: Math.sin(p * Math.PI), transform: `scale(${0.6 + rand(i + 3) * 0.7})` }}>
                <Heart size={30} fill={i % 3 === 0 ? COLORS.accent : "#FF3040"} />
              </div>
            );
          })
        : null}
    </div>
  );
};

const CARDS = [
  { title: "Auf der Straße.", caption: "Sichtbar in der ganzen Stadt", dark: false, Vignette: Street },
  { title: "Im Büro.", caption: "Präsent in jedem Meeting", dark: false, Vignette: Office },
  { title: "Auf Social Media.", caption: "Geteilt, geliked, gesehen", dark: true, Vignette: Social },
];

// -------------------------------------------------------------- scene ---

/** 24–27 s · "Dein täglicher Markenbotschafter" – three bento cards. */
export const Ambassador: React.FC = () => {
  const t = useTime();
  const sheet = ramp(t, T.sheet, 0.5, EASE.out);
  // exit without CSS filters (a blurred parent breaks the cards' rounded clipping in Chromium)
  const leaveAt = 26.45;
  return (
    <AbsoluteFill
      style={{
        transform: `translateY(${(1 - sheet) * 1080}px)`,
        borderRadius: `${(1 - sheet) * 60}px ${(1 - sheet) * 60}px 0 0`,
        overflow: "hidden",
        background: COLORS.paper,
        boxShadow: "0 -30px 80px rgba(0,0,0,0.35)",
      }}
    >
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            top: 110,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.display,
            fontWeight: 650,
            fontSize: 96,
            letterSpacing: "-0.055em",
            color: COLORS.ink,
          }}
        >
          <Words
            text="Dein täglicher Markenbotschafter."
            start={T.sheet + 0.08}
            stagger={0.06}
            outAt={leaveAt}
            outDur={0.28}
            wordStyle={(w) =>
              w === "Markenbotschafter."
                ? { fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.025em", color: COLORS.accent }
                : undefined
            }
          />
        </div>
        {CARDS.map((c, i) => {
          const s = springAt(t, T.cards[i], { damping: 16, stiffness: 150 });
          const out = ramp(t, leaveAt + 0.05 + i * 0.05, 0.32, EASE.in);
          const x = cardX(i);
          const V = c.Vignette;
          return (
            <div
              key={c.title}
              style={{
                position: "absolute",
                left: x,
                top: CARD.y,
                width: CARD.w,
                height: CARD.h,
                borderRadius: 36,
                overflow: "hidden",
                background: c.dark ? "#141416" : COLORS.white,
                boxShadow: "0 30px 70px rgba(60,35,10,0.14), 0 4px 14px rgba(60,35,10,0.06)",
                transform: `translateY(${(1 - s) * 420 + out * 760}px) rotate(${(1 - s) * (i - 1) * 6 + out * (i - 1) * 5}deg)`,
                opacity: clamp(s * 3) * (1 - out * out),
              }}
            >
              <div style={{ position: "absolute", left: 0, top: 0, width: CARD.w, height: ILLU_H }}>
                <V t={t} />
              </div>
              <div style={{ position: "absolute", left: 36, top: ILLU_H + 34 }}>
                <div
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 650,
                    fontSize: 46,
                    letterSpacing: "-0.04em",
                    color: c.dark ? COLORS.white : COLORS.ink,
                  }}
                >
                  <Mask p={ramp(t, T.cards[i] + 0.2, 0.5)}>{c.title}</Mask>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontFamily: FONTS.mono,
                    fontSize: 17,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: c.dark ? "#A39E96" : COLORS.muted,
                    opacity: ramp(t, T.cards[i] + 0.35, 0.4),
                  }}
                >
                  {c.caption}
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
