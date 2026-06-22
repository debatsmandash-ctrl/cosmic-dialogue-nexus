import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import milkywayAsset from "@/assets/milkyway_pano.jpg.asset.json";

/**
 * MilkyWaySky — texture-based realistic skybox.
 * Equirectangular panorama (2:1) yang di-wrap ke sphere besar dengan BackSide.
 * Foto seamless tile horizontal — kamera di tengah disc, pita milky way
 * melintang horizon, pusat (bulge) bersinar di satu sisi sesuai posisi awal.
 *
 * Rotasi sphere statis (tilt halus) supaya pita selalu berada di garis horizon
 * pemandangan default. Tambahan PointLight cream + cool blue memberi rim-light
 * realistis pada node 3D agar terasa "diterangi" oleh galaksi.
 */
export function MilkyWaySky({ opacity = 1 }: { opacity?: number }) {
  const tex = useLoader(THREE.TextureLoader, milkywayAsset.url);
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  // Setup texture properties once
  useMemo(() => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);

  // Drift super pelan supaya terasa "hidup" tapi tetap natural (~1 putaran / 8 menit)
  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.0013;
    }
    if (matRef.current) {
      matRef.current.opacity = opacity;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[0, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(8)]}
    >
      {/* Skybox sphere — kamera berada di dalam disc */}
      <mesh frustumCulled={false} scale={[-1, 1, 1]}>
        <sphereGeometry args={[900, 96, 64]} />
        <meshBasicMaterial
          ref={matRef}
          map={tex}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Rim-light: krem core (kanan) + dingin sisi (kiri) */}
      <pointLight position={[320, 30, 80]} intensity={0.55} color="#ffe6c4" distance={680} decay={1.8} />
      <pointLight position={[-300, -20, -60]} intensity={0.35} color="#8aa6d8" distance={560} decay={1.8} />
      <pointLight position={[40, 240, -40]} intensity={0.18} color="#cfd6e4" distance={520} decay={2} />
      {/* Ambient halus supaya bukan totally black di luar core */}
      <ambientLight intensity={0.06} color="#9fb3d4" />
    </group>
  );
}
