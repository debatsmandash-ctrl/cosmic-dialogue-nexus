import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHELL_R } from "@/lib/graph/build";

/**
 * MicroDust — partikel drifting halus di dalam shell (volume bola).
 * Memberi rasa "ada udara" tanpa menabrak garis edge atau node.
 */
export function MicroDust({ density = 700, quality }: { density?: number; quality: string }) {
  const count = quality === "low" ? Math.min(300, density) : quality === "medium" ? Math.min(500, density) : density;

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform inside sphere of radius slightly less than SHELL_R
      const r = Math.cbrt(Math.random()) * (SHELL_R - 6);
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3 + 0] = r * s * Math.cos(t);
      pos[i * 3 + 1] = r * s * Math.sin(t);
      pos[i * 3 + 2] = r * u;
      const b = 0.35 + Math.random() * 0.4;
      col[i * 3 + 0] = b * 0.85;
      col[i * 3 + 1] = b * 0.9;
      col[i * 3 + 2] = b;
      sz[i] = 0.18 + Math.random() * 0.28;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sz, 1));
    return g;
  }, [count]);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012;
  });

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        size={0.5}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.32}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
