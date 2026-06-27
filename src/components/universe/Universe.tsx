import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";
import { buildGraph, SHELL_R } from "@/lib/graph/build";
import { useUniverse, useSettings } from "@/lib/store";
import type { StarNode, StarEdge, NodeKind } from "@/data/types";
import { MilkyWaySky } from "./MilkyWaySky";
import { HoverEdges } from "./HoverEdges";
import { Universe2D } from "./Universe2D";
import { MicroDust } from "./MicroDust";
import { InterClusterLinks } from "./InterClusterLinks";
import { useDeviceProfile, type DeviceProfile } from "@/hooks/useDeviceProfile";



// ─── Halo texture (shared canvas radial gradient) ───
function makeHaloTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.00, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.85)");
  g.addColorStop(0.40, "rgba(255,255,255,0.35)");
  g.addColorStop(0.70, "rgba(255,255,255,0.08)");
  g.addColorStop(1.00, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Star field with 4 parallax layers (dimmer base for calm space) ───
function StarField() {
  const layers = useMemo(() => {
    const make = (count: number, rMin: number, rMax: number, sizeMin: number, sizeMax: number, brightness: number) => {
      const g = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        const u = Math.random() * 2 - 1;
        const t = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        positions[i * 3 + 0] = r * s * Math.cos(t);
        positions[i * 3 + 1] = r * s * Math.sin(t);
        positions[i * 3 + 2] = r * u;
        // Warna jitter: putih→biru pucat→amber pucat (rendah saturasi)
        const t1 = Math.random();
        if (t1 < 0.6) {
          // putih kebiruan
          colors[i * 3 + 0] = (0.55 + Math.random() * 0.2) * brightness;
          colors[i * 3 + 1] = (0.6 + Math.random() * 0.22) * brightness;
          colors[i * 3 + 2] = (0.7 + Math.random() * 0.2) * brightness;
        } else if (t1 < 0.85) {
          // amber/kuning pucat
          colors[i * 3 + 0] = (0.7 + Math.random() * 0.2) * brightness;
          colors[i * 3 + 1] = (0.55 + Math.random() * 0.2) * brightness;
          colors[i * 3 + 2] = (0.3 + Math.random() * 0.15) * brightness;
        } else {
          // merah redup
          colors[i * 3 + 0] = (0.65 + Math.random() * 0.2) * brightness;
          colors[i * 3 + 1] = (0.32 + Math.random() * 0.15) * brightness;
          colors[i * 3 + 2] = (0.28 + Math.random() * 0.12) * brightness;
        }
        sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
      }
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      return g;
    };
    return [
      // dekat
      { geom: make(1600, 220, 360, 0.7, 1.5, 0.55), speed: 0.010, size: 1.15, opacity: 0.78 },
      // tengah
      { geom: make(2200, 380, 620, 0.4, 1.0, 0.42), speed: 0.006, size: 0.85, opacity: 0.7 },
      // jauh — debu bintang
      { geom: make(2800, 640, 920, 0.25, 0.6, 0.30), speed: 0.0025, size: 0.55, opacity: 0.55 },
      // dust haze (kabut tipis)
      { geom: make(1400, 280, 800, 1.8, 3.4, 0.18), speed: 0.0015, size: 2.4, opacity: 0.25 },
    ];
  }, []);

  const refs = useRef<(THREE.Points<any, any> | null)[]>([]);
  useFrame((_, dt) => {
    refs.current.forEach((p, i) => {
      if (p) p.rotation.y += dt * layers[i].speed;
    });
  });

  return (
    <>
      {layers.map((l, i) => (
        <points key={i} ref={(el) => { refs.current[i] = el; }} geometry={l.geom}>
          <pointsMaterial
            size={l.size}
            sizeAttenuation
            vertexColors
            transparent
            opacity={l.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
    </>
  );
}

// ─── Distant galaxies — gradient sprites di area sangat jauh ───
function Galaxies() {
  const tex = useMemo(() => {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    // spiral-ish elliptical glow
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0.00, "rgba(255,240,220,0.85)");
    g.addColorStop(0.12, "rgba(255,210,180,0.55)");
    g.addColorStop(0.35, "rgba(180,120,200,0.28)");
    g.addColorStop(0.65, "rgba(80,90,180,0.12)");
    g.addColorStop(1.00, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // streak debu (band) untuk efek spiral
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(40,20,60,0.6)";
    ctx.beginPath();
    ctx.ellipse(size/2, size/2, size*0.42, size*0.05, 0, 0, Math.PI*2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  const galaxies = useMemo(() => [
    { pos: [ -880,  340, -1100], scale: 380, rot: 0.6,  color: "#c9a6ff", opacity: 0.42 },
    { pos: [  920, -220, -1200], scale: 520, rot: -0.3, color: "#ffd9a8", opacity: 0.36 },
    { pos: [ -200, -640,  1250], scale: 320, rot: 1.2,  color: "#a8d4ff", opacity: 0.30 },
  ] as const, []);

  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame((_, dt) => {
    refs.current.forEach((s) => { if (s) s.material.rotation += dt * 0.005; });
  });

  return (
    <>
      {galaxies.map((g, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el; }} position={g.pos as any} scale={[g.scale, g.scale * 0.55, 1]}>
          <spriteMaterial
            map={tex}
            color={g.color}
            transparent
            opacity={g.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            rotation={g.rot}
          />
        </sprite>
      ))}
    </>
  );
}

// ─── Globular star clusters (gugusan bintang) — small dense Points blobs ───
function StarClusters() {
  const clusters = useMemo(() => {
    const make = (cx: number, cy: number, cz: number, n: number, spread: number) => {
      const g = new THREE.BufferGeometry();
      const positions = new Float32Array(n * 3);
      const colors = new Float32Array(n * 3);
      const sizes = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        // gaussian-ish falloff: sum 3 randoms
        const dx = (Math.random()+Math.random()+Math.random()-1.5)/1.5;
        const dy = (Math.random()+Math.random()+Math.random()-1.5)/1.5;
        const dz = (Math.random()+Math.random()+Math.random()-1.5)/1.5;
        positions[i*3+0] = cx + dx * spread;
        positions[i*3+1] = cy + dy * spread;
        positions[i*3+2] = cz + dz * spread;
        const b = 0.4 + Math.random() * 0.4;
        colors[i*3+0] = b * (0.7 + Math.random()*0.3);
        colors[i*3+1] = b * (0.75 + Math.random()*0.25);
        colors[i*3+2] = b * (0.85 + Math.random()*0.15);
        sizes[i] = 0.4 + Math.random() * 0.8;
      }
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      return g;
    };
    return [
      make(-620,  280,  -780, 220, 28),
      make( 700, -120,  -880, 180, 24),
      make(-340, -460,   820, 160, 22),
      make( 480,  520,   720, 140, 20),
      make( -50,  700,  -640, 120, 18),
    ];
  }, []);
  return (
    <>
      {clusters.map((g, i) => (
        <points key={i} geometry={g}>
          <pointsMaterial size={0.9} sizeAttenuation vertexColors transparent opacity={0.62} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      ))}
    </>
  );
}

// ─── Edge line ───
function Edge({ a, b, color, dashed, dim, lit }: { a: StarNode; b: StarNode; color: string; dashed: boolean; dim: boolean; lit: boolean }) {
  const line = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...a.pos),
      new THREE.Vector3(...b.pos),
    ]);
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 1.4, gapSize: 1.0, transparent: true, opacity: lit ? 0.9 : dim ? 0.03 : 0.13 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: lit ? 1.0 : dim ? 0.04 : 0.22 });
    const l = new THREE.Line(geom, mat);
    if (dashed) l.computeLineDistances();
    return l;
  }, [a.pos, b.pos, color, dashed, lit, dim]);

  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);

  return <primitive object={line} />;
}

