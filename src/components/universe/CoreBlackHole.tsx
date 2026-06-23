import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useUniverse } from "@/lib/store";

/**
 * CoreBlackHole — Interstellar Gargantua-style SMBH.
 * Bukan "bola dikasih CD": disc-nya melengkung di atas & bawah event horizon
 * karena lensing gravitasi (dua arc billboard menghadap kamera), photon ring
 * tipis tajam, dan warm-orange envelopment glow.
 */

// ─── Shared shaders ───
const DISC_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Equatorial accretion disc (the "behind/in-front" stripe) — Doppler beaming.
const DISC_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform vec3 uInner;
  uniform vec3 uMid;
  uniform vec3 uOuter;

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.,0.));
    float c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v=0., a=0.5;
    for(int i=0;i<6;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; }
    return v;
  }

  void main() {
    float r = vUv.y;
    float ang = vUv.x * 6.2831853;
    float spin = uTime * (1.6 / (0.22 + r));
    vec2 p = vec2(cos(ang + spin), sin(ang + spin)) * (1.0 + r * 3.5);
    float n  = fbm(p * 2.4 + vec2(uTime * 0.18, 0.0));
    float n2 = fbm(p * 7.5 - vec2(0.0, uTime * 0.30));
    float swirl = 0.45 + 0.55 * (n*0.7 + n2*0.5);

    vec3 col = mix(uInner, uMid, smoothstep(0.0, 0.50, r));
    col      = mix(col,   uOuter, smoothstep(0.50, 1.0, r));

    float bright = pow(1.0 - r, 1.35) * 2.0 + 0.35;
    bright *= swirl;

    // Strong Doppler beaming — sisi mendekat kamera jauh lebih terang
    vec3 toCam = normalize(uCamPos - vWorldPos);
    float dop = 0.30 + 1.55 * max(0.0, dot(toCam, vec3(cos(ang+1.5708), 0.0, sin(ang+1.5708))));
    bright *= dop;

    float alpha = smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.78, r);
    gl_FragColor = vec4(col * bright, alpha * 0.95);
  }
`;

// Lensing arc — the back-half of the disc that bends OVER and UNDER the horizon.
// Billboarded so it always faces camera, half-ring geometry (top/bottom).
const ARC_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uInner;
  uniform vec3 uMid;
  uniform vec3 uOuter;

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p*=2.1;a*=0.5;}return v;}

  void main() {
    float r = vUv.y;             // radial 0..1
    float ang = vUv.x * 3.14159; // half-ring spans 0..π
    vec2 p = vec2(cos(ang*3.0 + uTime*0.4), sin(ang*3.0 + uTime*0.4)) * (1.2 + r*3.0);
    float n = fbm(p * 2.2 + vec2(uTime*0.12, 0.0));
    float swirl = 0.55 + 0.6 * n;

    vec3 col = mix(uInner, uMid, smoothstep(0.0, 0.45, r));
    col      = mix(col,   uOuter, smoothstep(0.45, 1.0, r));

    float bright = pow(1.0 - r, 1.2) * 2.4 + 0.5;
    bright *= swirl;
    // Brightest at the apex of the arc (top of half-ring at ang=π/2)
    bright *= 0.75 + 0.5 * sin(ang);

    float alpha = smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.72, r);
    gl_FragColor = vec4(col * bright, alpha * 0.92);
  }
`;

