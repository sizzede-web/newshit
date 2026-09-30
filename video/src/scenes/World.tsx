import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolateColors } from "remotion";
import { BRAND, COLORS, FONTS } from "../brand";
import { Mask, Words, useDirectionalBlur } from "../components/Motion";
import { Wordmark } from "../components/Wordmark";
import { EASE, clamp, ramp } from "../lib/ease";
import { useFontsReady } from "../lib/fonts";
import { useTime } from "../lib/time";
import { HEIGHT, T, WIDTH } from "../timeline";
import { DESIGNS } from "../three/designs";
import { Bag, BlobShadow, Bowl, CameraRig, Cup, Studio, onCreatedGl } from "../three/Products";
import { usePrintTexture } from "../three/textures";
import {
  LINEUP_X,
  PRINT_DUR,
  SIZE_X,
  SWAP_ORDER,
  bagState,
  bowlState,
  cupPrint,
  cupState,
  project,
  sizeBowlState,
  worldCamera,
} from "./world/choreo";

// ------------------------------------------------------------ backdrop ---

const stageColor = (t: number) => {
  if (t < T.designSwaps[0]) return COLORS.accent;
  if (t >= 11.5) {
    const hafen = DESIGNS.hafenblau.stage;
    return interpolateColors(ramp(t, 11.5, 0.6, EASE.inOut), [0, 1], [hafen, COLORS.paper]);
  }
  let color: string = COLORS.accent;
  T.designSwaps.forEach((ts, k) => {
    if (t >= ts) {
      const prev = k === 0 ? COLORS.accent : DESIGNS[SWAP_ORDER[k - 1]].stage;
      color = interpolateColors(ramp(t, ts, 0.22, EASE.out), [0, 1], [prev, DESIGNS[SWAP_ORDER[k]].stage]);
    }
  });
  return color;
};

const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const bg = stageColor(t);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 70% at 50% 42%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%), radial-gradient(120% 90% at 50% 110%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ----------------------------------------------------- 2D: reveal words ---

const RevealBehind: React.FC<{ t: number }> = ({ t }) => {
  // giant wordmark behind the cup, slams in on the drop
  const p = ramp(t, T.drop, 0.5, EASE.out);
  const out = ramp(t, T.revealOut, 0.6, EASE.in);
  if (t < T.drop - 0.05 || out >= 1) return null;
  const scale = 1.25 - 0.25 * p + 0.04 * ramp(t, T.drop, 3.2, EASE.soft) + out * 0.3;
  const drift = -40 * ramp(t, T.drop, 3.3, EASE.soft);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          transform: `translate(${drift}px, -40px) scale(${scale})`,
          opacity: p * (1 - out),
          filter: `blur(${(1 - p) * 18 + out * 24}px)`,
        }}
      >
        <Wordmark size={520} color={COLORS.white} accent={COLORS.ink} />
      </div>
    </AbsoluteFill>
  );
};

