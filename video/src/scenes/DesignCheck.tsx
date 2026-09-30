import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate } from "remotion";
import { COLORS, FONTS } from "../brand";
import { Mask, Words, useDirectionalBlur } from "../components/Motion";
import { EASE, clamp, lerp, ramp, springAt } from "../lib/ease";
import { useFontsReady } from "../lib/fonts";
import { useTime } from "../lib/time";
import { T, WIDTH } from "../timeline";
import { BlobShadow, CameraRig, Cup, Studio, onCreatedGl } from "../three/Products";
import { usePrintTexture } from "../three/textures";

// window geometry (composition pixels)
const WIN = { x: 800, y: 178, w: 1010, h: 720 } as const;
const BAR = 54;
const PAD = 28;
const LEFT_W = 356;
const DROP = { x: WIN.x + PAD, y: WIN.y + BAR + 64, w: LEFT_W - PAD, h: 176 } as const;
const BTN = { x: WIN.x + PAD, y: WIN.y + WIN.h - PAD - 64, w: LEFT_W - PAD, h: 64 } as const;
const PREVIEW = { x: WIN.x + LEFT_W + 18, y: WIN.y + BAR + 16, w: WIN.w - LEFT_W - 18 - 16, h: WIN.h - BAR - 32 } as const;

const PRINT_START = T.uploadDone + 0.05;
const PRINT_DUR = 0.7;

// ------------------------------------------------------------- cursor ---

type P = [number, number];
const cursorPath = (t: number): P => {
  const keys: { t: number; p: P }[] = [
    { t: 16.0, p: [1760, 1010] },
    { t: 16.2, p: [1700, 930] },
    { t: T.fileDrop, p: [DROP.x + DROP.w / 2 + 40, DROP.y + DROP.h / 2 + 18] },
    { t: 17.6, p: [DROP.x + DROP.w / 2 + 70, DROP.y + DROP.h / 2 + 60] },
    { t: T.click - 0.05, p: [BTN.x + BTN.w * 0.62, BTN.y + BTN.h * 0.55] },
    { t: 19.6, p: [BTN.x + BTN.w * 0.7, BTN.y + BTN.h * 0.75] },
  ];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i].t) {
      const a = keys[i - 1];
      const b = keys[i];
      const p = EASE.smooth(clamp((t - a.t) / (b.t - a.t)));
      // gentle arc so the path never feels robotic
      const arc = Math.sin(p * Math.PI) * 26;
      return [lerp(a.p[0], b.p[0], p), lerp(a.p[1], b.p[1], p) - arc];
    }
  }
  return keys[keys.length - 1].p;
};

