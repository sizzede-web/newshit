import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "../brand";
import { drawBagFace, drawBagSide, drawBowl } from "./designs";
import { useStaticTexture } from "./textures";

export type Vec3 = [number, number, number];

export type Transform = {
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
};

// ---------------------------------------------------------------- studio ---

// Softbox layout of the virtual photo studio: [x, y, z, width, height, intensity]
const SOFTBOXES: [number, number, number, number, number, number][] = [
  [0, 8, 2, 12, 5, 1.6], // top
  [-7, 3, 5, 4, 10, 3.2], // key, left
  [7, 2.5, 4, 2, 9, 0.45], // fill, right
  [5, 3, -7, 3, 10, 2.4], // rim, back right
  [0, 1, 10, 12, 4, 0.3], // front bounce
];

/**
 * Bakes the softboxes into a prefiltered (PMREM) environment map ONCE per
 * canvas. drei's <Environment> re-renders its cube camera every frame, which
 * costs ~2 s per frame in software WebGL; this is the same look for free.
 */
const StudioEnvironment: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const env = useMemo(() => {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color("#000000");
    for (const [x, y, z, w, h, intensity] of SOFTBOXES) {
      const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
      mat.color.setScalar(intensity);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      plane.position.set(x, y, z);
      plane.lookAt(0, 0, 0);
      envScene.add(plane);
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(envScene, 0.02);
    pmrem.dispose();
    envScene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    return rt;
  }, [gl]);
  // assign during render so the very first frame is already lit
  scene.environment = env.texture;
  useLayoutEffect(
    () => () => {
      scene.environment = null;
      env.dispose();
    },
    [scene, env],
  );
  return null;
};

export const Studio: React.FC = () => (
  <>
    <StudioEnvironment />
    <directionalLight position={[-6, 7, 8]} intensity={1.35} />
    <ambientLight intensity={0.06} />
  </>
);

let shadowTex: THREE.CanvasTexture | null = null;
const getShadowTexture = () => {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.7)");
    g.addColorStop(0.65, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
};

/**
 * Soft blob shadow on the floor. Grows lighter and wider as the object lifts
 * off (`height`), so falling products "announce" themselves before landing.
 */