// ─── Label distance thresholds per kind ───
const LABEL_THRESHOLDS: Record<NodeKind, number> = {
  root: 99999,
  cluster: 320,
  subhub: 180,
  domain: 140,
  bab: 70,
  subbab: 28,
  role: 90,
  roleskill: 36,
  style: 110,
  motion: 32,
  jenis: 100,
  vocab: 30,
  section: 80,
  school: 130,
  team: 70,
  speaker: 30,
  bracket: 110,
  letter: 90,
};

// ─── Star node ───
function StarNodeMesh({ node, isSelected, isHovered, isLit, isDim, haloTex, profile, starSize, highContrast, showAllHovers, pulseGlowOnHover }: {
  node: StarNode; isSelected: boolean; isHovered: boolean; isLit: boolean; isDim: boolean; haloTex: THREE.Texture; profile: DeviceProfile; starSize: number; highContrast: boolean; showAllHovers: boolean; pulseGlowOnHover: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const hover = useUniverse((s) => s.hover);
  const select = useUniverse((s) => s.select);

  const baseSize = (0.08 + node.size * 1.0) * starSize;
  const segs = baseSize > 0.25 ? profile.starSegments + 6 : baseSize > 0.12 ? profile.starSegments : Math.max(12, profile.starSegments - 6);

  const imp = node.importance ?? 0.4;
  const baseEmissive = 1.6 + imp * 2.6;
  const hasOwnLight = profile.tier === "desktop" && imp >= 0.7;
  const pulses = !!node.pulse;

  const [labelVisible, setLabelVisible] = useState(node.kind === "root" || node.kind === "cluster");
  const lastCheck = useRef(0);
  const threshold = LABEL_THRESHOLDS[node.kind] ?? 40;
  const nodePos = useMemo(() => new THREE.Vector3(...node.pos), [node.pos]);
  const isHub = node.kind === "root" || node.kind === "cluster" || node.kind === "subhub";

  useFrame((state, dt) => {
    if (meshRef.current) {
      const target = (isSelected || isHovered) ? 1.55 : pulses ? 1.0 + Math.sin(state.clock.elapsedTime * 2.4) * 0.18 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), Math.min(1, dt * 6));
    }
    if (lightRef.current && hasOwnLight) {
      const flick = 0.92 + Math.sin(state.clock.elapsedTime * (1.2 + imp) + node.pos[0]) * 0.08;
      lightRef.current.intensity = imp * 1.4 * flick * (pulses ? 1.6 : 1);
    }
    if (ringRef.current && pulseGlowOnHover && (isSelected || isHovered)) {
      const k = 1 + (Math.sin(state.clock.elapsedTime * 3.4) * 0.5 + 0.5) * 0.5;
      ringRef.current.scale.setScalar(k);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - (k - 1) * 1.3);
    }
    lastCheck.current += dt;
    if (lastCheck.current > 0.2) {
      lastCheck.current = 0;
      const d = state.camera.position.distanceTo(nodePos);
      const forceMulti = showAllHovers && (isHub || baseSize > 0.13);
      const shouldShow = d < threshold || isHovered || isSelected || forceMulti;
      if (shouldShow !== labelVisible) setLabelVisible(shouldShow);
    }
  });

  const emissive = node.color;
  const opacity = isDim ? 0.22 : 1;
  const haloBoost = 1 + imp * 0.6;

  return (
    <group position={node.pos}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); hover(node.id); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { hover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); select(node.id); }}
      >
        <sphereGeometry args={[baseSize, segs, segs]} />
        <meshPhysicalMaterial
          color={emissive}
          emissive={emissive}
          emissiveIntensity={isSelected ? baseEmissive + 2.5 : (isHovered || isLit) ? baseEmissive + 1.2 : baseEmissive}
          transparent
          opacity={opacity}
          roughness={0.18}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
      {pulseGlowOnHover && (isSelected || isHovered) && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseSize * 2.6, baseSize * 2.9, 48]} />
          <meshBasicMaterial color={emissive} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      {hasOwnLight && (
        <pointLight
          ref={lightRef}
          color={emissive}
          intensity={imp * 1.4}
          distance={pulses ? 60 : 24 + imp * 24}
          decay={2}
        />
      )}
      <sprite scale={[baseSize * 6 * haloBoost, baseSize * 6 * haloBoost, 1]}>
        <spriteMaterial map={haloTex} color={emissive} transparent opacity={isDim ? 0.05 : 0.55 + imp * 0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {profile.haloLayers > 1 && (
        <sprite scale={[baseSize * 16 * haloBoost, baseSize * 16 * haloBoost, 1]}>
          <spriteMaterial map={haloTex} color={emissive} transparent opacity={isDim ? 0.02 : 0.22 + imp * 0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
      {labelVisible && (
        <Html
          center
          distanceFactor={isHub ? (node.kind === "root" ? 70 : node.kind === "cluster" ? 50 : 35) : 18}
          style={{ pointerEvents: "none" }}
          zIndexRange={[20, 0]}
          occlude={false}
        >
          <div
            style={{
              fontFamily: isHub ? "Bebas Neue, sans-serif" : "DM Sans, sans-serif",
              fontSize: node.kind === "root" ? 26 : node.kind === "cluster" ? 18 : node.kind === "subhub" ? 16 : 12,
              fontWeight: isHub ? 700 : 500,
              letterSpacing: isHub ? "0.22em" : "0.05em",
              color: emissive,
              textShadow: highContrast
                ? `0 0 2px #000, 0 0 4px #000, 0 0 8px #000, 0 0 18px ${emissive}`
                : `0 0 12px ${emissive}, 0 0 28px ${emissive}aa, 0 0 50px ${emissive}66`,
              whiteSpace: "nowrap",
              padding: "2px 10px",
              borderRadius: 4,
              background: highContrast ? "rgba(0,0,0,0.85)" : "rgba(5,8,15,0.6)",
              border: `1px solid ${emissive}44`,
              transform: `translateY(${baseSize * 28}px)`,
              opacity: isDim ? 0.4 : showAllHovers && !isHovered && !isSelected ? 0.55 : 1,
              transition: "opacity 180ms",
            }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
}


// ─── Camera flyer / Rover ───
function CameraController({ targetId, profile, autoRotate, autoRotateSpeed, damping, preset }: {
  targetId: string | null; profile: DeviceProfile; autoRotate: boolean; autoRotateSpeed: number; damping: number;
  preset: "free" | "orbit" | "top" | "tour";
}) {
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const graph = useMemo(() => buildGraph(), []);
  const [interacting, setInteracting] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => {
      setInteracting(true);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
    const onEnd = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setInteracting(false), 3000);
    };
    c.addEventListener?.("start", onStart);
    c.addEventListener?.("end", onEnd);
    return () => {
      c.removeEventListener?.("start", onStart);
      c.removeEventListener?.("end", onEnd);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Camera preset transitions (Rover)
  useEffect(() => {
    if (!controls.current) return;
    const CAM_R = SHELL_R * 3.2; // ≈ 198
    let dest: THREE.Vector3 | null = null;
    let look = new THREE.Vector3(0, 0, 0);
    if (preset === "top") dest = new THREE.Vector3(0, CAM_R, 0.001);
    else if (preset === "orbit") dest = new THREE.Vector3(CAM_R, CAM_R * 0.35, CAM_R * 0.6);
    else if (preset === "free") dest = null;
    // "tour" handled by animation tick below
    if (dest) {
      const startCam = camera.position.clone();
      let t = 0;
      const tick = () => {
        t += 1 / 60;
        const k = Math.min(1, t / 1.4);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(startCam, dest!, e);
        controls.current?.target.lerp(look, e);
        controls.current?.update();
        if (k < 1) requestAnimationFrame(tick);
      };
      tick();
    }
  }, [preset, camera]);

  // Tour mode: orbit the shell autonomously around 4 waypoints.
  useFrame((_, dt) => {
    if (preset !== "tour" || !controls.current) return;
    const CAM_R = SHELL_R * 3.0;
    const t = performance.now() * 0.00012; // slow
    const x = Math.cos(t) * CAM_R;
    const z = Math.sin(t) * CAM_R;
    const y = Math.sin(t * 0.7) * CAM_R * 0.55;
    camera.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, dt * 1.2));
    controls.current.target.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, dt * 1.2));
    controls.current.update();
  });

  useEffect(() => {
    if (!targetId) return;
    const node = graph.byId.get(targetId);
    if (!node) return;
    const target = new THREE.Vector3(...node.pos);
    const dir = target.clone().sub(new THREE.Vector3(0, 0, 0)).normalize();
    const offset =
      node.kind === "root" ? SHELL_R * 3.0 :
      node.kind === "cluster" ? 44 :
      node.kind === "subhub" ? 28 :
      node.kind === "domain" ? 22 : 14;
    const camTarget = target.clone().add(dir.multiplyScalar(offset));
    const startCam = camera.position.clone();
    const startLook = (controls.current?.target as THREE.Vector3 | undefined)?.clone() ?? new THREE.Vector3();

    let t = 0;
    const duration = 1.2;
    const tick = () => {
      t += 1 / 60;
      const k = Math.min(1, t / duration);
      const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(startCam, camTarget, ease);
      if (controls.current) {
        const newLook = startLook.clone().lerp(target, ease);
        controls.current.target.copy(newLook);
        controls.current.update();
      }
      if (k < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [targetId, camera, graph]);

  const presetAutoRotate = preset === "orbit" || (autoRotate && preset === "free" && !interacting && !targetId);
  const presetRotateSpeed = preset === "orbit" ? Math.max(0.35, autoRotateSpeed * 1.4) : autoRotateSpeed;

  return (
    <OrbitControls
      ref={controls}
      enablePan={preset === "free"}
      enableZoom
      enableRotate={preset !== "tour"}
      enableDamping
      dampingFactor={damping}
      zoomToCursor
      zoomSpeed={0.8}
      rotateSpeed={profile.rotateSpeed}
      panSpeed={0.7}
      maxDistance={SHELL_R * 6}
      minDistance={3}
      autoRotate={presetAutoRotate}
      autoRotateSpeed={presetRotateSpeed}
    />
  );
}


// ─── Scene contents ───
function Scene({ profile }: { profile: DeviceProfile }) {
  const graph = useMemo(() => buildGraph(), []);
  const selectedId = useUniverse((s) => s.selectedId);
  const hoveredId = useUniverse((s) => s.hoveredId);
  const select = useUniverse((s) => s.select);
  const setLoaded = useUniverse((s) => s.setLoaded);
  const settings = useSettings();
  const quality = settings.quality;
  const qScale = quality === "low" ? 0.45 : quality === "medium" ? 0.7 : quality === "high" ? 0.9 : 1.0;
  const crustShells = quality === "low" ? 1 : quality === "medium" ? 1 : 2;
  const crustOctaves = quality === "low" ? 3 : quality === "medium" ? 4 : quality === "high" ? 5 : 6;
  const bloomEnabled = quality !== "low";

  const haloTex = useMemo(() => makeHaloTexture(), []);

  useEffect(() => { setLoaded(true); }, [setLoaded]);
  useEffect(() => () => { haloTex.dispose(); }, [haloTex]);

  const litSet = useMemo(() => {
    const s = new Set<string>();
    const activeId = selectedId ?? hoveredId;
    if (activeId) {
      s.add(activeId);
      const ns = graph.neighbors.get(activeId);
      if (ns) for (const n of ns) s.add(n);
    }
    return s;
  }, [selectedId, hoveredId, graph]);

  const anyActive = !!(selectedId ?? hoveredId);

  return (
    <>
      {/* Lighting global — boosted di ULTRA agar node sisi jauh bola tetap terlihat */}
      <ambientLight intensity={quality === "ultra" ? 0.22 : quality === "high" ? 0.18 : 0.14} />
      <pointLight position={[0, 0, 0]} intensity={quality === "ultra" ? 0.85 : 0.5} color="#d8b27a" distance={quality === "ultra" ? 520 : 260} />
      <pointLight position={[140, 80, -80]} intensity={quality === "ultra" ? 0.45 : 0.28} color="#00ffc8" distance={quality === "ultra" ? 560 : 360} />
      <pointLight position={[-140, -60, 100]} intensity={quality === "ultra" ? 0.38 : 0.22} color="#8aa6d8" distance={quality === "ultra" ? 520 : 320} />
      <pointLight position={[60, -120, 60]} intensity={quality === "ultra" ? 0.28 : 0.16} color="#38bdf8" distance={quality === "ultra" ? 500 : 300} />

      <StarField />
      {profile.tier === "desktop" && <Galaxies />}
      <StarClusters />
      <MilkyWaySky opacity={settings.nebulaOpacity} />

      <group>
        {graph.edges.map((e: StarEdge, i: number) => {
          if (e.kind === "link") return null; // hover-only
          const a = graph.byId.get(e.a);
          const b = graph.byId.get(e.b);
          if (!a || !b) return null;
          const lit = anyActive && (litSet.has(a.id) && litSet.has(b.id));
          const dim = anyActive && !lit;
          return (
            <Edge
              key={`e-${i}`}
              a={a}
              b={b}
              color={e.color || "#ffffff"}
              dashed={e.strength === "weak"}
              lit={lit}
              dim={dim}
            />
          );
        })}
      </group>

      {settings.showHoverEdges && <HoverEdges graph={graph} activeId={selectedId ?? hoveredId} />}

      <group>
        {graph.nodes.map((n) => (
          <StarNodeMesh
            key={n.id}
            node={n}
            isSelected={selectedId === n.id}
            isHovered={hoveredId === n.id}
            isLit={litSet.has(n.id)}
            isDim={anyActive && !litSet.has(n.id)}
            haloTex={haloTex}
            profile={profile}
            starSize={settings.starSize}
            highContrast={settings.highContrastLabels}
            showAllHovers={settings.showAllHovers}
            pulseGlowOnHover={settings.pulseGlowOnHover}
          />
        ))}
      </group>

      {settings.microDust && <MicroDust density={settings.microDustDensity} quality={quality} />}
      {settings.interClusterLinks && <InterClusterLinks graph={graph} />}


      <CameraController
        targetId={selectedId}
        profile={profile}
        autoRotate={settings.autoRotate && !settings.reducedMotion}
        autoRotateSpeed={settings.autoRotateSpeed}
        damping={settings.damping}
        preset={settings.cameraPreset}
      />


      <mesh onPointerMissed={() => select(null)} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </mesh>

      {bloomEnabled && (
        <EffectComposer multisampling={quality === "ultra" ? 4 : 0}>
          <Bloom intensity={profile.bloomIntensity * settings.bloomIntensity * qScale} luminanceThreshold={0.32} luminanceSmoothing={0.7} mipmapBlur radius={profile.bloomRadius} />
          {profile.chromaticAberration && quality === "ultra" ? (
            <ChromaticAberration offset={[0.0008, 0.0008]} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
          ) : <></>}
        </EffectComposer>
      )}
      <FrameLimiter fpsCap={settings.fpsCap} />
    </>
  );
}

function FrameLimiter({ fpsCap }: { fpsCap: number }) {
  const { invalidate } = useThree();
  useEffect(() => {
    if (!fpsCap) return;
    const interval = 1000 / fpsCap;
    const id = window.setInterval(() => invalidate(), interval);
    return () => window.clearInterval(id);
  }, [fpsCap, invalidate]);
  return null;
}

function FpsCounter() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0; last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{
      position: "fixed", bottom: 18, left: 18, zIndex: 25,
      fontFamily: "Space Mono", fontSize: 11, letterSpacing: "0.15em",
      color: fps >= 50 ? "#00ffc8" : fps >= 30 ? "#fde047" : "#fb7185",
      padding: "4px 10px", borderRadius: 4,
      background: "rgba(11,18,32,0.7)", border: "1px solid rgba(168,85,247,0.25)",
      backdropFilter: "blur(8px)",
    }}>{fps} FPS</div>
  );
}

export function Universe() {
  const profile = useDeviceProfile();
  const fpsCap = useSettings((s) => s.fpsCap);
  const showFps = useSettings((s) => s.showFps);
  const viewMode = useSettings((s) => s.viewMode);
  const shellThickness = useSettings((s) => s.shellThickness);
  // Sync shell-thickness into global so build.ts picks it up on next graph build.
  useEffect(() => {
    (globalThis as any).__SHELL_THICK__ = shellThickness;
    import("@/lib/graph/build").then((m) => m.invalidateGraphCache());
  }, [shellThickness]);
  if (viewMode === "2d") {
    return (
      <>
        <Universe2D />
        {showFps && <FpsCounter />}
      </>
    );
  }

  return (
    <>
    <Canvas
      camera={{ position: [0, SHELL_R * 0.7, SHELL_R * 3.2], fov: 58, near: 0.1, far: 2400 }}
      dpr={profile.dpr}
      frameloop={fpsCap ? "demand" : "always"}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.85,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
    >
      <color attach="background" args={["#05080f"]} />
      <fog attach="fog" args={["#05080f", 380, 1100]} />
      <Suspense fallback={null}>
        <Scene profile={profile} />
      </Suspense>
    </Canvas>
    {showFps && <FpsCounter />}
    </>
  );
}
