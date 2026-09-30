import { useMemo } from "react";
import * as THREE from "three";
import { DESIGNS, type DesignId, TEX_H, TEX_W } from "./designs";

export type DesignRef = { id: DesignId; u: number };

const cache = new Map<string, HTMLCanvasElement>();

/** Pre-rendered artwork for a design with its logo centred at texture coordinate `u`. */
const designCanvas = (ref: DesignRef) => {
  const u = ((ref.u % 1) + 1) % 1;
  const key = `${ref.id}:${u.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  DESIGNS[ref.id].draw(ctx, u * TEX_W);
  cache.set(key, c);
  return c;
};

const newCanvasTexture = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
};

/**
 * Live cup texture. `progress` 0→1 "prints" design `to` over design `from`
 * from the rim downwards, with a glowing print-head line at the boundary.
 */
export const usePrintTexture = (from: DesignRef, to: DesignRef, progress: number, ready: boolean) => {
  const tex = useMemo(() => newCanvasTexture(TEX_W, TEX_H), []);
  const p = Math.round(progress * 400) / 400;
  const key = `${from.id}:${from.u}|${to.id}:${to.u}|${p}|${ready}`;
  useMemo(() => {
    if (!ready) return;
    const ctx = (tex.image as HTMLCanvasElement).getContext("2d");
    if (!ctx) return;
    const y = TEX_H * p;
    if (p < 1) ctx.drawImage(designCanvas(from), 0, 0);
    if (p > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, TEX_W, y);
      ctx.clip();
      ctx.drawImage(designCanvas(to), 0, 0);
      ctx.restore();
    }
    if (p > 0 && p < 1) {
      const g = ctx.createLinearGradient(0, y - 90, 0, y + 6);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.85, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0.95)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 90, TEX_W, 96);
    }
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return tex;
};

/** Static texture drawn once by `draw`. */
export const useStaticTexture = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ready: boolean,
) => {
  const tex = useMemo(() => newCanvasTexture(w, h), [w, h]);
  useMemo(() => {
    if (!ready) return;
    const ctx = (tex.image as HTMLCanvasElement).getContext("2d");
    if (!ctx) return;
    draw(ctx, w, h);
    tex.needsUpdate = true;
  }, [tex, draw, w, h, ready]);
  return tex;
};