export const BlobShadow: React.FC<{
  x: number;
  z?: number;
  w: number;
  d: number;
  height?: number;
  opacity?: number;
  scale?: number;
}> = ({ x, z = 0, w, d, height = 0, opacity = 0.55, scale = 1 }) => {
  const tex = getShadowTexture();
  if (scale <= 0.001) return null;
  const spread = 1 + height * 0.12;
  const fade = 1 / (1 + height * 0.45);
  const layers = [
    { k: 1.0, o: 0.85 },
    { k: 1.5, o: 0.28 },
  ];
  return (
    <group position={[x + 0.18, 0.004, z - 0.12]}>
      {layers.map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={[w * l.k * spread * scale, d * l.k * spread * scale, 1]} renderOrder={-1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            alphaMap={tex}
            color="#1E130A"
            transparent
            opacity={opacity * l.o * fade}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/** Imperatively poses the default camera every frame (driven by Remotion time). */
export const CameraRig: React.FC<{ pos: Vec3; target: Vec3; fov: number }> = ({ pos, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...pos);
  if (camera.fov !== fov) {
    camera.fov = fov;
  }
  camera.near = 0.1;
  camera.far = 200;
  camera.updateProjectionMatrix();
  camera.lookAt(...target);
  return null;
};

/** Configures renderer colour pipeline for accurate brand colours. */
export const onCreatedGl = ({ gl }: { gl: THREE.WebGLRenderer }) => {
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1.0;
  gl.setClearColor(0x000000, 0);
};

// ------------------------------------------------------------------ cup ---

export const CUP = { h: 3.3, rBottom: 0.9, rTop: 1.35 } as const;
export const cupRadiusAt = (y: number) => CUP.rBottom + (CUP.rTop - CUP.rBottom) * (y / CUP.h);

const lathe = (pts: [number, number][], segments = 128, phiStart = Math.PI) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
    phiStart,
    Math.PI * 2,
  );

const useCupGeometry = () =>
  useMemo(() => {
    const body = lathe([
      [CUP.rBottom, 0.0],
      [CUP.rTop, CUP.h],
    ]);
    const inner = lathe([
      [CUP.rBottom - 0.04, 0.18],
      [CUP.rTop - 0.04, CUP.h],
    ]);
    const lid = lathe(
      [
        [0.0, CUP.h + 0.17],
        [0.95, CUP.h + 0.17],
        [1.02, CUP.h + 0.2],
        [1.07, CUP.h + 0.29],
        [1.24, CUP.h + 0.31],
        [1.34, CUP.h + 0.22],
        [1.43, CUP.h + 0.12],
        [1.45, CUP.h + 0.02],
        [1.43, CUP.h - 0.1],
      ],
      128,
    );
    return { body, inner, lid };
  }, []);

type CupProps = Transform & {
  texture: THREE.Texture;
  lidColor: string;
  showLid?: boolean;
  /** 0..1 print-head position from rim (0) to base (1); null hides the scan ring. */
  scan?: number | null;
};

export const Cup: React.FC<CupProps> = ({
  texture,
  lidColor,
  showLid = true,
  scan = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const geo = useCupGeometry();
  const scanY = scan === null ? null : CUP.h * (1 - scan);
  return (
    <group position={position} scale={scale}>
      <group rotation={rotation}>
        <mesh geometry={geo.body}>
          <meshStandardMaterial map={texture} roughness={0.52} metalness={0} envMapIntensity={0.9} />
        </mesh>
        <mesh geometry={geo.inner}>
          <meshStandardMaterial color="#F3EFE8" roughness={0.7} side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[CUP.rBottom - 0.04, 64]} />
          <meshStandardMaterial color="#EDE8DF" roughness={0.8} />
        </mesh>
        <mesh position={[0, CUP.h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[CUP.rTop, 0.05, 16, 128]} />
          <meshStandardMaterial color="#FAF8F4" roughness={0.45} />
        </mesh>
        {showLid ? (
          <group>
            <mesh geometry={geo.lid}>
              <meshPhysicalMaterial
                color={lidColor}
                roughness={0.32}
                clearcoat={0.7}
                clearcoatRoughness={0.25}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, CUP.h + 0.305, 1.15]} scale={[0.2, 0.03, 0.075]}>
              <sphereGeometry args={[1, 32, 16]} />
              <meshStandardMaterial color="#0A0A0A" roughness={0.6} />
            </mesh>
          </group>
        ) : null}
      </group>
      {scanY !== null ? (
        <group position={[0, scanY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <torusGeometry args={[cupRadiusAt(scanY) + 0.025, 0.016, 12, 160]} />
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[cupRadiusAt(scanY) + 0.03, 0.07, 12, 160]} />
            <meshBasicMaterial
              color={COLORS.accentSoft}
              transparent
              opacity={0.35}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};

// ------------------------------------------------------------------ bag ---

export const BAG = { w: 2.3, h: 2.9, d: 1.3 } as const;

export const Bag: React.FC<Transform & { ready: boolean }> = ({
  ready,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const face = useStaticTexture(1024, 1291, drawBagFace, ready);
  const side = useStaticTexture(460, 1024, drawBagSide, ready);
  const handle = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.5, BAG.h - 0.12, 0),
          new THREE.Vector3(-0.48, BAG.h + 0.5, 0),
          new THREE.Vector3(0, BAG.h + 0.82, 0),
          new THREE.Vector3(0.48, BAG.h + 0.5, 0),
          new THREE.Vector3(0.5, BAG.h - 0.12, 0),
        ]),
        64,
        0.042,
        12,
        false,
      ),
    [],
  );
  const paper = { roughness: 0.78, metalness: 0 };
  return (
    <group position={position} scale={scale}>
      <group rotation={rotation}>
        <mesh position={[0, BAG.h / 2, 0]}>
          <boxGeometry args={[BAG.w, BAG.h, BAG.d]} />
          <meshStandardMaterial attach="material-0" map={side} {...paper} />
          <meshStandardMaterial attach="material-1" map={side} {...paper} />
          <meshStandardMaterial attach="material-2" color="#3A2814" roughness={1} />
          <meshStandardMaterial attach="material-3" color={COLORS.kraft} {...paper} />
          <meshStandardMaterial attach="material-4" map={face} {...paper} />
          <meshStandardMaterial attach="material-5" map={face} {...paper} />
        </mesh>
        <mesh position={[0, BAG.h - 0.09, 0]}>
          <boxGeometry args={[BAG.w + 0.012, 0.18, BAG.d + 0.012]} />
          <meshStandardMaterial color="#B78C5F" {...paper} />
        </mesh>
        <mesh geometry={handle} position={[0, 0, BAG.d / 2 - 0.1]}>
          <meshStandardMaterial color={COLORS.kraftDark} roughness={0.85} />
        </mesh>
        <mesh geometry={handle} position={[0, 0, -BAG.d / 2 + 0.1]}>
          <meshStandardMaterial color={COLORS.kraftDark} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
};

// ----------------------------------------------------------------- bowl ---

export const BOWL = { h: 1.1, rBottom: 0.95, rTop: 1.38 } as const;

const SCOOPS: { p: Vec3; c: string; r: number }[] = [
  { p: [-0.46, BOWL.h + 0.12, 0.12], c: "#BFDC8F", r: 0.56 },
  { p: [0.46, BOWL.h + 0.1, 0.1], c: "#F6A3B8", r: 0.56 },
  { p: [0.0, BOWL.h + 0.5, -0.08], c: "#F8EBCD", r: 0.58 },
];

export const Bowl: React.FC<Transform & { ready: boolean }> = ({
  ready,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const band = useStaticTexture(2560, 420, drawBowl, ready);
  const geo = useMemo(
    () => ({
      body: lathe([
        [BOWL.rBottom, 0],
        [BOWL.rTop, BOWL.h],
      ]),
      inner: lathe([
        [BOWL.rBottom - 0.04, 0.12],
        [BOWL.rTop - 0.04, BOWL.h],
      ]),
    }),
    [],
  );
  if (scale <= 0.001) return null;
  return (
    <group position={position} scale={scale}>
      <group rotation={rotation}>
        <mesh geometry={geo.body}>
          <meshStandardMaterial map={band} roughness={0.5} />
        </mesh>
        <mesh geometry={geo.inner}>
          <meshStandardMaterial color="#F4F0EA" roughness={0.7} side={THREE.BackSide} />
        </mesh>
        <mesh position={[0, BOWL.h, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BOWL.rTop, 0.04, 16, 128]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
        </mesh>
        {SCOOPS.map((s, i) => (
          <mesh key={i} position={s.p} scale={[1, 0.88, 1]}>
            <sphereGeometry args={[s.r, 48, 32]} />
            <meshStandardMaterial color={s.c} roughness={0.88} />
          </mesh>
        ))}
        <mesh position={[0.28, BOWL.h + 0.95, 0.05]} rotation={[0.1, 0.2, -0.35]}>
          <boxGeometry args={[0.16, 0.95, 0.05]} />
          <meshStandardMaterial color="#E2B061" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