const RevealFront: React.FC<{ t: number }> = ({ t }) => {
  const out = ramp(t, T.revealOut, 0.4, EASE.in);
  if (t < T.taglineIn - 0.1 || out >= 1) return null;
  const chip = ramp(t, T.taglineIn + 0.35, 0.5, EASE.out);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 92 }}>
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 600,
          fontSize: 50,
          letterSpacing: "-0.03em",
          color: COLORS.white,
          textAlign: "center",
          opacity: 1 - out,
          transform: `translateY(${out * -30}px)`,
        }}
      >
        <Words text={BRAND.tagline} start={T.taglineIn} stagger={0.05} />
      </div>
      <div
        style={{
          marginTop: 22,
          display: "flex",
          gap: 14,
          opacity: chip * (1 - out),
          transform: `translateY(${(1 - chip) * 20}px)`,
        }}
      >
        {["Kaffeebecher", "Papiertüten", "Eisbecher & Bowls"].map((label) => (
          <div
            key={label}
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: COLORS.white,
              border: "1.5px solid rgba(255,255,255,0.55)",
              borderRadius: 999,
              padding: "10px 20px",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------- 2D: design copy ---

const LINES = ["Dein Logo.", "Deine Farben.", "Dein Design.", "Dein Becher."];

const DesignCopy: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.designLines[0] - 0.1 || t > 12.2) return null;
  const print = cupPrint(t);
  const design = DESIGNS[print.to.id];
  const prevInk = print.index > 0 ? DESIGNS[SWAP_ORDER[print.index - 1]].ink : COLORS.white;
  // the final swap (back to brandlo) happens while the stage fades to paper → dark copy
  const targetInk = print.to.id === "brandlo" ? COLORS.ink : design.ink;
  const ink = interpolateColors(ramp(t, T.designSwaps[Math.max(0, print.index)], 0.22), [0, 1], [prevInk, targetInk]);
  const exit = ramp(t, 11.5, 0.45, EASE.in);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div
        style={{
          position: "absolute",
          left: 1010,
          top: 330,
          width: 860,
          fontFamily: FONTS.display,
          fontWeight: 650,
          fontSize: 148,
          lineHeight: 1,
          letterSpacing: "-0.055em",
          color: ink,
        }}
      >
        {LINES.map((line, i) => {
          const start = T.designLines[i];
          const next = T.designLines[i + 1] ?? 99;
          if (t < start - 0.05 || t > next + 0.4) return null;
          const p = ramp(t, start, 0.5, EASE.out);
          const out = ramp(t, next - 0.12, 0.3, EASE.in);
          const [first, ...rest] = line.split(" ");
          return (
            <div key={line} style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap" }}>
              <Mask p={p} out={out}>
                <span style={{ marginRight: "0.2em" }}>{first}</span>
              </Mask>
              <Mask p={ramp(t, start + 0.07, 0.5, EASE.out)} out={out}>
                <span style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" }}>
                  {rest.join(" ")}
                </span>
              </Mask>
            </div>
          );
        })}
      </div>
      {/* design caption + counter */}
      <div
        style={{
          position: "absolute",
          left: 1016,
          top: 520,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: FONTS.mono,
          fontSize: 22,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: ink,
        }}
      >
        <span style={{ opacity: 0.55 }}>{String(print.index + 1).padStart(2, "0")}/08</span>
        <span style={{ width: 40, height: 1.5, background: ink, opacity: 0.4 }} />
        <span style={{ position: "relative", display: "inline-block", minWidth: 760, height: 30, overflow: "hidden" }}>
          <span
            key={design.id}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `translateY(${(1 - ramp(t, T.designSwaps[Math.max(0, print.index)], 0.35)) * 100}%)`,
            }}
          >
            {design.name} — {design.kind}
          </span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 1016, top: 580, display: "flex", gap: 10 }}>
        {SWAP_ORDER.map((id, i) => {
          const on = i <= print.index;
          const fill = i === print.index ? clamp(print.p) : on ? 1 : 0;
          return (
            <div key={id} style={{ width: 56, height: 4, borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, background: ink, opacity: 0.2 }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: ink }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------- 2D: line-up copy ---

const Label: React.FC<{ t: number; x: number; y: number; start: number; num: string; title: string; sub?: string; outAt: number }> = ({
  t,
  x,
  y,
  start,
  num,
  title,
  sub,
  outAt,
}) => {
  const p = ramp(t, start, 0.55, EASE.out);
  const out = ramp(t, outAt, 0.25, EASE.in);
  if (p <= 0 || out >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 250,
        top: y,
        width: 500,
        textAlign: "center",
        opacity: 1 - out,
        transform: `translateY(${out * 16}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 19,
          letterSpacing: "0.12em",
          color: COLORS.accent,
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
        }}
      >
        {num}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: FONTS.display,
          fontSize: 40,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: COLORS.ink,
        }}
      >
        <Mask p={p}>{title}</Mask>
      </div>
      {sub ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: FONTS.display,
            fontSize: 22,
            color: COLORS.mutedDark,
            opacity: ramp(t, start + 0.15, 0.5),
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const LineupCopy: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.lineupHead - 0.1) return null;
  const headOut = T.sizes - 0.2;
  const labelY = (x: number) => {
    const p = project(t, [x, 0, 0]);
    return { x: p.x, y: p.y + 34 };
  };
  const cup = labelY(LINEUP_X.cup);
  const bag = labelY(LINEUP_X.bag);
  const bowl = labelY(LINEUP_X.bowl);
  const sizes = [
    { k: "s" as const, ml: "100 ml", note: "1–2 Kugeln", start: T.sizeBowls[0] + 0.1 },
    { k: "m" as const, ml: "250 ml", note: "Eisbecher", start: T.sizes + 0.45 },
    { k: "l" as const, ml: "500 ml", note: "Große Bowl", start: T.sizeBowls[1] + 0.1 },
  ];
  return (
    <AbsoluteFill>
      {t < T.sizes + 0.4 ? (
        <div
          style={{
            position: "absolute",
            top: 96,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.display,
            fontWeight: 650,
            fontSize: 84,
            letterSpacing: "-0.05em",
            color: COLORS.ink,
          }}
        >
          <Words
            text="Alles, was über die Theke geht."
            start={T.lineupHead}
            stagger={0.05}
            outAt={headOut}
            outDur={0.22}
            wordStyle={(w) =>
              w === "Theke" || w === "geht."
                ? { fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" }
                : undefined
            }
          />
        </div>
      ) : null}
      <Label t={t} x={cup.x} y={cup.y} start={T.lineupHead + 0.2} num="01" title="Kaffeebecher" sub="8 bis 16 oz" outAt={headOut} />
      <Label t={t} x={bag.x} y={bag.y} start={T.bagLand + 0.1} num="02" title="Papiertüten" sub="Kraft oder weiß" outAt={headOut} />
      <Label t={t} x={bowl.x} y={bowl.y} start={T.bowlLand + 0.1} num="03" title="Eisbecher & Bowls" sub="XS bis XXL" outAt={headOut} />
      {t >= T.sizes ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 96,
              width: "100%",
              textAlign: "center",
              fontFamily: FONTS.display,
              fontWeight: 650,
              fontSize: 84,
              letterSpacing: "-0.05em",
              color: COLORS.ink,
            }}
          >
            <Words
              text="Von XS bis XXL."
              start={T.sizes + 0.2}
              stagger={0.06}
              wordStyle={(w) =>
                w === "XXL." ? { fontFamily: FONTS.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.02em" } : undefined
              }
            />
          </div>
          {sizes.map((s) => {
            const base = project(t, [SIZE_X[s.k], 0, 0]);
            const pos = { x: base.x, y: base.y + 40 };
            const p = ramp(t, s.start, 0.5, EASE.out);
            return (
              <div
                key={s.k}
                style={{
                  position: "absolute",
                  left: pos.x - 150,
                  top: pos.y + 6,
                  width: 300,
                  textAlign: "center",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 18}px)`,
                }}
              >
                <div
                  style={{
                    display: "inline-block",
                    fontFamily: FONTS.display,
                    fontWeight: 650,
                    fontSize: 44,
                    letterSpacing: "-0.04em",
                    color: COLORS.ink,
                  }}
                >
                  {s.ml}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.1em", color: COLORS.muted, textTransform: "uppercase", marginTop: 4 }}>
                  {s.note}
                </div>
              </div>
            );
          })}
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- 3D scene ---

