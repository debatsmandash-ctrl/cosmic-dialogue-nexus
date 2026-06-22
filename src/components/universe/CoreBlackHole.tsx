import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useUniverse } from "@/lib/store";

/**
 * CoreBlackHole — Sagittarius-A* style SMBH at galactic centre.
 * Volumetric: opaque event horizon sphere + photon-ring torus + animated
 * accretion disc (custom shader) + thin bipolar jets. Clickable → select root.
 */

const ACCRETION_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ACCRETION_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uColorInner;
  uniform vec3 uColorMid;
  uniform vec3 uColorOuter;
  uniform vec3 uCamPos;

  // hash + value noise
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float fbm(vec2 p){
    float v=0., a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; }
    return v;
  }

  void main() {
    // radial coord (0 = inner edge, 1 = outer edge)
    float r = vUv.y;
    // angular coord
    float ang = vUv.x * 6.2831853;

    // Differential rotation: inner spins faster
    float spin = uTime * (1.2 / (0.22 + r));
    vec2 p = vec2(cos(ang + spin), sin(ang + spin)) * (1.0 + r * 3.0);
    float n  = fbm(p * 2.4 + vec2(uTime*0.15, 0.0));
    float n2 = fbm(p * 6.0 - vec2(0.0, uTime*0.25));
    float swirl = 0.55 + 0.45 * (n*0.7 + n2*0.5);

    // colour: white-hot inner → amber → deep orange-red outer (EHT-style)
    vec3 col = mix(uColorInner, uColorMid, smoothstep(0.0, 0.55, r));
    col      = mix(col,         uColorOuter, smoothstep(0.55, 1.0, r));

    // brightness profile: bright at inner edge, fade to outer
    float bright = pow(1.0 - r, 1.3) * 1.8 + 0.30;
    bright *= swirl;

    // Doppler beaming: sisi mendekat kamera jauh lebih terang (EHT signature)
    vec3 toCam = normalize(uCamPos - vWorldPos);
    float doppler = 0.45 + 0.95 * max(0.0, dot(toCam, vec3(cos(ang+1.57), 0.0, sin(ang+1.57))));
    bright *= doppler;

    // soft alpha at edges
    float alpha = smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.80, r);
    alpha *= 0.95;

    gl_FragColor = vec4(col * bright, alpha);
  }
`;

function AccretionDisc() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorInner: { value: new THREE.Color("#fff4d6") },  // white-hot
    uColorMid:   { value: new THREE.Color("#ffa040") },  // amber
    uColorOuter: { value: new THREE.Color("#c43820") },  // deep orange-red
    uCamPos:     { value: new THREE.Vector3() },
  }), []);

  useFrame((state, dt) => {
    if (matRef.current) {
      uniforms.uTime.value += dt;
      uniforms.uCamPos.value.copy(state.camera.position);
    }
  });

  // ring lies in XZ plane (rotateX -π/2). Two thin layers for subtle thickness.
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0, (i - 0.5) * 0.18]} renderOrder={2}>
          <ringGeometry args={[1.7, 5.5, 256, 1]} />
          <shaderMaterial
            ref={i === 0 ? matRef : undefined}
            vertexShader={ACCRETION_VERT}
            fragmentShader={ACCRETION_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// Fresnel lensing rim — Einstein-ring style halo around the event horizon.
const RIM_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const RIM_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  void main() {
    float f = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), uPower);
    gl_FragColor = vec4(uColor * f * uIntensity, f);
  }
`;

export function CoreBlackHole({ isSelected, isHovered }: { isSelected: boolean; isHovered: boolean }) {
  const select = useUniverse((s) => s.select);
  const hover = useUniverse((s) => s.hover);
  const horizonRef = useRef<THREE.Mesh>(null);
  const photonRingRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (photonRingRef.current) photonRingRef.current.rotation.z += dt * 0.08;
  });

  const horizonScale = isSelected ? 1.15 : isHovered ? 1.07 : 1.0;

  const rimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#ffd5a0") },
    uPower: { value: 2.2 },
    uIntensity: { value: 3.2 },
  }), []);

  // Outer lensing halo — distorsi cahaya gravitasi lebih luas (Einstein ring suggestion)
  const outerRimUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color("#a8c8ff") },
    uPower: { value: 4.5 },
    uIntensity: { value: 1.6 },
  }), []);

  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(18)]}>
      {/* Event horizon — kecil, hitam pekat */}
      <mesh
        ref={horizonRef}
        scale={horizonScale}
        onPointerOver={(e) => { e.stopPropagation(); hover("root"); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { hover(null); document.body.style.cursor = ""; }}
        onClick={(e) => { e.stopPropagation(); select("root"); }}
        renderOrder={3}
      >
        <sphereGeometry args={[1.4, 64, 48]} />
        <meshBasicMaterial color="#000000" depthWrite={true} />
      </mesh>

      {/* Gravitational lensing rim — Fresnel halo tebal (EHT-style bright ring) */}
      <mesh scale={1.22} renderOrder={4}>
        <sphereGeometry args={[1.4, 64, 48]} />
        <shaderMaterial
          vertexShader={RIM_VERT}
          fragmentShader={RIM_FRAG}
          uniforms={rimUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Outer einstein-ring suggestion — biru pucat, jangkauan lebih luas */}
      <mesh scale={1.55} renderOrder={4}>
        <sphereGeometry args={[1.4, 64, 48]} />
        <shaderMaterial
          vertexShader={RIM_VERT}
          fragmentShader={RIM_FRAG}
          uniforms={outerRimUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Photon ring — torus tipis terang di sekitar horizon */}
      <mesh ref={photonRingRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[1.58, 0.07, 16, 256]} />
        <meshBasicMaterial color="#ffe6b8" toneMapped={false} />
      </mesh>
      {/* Outer halo ring sangat halus */}
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[1.74, 0.025, 12, 192]} />
        <meshBasicMaterial color="#ffc890" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      {/* Lensing arc kedua di luar (faint, biru-putih) → kesan pembelokan cahaya */}
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={5}>
        <torusGeometry args={[2.05, 0.012, 12, 192]} />
        <meshBasicMaterial color="#cfe0ff" transparent opacity={0.45} toneMapped={false} />
      </mesh>

      {/* Accretion disc — animated shader */}
      <AccretionDisc />

      {/* Label */}
      <Html center distanceFactor={50} style={{ pointerEvents: "none" }} position={[0, 7, 0]}>
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