import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * NebulaClouds → sekarang berperan sebagai DEBU KOSMIK tipis di sekitaran cakram
 * galaksi (warna coklat-krem netral, bukan pink/teal). Soft sprite di plane disc,
 * opacity rendah, additive normal-ish (multiply tipis untuk efek dust band).
 */

function makeDustTexture(tint: "warm" | "cool" | "neutral"): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const palettes: Record<string, [string, string, string]> = {
    // Debu kosmik real: krem-coklat hangat, biru-abu dingin, abu netral
    warm:    ["rgba(200, 170, 140, 0.55)", "rgba(150, 115, 85, 0.32)", "rgba(60, 40, 30, 0.10)"],
    cool:    ["rgba(150, 165, 195, 0.45)", "rgba(95, 110, 145, 0.25)", "rgba(20, 30, 60, 0.10)"],
    neutral: ["rgba(180, 175, 165, 0.50)", "rgba(120, 115, 110, 0.28)", "rgba(40, 38, 35, 0.10)"],
  };
  const [a, b, d] = palettes[tint];
  const g1 = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g1.addColorStop(0, a);
  g1.addColorStop(0.40, b);
  g1.addColorStop(0.82, d);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);
  // Sub-blob FBM-ish untuk tekstur dust wispy
  for (let i = 0; i < 26; i++) {
    const x = size * (0.2 + Math.random() * 0.6);
    const y = size * (0.2 + Math.random() * 0.6);
    const r = 30 + Math.random() * 140;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, a);
    sg.addColorStop(0.6, b);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NebulaClouds({ tier = "desktop" }: { tier?: "desktop" | "mobile" | "tablet" }) {
  const warmTex    = useMemo(() => makeDustTexture("warm"), []);
  const coolTex    = useMemo(() => makeDustTexture("cool"), []);
  const neutralTex = useMemo(() => makeDustTexture("neutral"), []);

  const clouds = useMemo(() => {
    // Sebar debu mengelilingi cakram galaksi (annulus r=40..260) di plane disc
    const N = tier === "mobile" ? 10 : 28;
    const seed = 20260622;
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const out: Array<{ pos: [number, number, number]; scale: [number, number]; rot: number; tex: THREE.CanvasTexture; opacity: number; color: string }> = [];
    for (let i = 0; i < N; i++) {
      const r = 40 + rand() * 220;
      const theta = rand() * Math.PI * 2;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      // Sangat tipis vertikal — debu di plane disc
      const y = (rand() - 0.5) * (2 + r * 0.012);
      const pick = rand();
      const tex = pick < 0.55 ? warmTex : pick < 0.85 ? neutralTex : coolTex;
      const color = pick < 0.55 ? "#d8b890" : pick < 0.85 ? "#b8b0a0" : "#9aa8c0";
      // Patch debu lebar tapi pipih (skala Y lebih kecil)
      const sw = 60 + rand() * 110;
      const sh = sw * (0.30 + rand() * 0.25);
      out.push({
        pos: [x, y, z],
        scale: [sw, sh],
        rot: theta + Math.PI / 2 + (rand() - 0.5) * 0.4,
        tex,
        opacity: 0.10 + rand() * 0.14,
        color,
      });
    }
    return out;
  }, [warmTex, neutralTex, coolTex, tier]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={groupRef} rotation={[THREE.MathUtils.degToRad(6), 0, THREE.MathUtils.degToRad(4)]}>
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