// Soft warm envelopment glow behind the horizon — fresnel-ish sprite.
function makeGlowTexture(): THREE.CanvasTexture {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0.00, "rgba(255,180,90,0.95)");
  g.addColorStop(0.18, "rgba(255,150,60,0.65)");
  g.addColorStop(0.42, "rgba(220,90,40,0.28)");
  g.addColorStop(0.75, "rgba(120,40,20,0.08)");
  g.addColorStop(1.00, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function EquatorialDisc({ uniforms }: { uniforms: any }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <ringGeometry args={[1.55, 5.0, 320, 1]} />
      <shaderMaterial
        vertexShader={DISC_VERT}
        fragmentShader={DISC_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// One half-ring (upper or lower arc) — billboarded toward camera, simulating
// the back of the disc bent OVER/UNDER the horizon via gravitational lensing.
function LensingArc({ uniforms, flip }: { uniforms: any; flip: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    // Build basis so the ring's local +Z faces the camera, +Y is world up.
    const cam = state.camera.position;
    const forward = new THREE.Vector3(cam.x, 0, cam.z).normalize(); // horizontal toward cam
    const upY = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(upY, forward).normalize();
    const m = new THREE.Matrix4().makeBasis(right, upY, forward);
    meshRef.current.quaternion.setFromRotationMatrix(m);
  });
  // half-ring: thetaStart, thetaLength
  const thetaStart = flip ? Math.PI : 0;
  return (
    <mesh ref={meshRef} renderOrder={4}>
      <ringGeometry args={[1.85, 4.8, 220, 1, thetaStart, Math.PI]} />
      <shaderMaterial
        vertexShader={DISC_VERT}
        fragmentShader={ARC_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function CoreBlackHole({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  const select = useUniverse((s) => s.select);
  const hover = useUniverse((s) => s.hover);
  const photonRingRef = useRef<THREE.Mesh>(null);
  const horizonRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(makeGlowTexture, []);

  const discUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uInner: { value: new THREE.Color("#fff4d6") },
    uMid:   { value: new THREE.Color("#ffa850") },
    uOuter: { value: new THREE.Color("#b03010") },
  }), []);
  const arcUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uInner: { value: new THREE.Color("#fff0c8") },
    uMid:   { value: new THREE.Color("#ffae50") },
    uOuter: { value: new THREE.Color("#c04018") },
  }), []);

  useFrame((state, dt) => {
    discUniforms.uTime.value += dt;
    discUniforms.uCamPos.value.copy(state.camera.position);
    arcUniforms.uTime.value += dt;
    if (photonRingRef.current) photonRingRef.current.rotation.z += dt * 0.06;
  });

  const horizonScale = isSelected ? 1.10 : isHovered ? 1.05 : 1.0;

  return (
    <group>
      {/* Envelopment warm glow behind the horizon — softens lighting */}
      <sprite scale={[14, 14, 1]} renderOrder={0}>
        <spriteMaterial
          map={glowTex}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* Lensing arcs (top + bottom) — disc back-half bent over/under horizon */}
      <LensingArc uniforms={arcUniforms} flip={false} />
      <LensingArc uniforms={arcUniforms} flip={true} />

      {/* Event horizon — black sphere */}
      <mesh
        ref={horizonRef}
        scale={horizonScale}
        onPointerOver={(e) => { e.stopPropagation(); hover("root"); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { hover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); select("root"); }}
        renderOrder={3}
      >
        <sphereGeometry args={[1.2, 64, 48]} />
        <meshBasicMaterial color="#000000" depthWrite={true} />
      </mesh>

      {/* Photon ring — thin sharp lensed light ring around horizon */}
      <mesh ref={photonRingRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[1.42, 0.035, 16, 256]} />
        <meshBasicMaterial color="#fff0c8" toneMapped={false} />
      </mesh>
      {/* Secondary thin photon halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[1.55, 0.014, 12, 192]} />
        <meshBasicMaterial color="#ffd890" transparent opacity={0.85} toneMapped={false} />
      </mesh>

      {/* Equatorial disc — stripe in front of horizon */}
      <EquatorialDisc uniforms={discUniforms} />

      {/* Label */}
      <Html center distanceFactor={50} style={{ pointerEvents: "none" }} position={[0, 6.5, 0]}>
        <div style={{
          fontFamily: "Bebas Neue, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.32em",
          color: "#ffe6c4",
          textShadow: "0 0 10px #ffb070, 0 0 24px #ff8040aa, 0 0 48px #ff604066",
          whiteSpace: "nowrap",
          padding: "2px 12px",
          borderRadius: 4,
          background: "rgba(5,8,15,0.6)",
          border: "1px solid #ffb07044",
        }}>
          DEBATE UNIVERSE
        </div>
      </Html>
    </group>
  );
}