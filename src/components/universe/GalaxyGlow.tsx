import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GalaxyGlow — soft volumetric glow disc + bulge halo.
 * Memberi efek "kabut bintang" terus-menerus di plane galaksi, mengisi
 * area di antara partikel supaya disc terasa padat dan bercahaya (seperti
 * glow halus di referensi top-down Milky Way).
 *
 * Implementasi: 2 plane disc additive berisi radial gradient (krem→biru→fade)
 * + 1 bulge sphere glow di pusat.
 */

function makeDiscTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.00, "rgba(255, 235, 200, 0.85)");
  g.addColorStop(0.08, "rgba(255, 220, 170, 0.55)");
  g.addColorStop(0.22, "rgba(200, 180, 220, 0.32)");
  g.addColorStop(0.45, "rgba(140, 160, 220, 0.18)");
  g.addColorStop(0.75, "rgba(80, 110, 180, 0.06)");
  g.addColorStop(1.00, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBulgeTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.00, "rgba(255, 240, 200, 1.0)");
  g.addColorStop(0.20, "rgba(255, 200, 130, 0.55)");
  g.addColorStop(0.55, "rgba(200, 120, 80, 0.20)");
  g.addColorStop(1.00, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function GalaxyGlow() {
  const discTex = useMemo(makeDiscTexture, []);
  const bulgeTex = useMemo(makeBulgeTexture, []);

  const disc1Ref = useRef<THREE.Mesh>(null);
  const disc2Ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (disc1Ref.current) disc1Ref.current.rotation.z += dt * 0.005;
    if (disc2Ref.current) disc2Ref.current.rotation.z -= dt * 0.0035;
  });

  return (
    <group rotation={[THREE.MathUtils.degToRad(6), 0, THREE.MathUtils.degToRad(4)]}>
      {/* Disc glow layer 1 — luas, krem-biru */}
      <mesh ref={disc1Ref} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}>
        <planeGeometry args={[640, 640]} />
        <meshBasicMaterial
          map={discTex}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Disc glow layer 2 — lebih kecil, lebih hangat (counter rotation) */}
      <mesh ref={disc2Ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} renderOrder={-1}>
        <planeGeometry args={[420, 420]} />
        <meshBasicMaterial
          map={discTex}
          color="#ffd8a0"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Bulge glow — bola sprite cahaya krem di pusat (lebih kecil & lembut biar gak "kaset") */}
      <sprite scale={[38, 38, 1]}>
        <spriteMaterial
          map={bulgeTex}
          color="#ffe0a8"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      {/* Bulge inner core glow — kecil & terang tapi tidak ngeblok */}
      <sprite scale={[14, 14, 1]}>
        <spriteMaterial
          map={bulgeTex}
          color="#fff4d0"
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
