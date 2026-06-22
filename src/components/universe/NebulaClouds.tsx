import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * NebulaClouds — billboard sprite H-alpha + OIII nebulae di sepanjang lengan.
 * 16 cloud diposisikan deterministik mengikuti lengan spiral, additive blend.
 * Selalu hadap kamera (sprite), opacity halus supaya tidak mendominasi disc.
 */

function makeNebulaTexture(hue: "pink" | "teal" | "violet"): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  // Beberapa lapisan blob lembut dengan noise
  const palettes: Record<string, [string, string, string]> = {
    pink:   ["rgba(255, 90, 160, 0.70)", "rgba(220, 60, 180, 0.40)", "rgba(120, 30, 110, 0.12)"],
    teal:   ["rgba(80, 220, 220, 0.55)", "rgba(60, 160, 220, 0.32)", "rgba(20, 60, 120, 0.10)"],
    violet: ["rgba(180, 120, 255, 0.55)", "rgba(120, 80, 220, 0.32)", "rgba(40, 30, 100, 0.10)"],
  };
  const [a, b, d] = palettes[hue];
  // Layer 1: blob besar
  const g1 = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g1.addColorStop(0, a);
  g1.addColorStop(0.45, b);
  g1.addColorStop(0.85, d);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);
  // Sub-blob random untuk tekstur cloud
  for (let i = 0; i < 18; i++) {
    const x = size * (0.2 + Math.random() * 0.6);
    const y = size * (0.2 + Math.random() * 0.6);
    const r = 40 + Math.random() * 120;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, a);
    sg.addColorStop(0.6, b);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NebulaClouds({ tier = "desktop" }: { tier?: "desktop" | "mobile" | "tablet" }) {
  const pinkTex   = useMemo(() => makeNebulaTexture("pink"), []);
  const tealTex   = useMemo(() => makeNebulaTexture("teal"), []);
  const violetTex = useMemo(() => makeNebulaTexture("violet"), []);

  const clouds = useMemo(() => {
    const ARMS = 4;
    const ARM_OFFSETS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
    const b = 0.22;
    const a = 6;
    const N = tier === "mobile" ? 6 : 16;
    const seed = 20260622;
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const out: Array<{ pos: [number, number, number]; scale: number; tex: THREE.CanvasTexture; opacity: number }> = [];
    for (let i = 0; i < N; i++) {
      const arm = i % ARMS;
      const r = 35 + rand() * 200;
      const theta = Math.log(Math.max(1, r) / a) / b + ARM_OFFSETS[arm] + (rand() - 0.5) * 0.3;
      const off = (rand() - 0.5) * (5 + r * 0.04);
      const x = r * Math.cos(theta) + Math.cos(theta + Math.PI / 2) * off;
      const z = r * Math.sin(theta) + Math.sin(theta + Math.PI / 2) * off;
      const y = (rand() - 0.5) * 4;
      const pick = rand();
      const tex = pick < 0.55 ? pinkTex : pick < 0.85 ? tealTex : violetTex;
      out.push({
        pos: [x, y, z],
        scale: 22 + rand() * 42,
        tex,
        opacity: 0.28 + rand() * 0.22,
      });
    }
    return out;
  }, [pinkTex, tealTex, violetTex, tier]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.006;
  });

  return (
    <group ref={groupRef} rotation={[THREE.MathUtils.degToRad(6), 0, THREE.MathUtils.degToRad(4)]}>
      {clouds.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale, 1]}>
          <spriteMaterial
            map={c.tex}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