const WorldCanvas: React.FC<{ t: number }> = ({ t }) => {
  const ready = useFontsReady();
  const print = cupPrint(t);
  const tex = usePrintTexture(print.from, print.to, print.p, ready);
  const cam = worldCamera(t);
  const cup = cupState(t);
  const scanning = print.index >= 0 && print.p > 0 && print.p < 1;
  const lidFrom = DESIGNS[print.from.id].lid;
  const lidTo = DESIGNS[print.to.id].lid;
  const lid = interpolateColors(ramp(t, T.designSwaps[Math.max(0, print.index)], PRINT_DUR * 0.4), [0, 1], [lidFrom, lidTo]);
  const bag = bagState(t);
  const bowl = bowlState(t);
  const bowlS = sizeBowlState(t, "s");
  const bowlL = sizeBowlState(t, "l");
  if (!ready) return null;
  return (
    <ThreeCanvas
      width={WIDTH}
      height={HEIGHT}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={onCreatedGl}
      camera={{ fov: 28, position: [0, 2, 12] }}
    >
      <CameraRig pos={cam.pos} target={cam.target} fov={cam.fov} />
      <Studio />
      <BlobShadow x={cup.position[0]} w={2.3} d={2.1} height={cup.position[1]} scale={cup.scale} opacity={0.5} />
      <BlobShadow x={bag.position[0]} w={3.0} d={1.9} height={bag.position[1]} scale={bag.scale} opacity={0.5} />
      <BlobShadow x={bowl.position[0]} w={2.3} d={2.1} height={bowl.position[1]} scale={bowl.scale} opacity={0.45} />
      <BlobShadow x={bowlS.position[0]} w={2.3} d={2.1} scale={bowlS.scale} opacity={0.45} />
      <BlobShadow x={bowlL.position[0]} w={2.3} d={2.1} scale={bowlL.scale} opacity={0.45} />
      {cup.scale > 0.001 ? (
        <Cup texture={tex} lidColor={lid} scan={scanning ? print.p : null} position={cup.position} rotation={cup.rotation} scale={cup.scale} />
      ) : null}
      {bag.scale > 0.001 ? <Bag ready={ready} position={bag.position} rotation={bag.rotation} scale={bag.scale} /> : null}
      <Bowl ready={ready} position={bowl.position} rotation={bowl.rotation} scale={bowl.scale} />
      <Bowl ready={ready} position={bowlS.position} rotation={bowlS.rotation} scale={bowlS.scale} />
      <Bowl ready={ready} position={bowlL.position} rotation={bowlL.rotation} scale={bowlL.scale} />
    </ThreeCanvas>
  );
};

// ---------------------------------------------------------------- scene ---

export const World: React.FC = () => {
  const t = useTime();
  // whip-pan out to the Design-Check scene
  const whip = ramp(t, T.whip, 0.3, EASE.in);
  const blur = useDirectionalBlur("world-whip", whip * 60);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${-whip * WIDTH * 0.9}px)`,
        filter: blur.filter,
      }}
    >
      {blur.defs}
      <Backdrop t={t} />
      <RevealBehind t={t} />
      <WorldCanvas t={t} />
      <RevealFront t={t} />
      <DesignCopy t={t} />
      <LineupCopy t={t} />
    </AbsoluteFill>
  );
};