const Cursor: React.FC<{ t: number }> = ({ t }) => {
  const [x, y] = cursorPath(t);
  const press = t > T.click - 0.06 && t < T.click + 0.12 ? 0.85 : 1;
  return (
    <svg
      width={34}
      height={44}
      viewBox="0 0 17 22"
      style={{ position: "absolute", left: x, top: y, transform: `scale(${press})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}
    >
      <path d="M1 1 L1 17 L5.2 13.2 L8.2 20 L11 18.8 L8.1 12.2 L13.6 12.2 Z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
};

// --------------------------------------------------------------- bits ---

const Check: React.FC<{ p: number; size?: number }> = ({ p, size = 28 }) => {
  const pop = p > 0 ? 1 + 0.25 * Math.sin(clamp(p * 1.4) * Math.PI) : 1;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${p > 0 ? COLORS.success : "#D8D1C4"}`,
        background: p > 0 ? COLORS.success : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pop})`,
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 16 16">
        <path
          d="M3 8.5 L6.5 12 L13 4.5"
          fill="none"
          stroke="#fff"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={20}
          strokeDashoffset={20 * (1 - clamp(p * 1.6))}
        />
      </svg>
    </div>
  );
};

const FileCard: React.FC<{ t: number }> = ({ t }) => {
  const dragging = t < T.fileDrop;
  const [cx, cy] = cursorPath(Math.min(t, T.fileDrop));
  const appear = ramp(t, 16.1, 0.3);
  const drop = springAt(t, T.fileDrop, { damping: 13, stiffness: 260 });
  const upload = ramp(t, T.fileDrop + 0.05, T.uploadDone - T.fileDrop - 0.05, EASE.smooth);
  const done = t >= T.uploadDone;
  const x = dragging ? cx - 250 : DROP.x + (DROP.w - 300) / 2;
  const y = dragging ? cy - 70 : DROP.y + (DROP.h - 84) / 2;
  const rot = dragging ? -5 : lerp(-5, 0, drop);
  const scale = dragging ? 1.06 : lerp(1.06, 1, drop);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 300,
        height: 84,
        borderRadius: 16,
        background: "#FFFFFF",
        boxShadow: dragging ? "0 24px 50px rgba(0,0,0,0.22)" : "0 6px 18px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 16px",
        opacity: appear,
        transform: `rotate(${rot}deg) scale(${scale})`,
        fontFamily: FONTS.display,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 48,
          height: 56,
          borderRadius: 10,
          background: COLORS.accent,
          color: COLORS.white,
          fontWeight: 800,
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "-0.02em",
        }}
      >
        AI
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: COLORS.ink, letterSpacing: "-0.01em" }}>kiez-kaffee-logo.ai</div>
        <div style={{ marginTop: 8, height: 6, borderRadius: 6, background: "#EEE8DD", overflow: "hidden" }}>
          <div style={{ width: `${upload * 100}%`, height: "100%", background: done ? COLORS.success : COLORS.accent }} />
        </div>
        <div style={{ marginTop: 6, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.muted }}>
          {done ? "Hochgeladen · 2,4 MB" : `${(upload * 2.4).toFixed(1).replace(".", ",")} / 2,4 MB`}
        </div>
      </div>
    </div>
  );
};

const CHECKS = ["Vektordatei erkannt", "Druckfähigkeit geprüft", "Farben & Proportionen optimiert"];

// ----------------------------------------------------------- preview ---

const PreviewCanvas: React.FC<{ t: number }> = ({ t }) => {
  const ready = useFontsReady();
  const p = ramp(t, PRINT_START, PRINT_DUR, EASE.smooth);
  const tex = usePrintTexture({ id: "blank", u: 0.5 }, { id: "kiez", u: 0.5 }, p, ready);
  const rot = -0.35 + 0.35 * Math.sin((t - 16) * 0.9) + ramp(t, PRINT_START, 1.4, EASE.out) * 0.35;
  const lid = p > 0.2 ? "#101010" : "#F6F4F0";
  if (!ready) return null;
  return (
    <ThreeCanvas
      width={PREVIEW.w}
      height={PREVIEW.h}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={onCreatedGl}
      camera={{ fov: 26, position: [0, 2, 12] }}
    >
      <CameraRig pos={[0, 2.5, 15.2 - ramp(t, 16, 3.5, EASE.soft) * 1.0]} target={[0, 1.85, 0]} fov={26} />
      <Studio />
      <BlobShadow x={0} w={2.3} d={2.1} opacity={0.4} />
      <Cup texture={tex} lidColor={lid} scan={p > 0 && p < 1 ? p : null} rotation={[0, rot, 0]} />
    </ThreeCanvas>
  );
};

const Dimension: React.FC<{ t: number }> = ({ t }) => {
  const p = ramp(t, 18.0, 0.6, EASE.out);
  if (p <= 0) return null;
  const line = "rgba(12,12,13,0.35)";
  const label: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONTS.mono,
    fontSize: 14,
    letterSpacing: "0.08em",
    color: COLORS.mutedDark,
    background: "#F1ECE3",
    padding: "2px 8px",
    borderRadius: 6,
  };
  const cx = PREVIEW.w / 2;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p }}>
      {/* height */}
      <div style={{ position: "absolute", left: cx + 150, top: 196, width: 1.5, height: 318 * p, background: line }} />
      <div style={{ position: "absolute", left: cx + 143, top: 196, width: 16, height: 1.5, background: line }} />
      <div style={{ position: "absolute", left: cx + 143, top: 196 + 318 * p, width: 16, height: 1.5, background: line }} />
      <div style={{ ...label, left: cx + 166, top: 344 }}>110 mm</div>
      {/* diameter */}
      <div style={{ position: "absolute", left: cx - 100, top: 104, width: 200 * p, height: 1.5, background: line }} />
      <div style={{ position: "absolute", left: cx - 100, top: 97, width: 1.5, height: 16, background: line }} />
      <div style={{ position: "absolute", left: cx - 100 + 200 * p, top: 97, width: 1.5, height: 16, background: line }} />
      <div style={{ ...label, left: cx - 44, top: 66 }}>Ø 90 mm</div>
    </div>
  );
};

// ------------------------------------------------------------- scene ---

export const DesignCheck: React.FC = () => {
  const t = useTime();
  // enters with the whip from the right
  const enter = ramp(t, T.whip, 0.5, EASE.out);
  const blur = useDirectionalBlur("check-whip", (1 - enter) * 60);
  const winIn = ramp(t, T.whip + 0.1, 0.9, EASE.out);
  const click = springAt(t, T.click, { damping: 12, stiffness: 300 });
  const approved = t >= T.approved;
  const btnPress = t > T.click - 0.02 && t < T.approved ? 0.96 : 1;
  const ripple = ramp(t, T.click, 0.5, EASE.out);
  const live = 0.5 + 0.5 * Math.sin(t * 8);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        transform: `translateX(${(1 - enter) * WIDTH * 0.9}px)`,
        filter: blur.filter,
      }}
    >
      {blur.defs}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 80% at 72% 50%, rgba(255,184,150,0.35) 0%, rgba(255,184,150,0) 60%), radial-gradient(50% 60% at 10% 90%, rgba(196,154,108,0.18) 0%, rgba(196,154,108,0) 70%)",
        }}
      />

      {/* copy */}
      <div style={{ position: "absolute", left: 120, top: 300, width: 640 }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            letterSpacing: "0.14em",
            color: COLORS.accent,
            opacity: ramp(t, 16.0, 0.4),
          }}
        >
          SCHRITT 01
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FONTS.display,
            fontWeight: 650,
            fontSize: 112,
            lineHeight: 0.98,
            letterSpacing: "-0.055em",
            color: COLORS.ink,
          }}
        >
          <div>
            <Mask p={ramp(t, 16.05, 0.55)}>Digitaler</Mask>
          </div>
          <div>
            <Mask p={ramp(t, 16.15, 0.55)}>
              <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" }}>
                Design-Check
              </span>
              <span style={{ color: COLORS.accent }}>.</span>
            </Mask>
          </div>
        </div>
        <div
          style={{
            marginTop: 34,
            fontFamily: FONTS.display,
            fontSize: 32,
            lineHeight: 1.3,
            letterSpacing: "-0.015em",
            color: COLORS.mutedDark,
          }}
        >
          <Words text="Realitätsnahe Vorschau deines Logos – direkt am Laptop." start={16.35} stagger={0.03} dur={0.5} />
        </div>
      </div>

      {/* window */}
      <div
        style={{
          position: "absolute",
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h,
          perspective: 2000,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 24,
            background: "#FFFFFF",
            boxShadow: "0 50px 120px rgba(60,35,10,0.22), 0 10px 30px rgba(60,35,10,0.10)",
            border: "1px solid rgba(12,12,13,0.06)",
            overflow: "hidden",
            transform: `translateY(${(1 - winIn) * 80}px) rotateY(${interpolate(winIn, [0, 1], [-16, 0])}deg) rotateX(${(1 - winIn) * 6}deg)`,
            transformOrigin: "30% 50%",
            opacity: clamp(winIn * 2),
            position: "relative",
          }}
        >
          {/* title bar */}
          <div
            style={{
              height: BAR,
              borderBottom: "1px solid #EFEAE1",
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              gap: 9,
              background: "#FBFAF7",
            }}
          >
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
            ))}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                marginRight: 60,
                fontFamily: FONTS.display,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.mutedDark,
                letterSpacing: "-0.01em",
              }}
            >
              brandlo · Design-Check
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: ramp(t, 16.3, 0.35) }}>
            <div
              style={{
                position: "absolute",
                left: DROP.x - WIN.x,
                top: DROP.y - WIN.y - 34,
                fontFamily: FONTS.mono,
                fontSize: 14,
                letterSpacing: "0.12em",
                color: COLORS.muted,
              }}
            >
              DEIN LOGO
            </div>
            <div
              style={{
                position: "absolute",
                left: DROP.x - WIN.x,
                top: DROP.y - WIN.y,
                width: DROP.w,
                height: DROP.h,
                borderRadius: 18,
                border: `2px dashed ${t >= T.fileDrop - 0.15 ? COLORS.accent : "#DCD4C6"}`,
                background: t >= T.fileDrop - 0.15 ? "rgba(255,90,31,0.05)" : "#FBFAF7",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontFamily: FONTS.display,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 600, color: COLORS.ink, opacity: t < T.fileDrop ? 1 : 0 }}>Datei hier ablegen</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.muted, letterSpacing: "0.1em", opacity: t < T.fileDrop ? 1 : 0 }}>
                AI · EPS · PDF · PNG
              </div>
            </div>

            <div style={{ position: "absolute", left: DROP.x - WIN.x, top: DROP.y - WIN.y + DROP.h + 34, width: DROP.w }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: "0.12em", color: COLORS.muted, marginBottom: 18 }}>
                DRUCK-CHECK · KOSTENLOS
              </div>
              {CHECKS.map((c, i) => {
                const p = ramp(t, T.checks[i], 0.45, EASE.out);
                return (
                  <div
                    key={c}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      height: 46,
                      fontFamily: FONTS.display,
                      fontSize: 19,
                      fontWeight: 500,
                      color: p > 0 ? COLORS.ink : "#B5AEA2",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <Check p={p} />
                    {c}
                  </div>
                );
              })}
            </div>

            {/* approve button */}
            <div
              style={{
                position: "absolute",
                left: BTN.x - WIN.x,
                top: BTN.y - WIN.y,
                width: BTN.w,
                height: BTN.h,
                borderRadius: 16,
                background: approved ? COLORS.success : COLORS.ink,
                color: COLORS.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                fontFamily: FONTS.display,
                fontSize: 21,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                transform: `scale(${btnPress * (approved ? 1 + 0.04 * Math.sin(clamp((t - T.approved) / 0.3) * Math.PI) : 1)})`,
                overflow: "hidden",
                boxShadow: approved ? "0 12px 30px rgba(31,184,106,0.35)" : "0 10px 24px rgba(12,12,13,0.18)",
              }}
            >
              {click > 0 && ripple < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: BTN.w * 0.62 - 200,
                    top: BTN.h * 0.55 - 200,
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.35)",
                    transform: `scale(${ripple})`,
                    opacity: 1 - ripple,
                  }}
                />
              ) : null}
              {approved ? (
                <>
                  <Check p={ramp(t, T.approved, 0.4)} size={26} />
                  Freigegeben
                </>
              ) : (
                "Design freigeben"
              )}
            </div>

            {/* preview panel */}
            <div
              style={{
                position: "absolute",
                left: PREVIEW.x - WIN.x,
                top: PREVIEW.y - WIN.y,
                width: PREVIEW.w,
                height: PREVIEW.h,
                borderRadius: 18,
                background: "linear-gradient(180deg, #F4F0E9 0%, #E9E2D5 100%)",
                overflow: "hidden",
              }}
            >
              <PreviewCanvas t={t} />
              <Dimension t={t} />
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  color: COLORS.ink,
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: COLORS.accent, opacity: 0.4 + 0.6 * live }} />
                LIVE-VORSCHAU
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 18,
                  top: 18,
                  background: "rgba(255,255,255,0.85)",
                  borderRadius: 999,
                  padding: "8px 16px",
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  color: COLORS.mutedDark,
                }}
              >
                12 OZ · DOPPELWANDIG
              </div>
              {approved ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 22,
                    transform: `translateX(-50%) translateY(${(1 - ramp(t, T.approved, 0.4)) * 20}px)`,
                    opacity: ramp(t, T.approved, 0.3),
                    background: COLORS.ink,
                    color: COLORS.white,
                    borderRadius: 999,
                    padding: "10px 20px",
                    fontFamily: FONTS.display,
                    fontSize: 17,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Druckfreigabe erteilt · Produktion startet
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <FileCard t={t} />

      <Cursor t={t} />
    </AbsoluteFill>
  );
};
