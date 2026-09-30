import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useFontsReady } from "./lib/fonts";
import type { DesignId } from "./three/designs";
import { Bag, BlobShadow, Bowl, CameraRig, Cup, Studio, onCreatedGl } from "./three/Products";
import { usePrintTexture } from "./three/textures";

export type ShotProps = { product: "cup" | "bag" | "bowl"; design?: DesignId; angle?: number };

const CupShot: React.FC<{ design: DesignId; angle: number; ready: boolean }> = ({ design, angle, ready }) => {
  const tex = usePrintTexture({ id: design, u: 0.5 }, { id: design, u: 0.5 }, 1, ready);
  const lid = design === "kiez" || design === "bergmann" || design === "nordlicht" ? "#121212" : "#F7F5F1";
  return <Cup texture={tex} lidColor={lid} rotation={[0, angle, 0]} />;
};

/** Transparent product "photos" rendered from the same 3D models (used by the 2D scenes). */
export const ProductShot: React.FC<ShotProps> = ({ product, design = "brandlo", angle = -0.25 }) => {
  const { width, height } = useVideoConfig();
  const ready = useFontsReady();
  const framing = {
    cup: { pos: [0, 2.3, 11] as [number, number, number], target: [0, 1.85, 0] as [number, number, number] },
    bag: { pos: [0, 3.0, 13.2] as [number, number, number], target: [0, 1.85, 0] as [number, number, number] },
    bowl: { pos: [0, 3.4, 11.5] as [number, number, number], target: [0, 1.45, 0] as [number, number, number] },
  }[product];
  if (!ready) return null;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} onCreated={onCreatedGl}>
        <CameraRig pos={framing.pos} target={framing.target} fov={26} />
        <Studio />
        {product === "cup" ? (
          <>
            <BlobShadow x={0} w={2.3} d={2.1} opacity={0.5} />
            <CupShot design={design} angle={angle} ready={ready} />
          </>
        ) : null}
        {product === "bag" ? (
          <>
            <BlobShadow x={-0.1} w={2.5} d={1.8} opacity={0.5} />
            <Bag ready={ready} rotation={[0, angle, 0]} />
          </>
        ) : null}
        {product === "bowl" ? (
          <>
            <BlobShadow x={0} w={2.3} d={2.1} opacity={0.45} />
            <Bowl ready={ready} rotation={[0, angle, 0]} scale={1.4} />
          </>
        ) : null}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
