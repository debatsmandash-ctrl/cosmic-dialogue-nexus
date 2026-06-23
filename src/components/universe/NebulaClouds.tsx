import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * NebulaClouds → sekarang berperan sebagai DEBU KOSMIK tipis di sekitaran cakram
 * galaksi (warna coklat-krem netral, bukan pink/teal). Soft sprite di plane disc,
 * opacity rendah, additive normal-ish (multiply tipis untuk efek dust band).
 */

function makeDustTexture(tint: "warm" | "cool" | "neutral", seed: number): THREE.CanvasTexture {
  // PRNG kecil supaya tiap tekstur berbeda → tidak terlihat berulang/strip
  let s = (seed * 2654435761) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const palettes: Record<string, [string, string, string]> = {
    warm:    ["rgba(200, 170, 140, 0.42)", "rgba(150, 115, 85, 0.24)", "rgba(60, 40, 30, 0.08)"],
    cool:    ["rgba(150, 165, 195, 0.36)", "rgba(95, 110, 145, 0.20)", "rgba(20, 30, 60, 0.08)"],
    neutral: ["rgba(180, 175, 165, 0.38)", "rgba(120, 115, 110, 0.22)", "rgba(40, 38, 35, 0.08)"],
  };
  const [a, b, d] = palettes[tint];
  // Base soft offcenter glow → patch tidak simetris
  const cx = size * (0.35 + rnd() * 0.30);
  const cy = size * (0.35 + rnd() * 0.30);
  const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55);
  g1.addColorStop(0, a);
  g1.addColorStop(0.45, b);
  g1.addColorStop(0.85, d);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);
  // Banyak sub-blob acak ukuran berbeda untuk wispy FBM look
  const SUB = 60;
  for (let i = 0; i < SUB; i++) {
    const x = size * rnd();
    const y = size * rnd();
    const r = 18 + rnd() * 160;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, rnd() < 0.5 ? a : b);
    sg.addColorStop(0.55, b);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.globalAlpha = 0.18 + rnd() * 0.35;
    ctx.fillRect(0, 0, size, size);
  }
  // Lapisan noise halus untuk break stripe pattern
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (rnd() - 0.5) * 18;
    data[i]   = Math.max(0, Math.min(255, data[i]   + n));
    data[i+1] = Math.max(0, Math.min(255, data[i+1] + n));
    data[i+2] = Math.max(0, Math.min(255, data[i+2] + n));
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NebulaClouds({ tier = "desktop" }: { tier?: "desktop" | "mobile" | "tablet" }) {
  // 8 varian tekstur per palet → distribusi natural, tidak terlihat berulang
  const variants = useMemo(() => {
    const tints: Array<"warm" | "cool" | "neutral"> = ["warm", "cool", "neutral"];
    const out: THREE.CanvasTexture[] = [];
    for (let i = 0; i < 18; i++) out.push(makeDustTexture(tints[i % 3], 7919 + i * 131));
    return out;
  }, []);

  const clouds = useMemo(() => {
    // Banyak patch kecil acak → transisi lighting natural, tidak strip
    const N = tier === "mobile" ? 28 : 90;
    const seed = 20260622;
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const out: Array<{ pos: [number, number, number]; scale: [number, number]; rot: number; tex: THREE.CanvasTexture; opacity: number; color: string }> = [];
    for (let i = 0; i < N; i++) {
      // Distribusi radial dengan power-law (lebih padat di luar bulge, jarang di pinggir)
      const r = 28 + Math.pow(rand(), 0.7) * 260;
      const theta = rand() * Math.PI * 2;
      // Jitter posisi supaya patch tidak ngumpul di lingkaran rapi
      const jit = (3 + r * 0.05);
      const x = r * Math.cos(theta) + (rand() - 0.5) * jit * 2;
      const z = r * Math.sin(theta) + (rand() - 0.5) * jit * 2;
      // Ketebalan vertikal lembut, flares dengan r (dust band tipis)
      const thick = 1.2 + r * 0.022;
      const y = (rand() + rand() + rand() - 1.5) / 1.5 * thick;
      const pick = rand();
      const tex = variants[Math.floor(rand() * variants.length)];
      const color = pick < 0.55 ? "#d8b890" : pick < 0.85 ? "#b8b0a0" : "#9aa8c0";
      // Patch debu ukuran sangat bervariasi → small + medium + large, overlap natural
      const big = rand() < 0.18;
      const sw = big ? 110 + rand() * 140 : 28 + rand() * 90;
      const sh = sw * (0.45 + rand() * 0.45);
      out.push({
        pos: [x, y, z],
        scale: [sw, sh],
        // Rotasi sepenuhnya acak → tidak ada arah dominan / strip
        rot: rand() * Math.PI * 2,
        tex,
        opacity: 0.06 + rand() * 0.12,
        color,
      });
    }
    return out;
  }, [variants, tier]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={groupRef} rotation={[THREE.MathUtils.degToRad(14), 0, THREE.MathUtils.degToRad(4)]}>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale[0], c.scale[1], 1]}>
          <spriteMaterial
            map={c.tex}
            color={c.color}
            rotation={c.rot}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={THREE.NormalBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
