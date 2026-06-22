import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GalaxyVolume — volumetric Milky-Way star populations:
 *   • bulge (dense central spheroid)
 *   • thin disc with 4 logarithmic spiral arms
 *   • thick disc (older, scattered)
 *   • spherical stellar halo
 *   • dust lane particles (dark) interleaved in the disc
 *
 * All particles are THREE.Points layers (1 draw call each), with per-vertex
 * colour & size. A soft-circle shader keeps stars round at any size.
 */

// gaussian via Box-Muller
function gauss(): number {
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Stellar colour by spectral class (rough)
function pickStellarColor(): [number, number, number] {
  const r = Math.random();
  if (r < 0.10) return [0.62, 0.72, 1.0];   // O/B blue
  if (r < 0.40) return [0.95, 0.96, 1.0];   // A/F white
  if (r < 0.78) return [1.0, 0.92, 0.7];    // G/K yellow
  return [1.0, 0.65, 0.45];                 // M red
}
function pickBulgeColor(): [number, number, number] {
  const r = Math.random();
  if (r < 0.7) return [1.0, 0.86, 0.55];
  return [1.0, 0.65, 0.40];
}

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uPixelRatio;
  uniform float uSizeScale;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (300.0 / -mv.z);
  }
`;
const STAR_FRAG = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    // soft disc with bright core
    float a = smoothstep(0.5, 0.0, r);
    a = pow(a, 1.6);
    gl_FragColor = vec4(vColor, a * uOpacity);
  }
`;

// Dark dust particles — use multiplicative blending to darken behind
const DUST_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uOpacity;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.05, r);
    gl_FragColor = vec4(0.04, 0.025, 0.015, a * uOpacity);
  }
`;

function makeLayer(
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return g;
}

function genBulge(n: number) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const siz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Hernquist-ish: r = a * x / (1 - x), clamp
    const a = 7;
    const x = Math.random() * 0.92;
    const r = a * x / (1 - x);
    // direction on sphere, then squash y slightly (3D bulge ratio 1.6:1.6:1.0)
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i*3+0] = r * s * Math.cos(t);
    pos[i*3+1] = r * u * 0.62;
    pos[i*3+2] = r * s * Math.sin(t);
    const [cr, cg, cb] = pickBulgeColor();
    const b = 0.55 + Math.random() * 0.45;
    col[i*3+0] = cr * b;
    col[i*3+1] = cg * b;
    col[i*3+2] = cb * b;
    siz[i] = 0.7 + Math.random() * 1.2;
  }
  return makeLayer(pos, col, siz);
}

function genThinDisc(n: number) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const siz = new Float32Array(n);
  const ARMS = 4;
  const ARM_OFFSETS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const b = 0.22; // tightness of spiral
  for (let i = 0; i < n; i++) {
    // radial position — denser inside, fade outward
    const r = 14 + Math.pow(Math.random(), 0.55) * 220;
    // pick arm
    const arm = i % ARMS;
    // theta from r so it follows arm: r = a*exp(b*theta) → theta = ln(r/a)/b
    const a = 6;
    const armTheta = Math.log(Math.max(1, r) / a) / b + ARM_OFFSETS[arm];
    // transverse spread (perpendicular to arm) — wider at larger r
    const armSpread = 4 + r * 0.08;
    const offsetA = gauss() * armSpread;
    // convert (r, theta) + transverse offset to Cartesian
    const x = r * Math.cos(armTheta) + Math.cos(armTheta + Math.PI / 2) * offsetA;
    const z = r * Math.sin(armTheta) + Math.sin(armTheta + Math.PI / 2) * offsetA;
    // vertical thickness flares slightly with r
    const scaleHeight = 1.8 + r * 0.018;
    const y = gauss() * scaleHeight;
    pos[i*3+0] = x;
    pos[i*3+1] = y;
    pos[i*3+2] = z;
    // colour: bias toward blue on outer arms (young stars), warmer inside
    let cr: number, cg: number, cb: number;
    if (r > 70 && Math.random() < 0.35) {
      [cr, cg, cb] = [0.65, 0.78, 1.0];
    } else {
      [cr, cg, cb] = pickStellarColor();
    }
    const brightness = 0.55 + Math.random() * 0.45;
    col[i*3+0] = cr * brightness;
    col[i*3+1] = cg * brightness;
    col[i*3+2] = cb * brightness;
    siz[i] = 0.45 + Math.random() * 0.9;
  }
  return makeLayer(pos, col, siz);
}

function genThickDisc(n: number) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const siz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 18 + Math.pow(Math.random(), 0.7) * 180;
    const t = Math.random() * Math.PI * 2;
    const x = r * Math.cos(t);
    const z = r * Math.sin(t);
    const y = gauss() * 8;
    pos[i*3+0] = x; pos[i*3+1] = y; pos[i*3+2] = z;
    // older population: orange-yellow
    const cr = 1.0, cg = 0.78 + Math.random()*0.1, cb = 0.55 + Math.random()*0.1;
    const b = 0.35 + Math.random() * 0.35;
    col[i*3+0] = cr * b; col[i*3+1] = cg * b; col[i*3+2] = cb * b;
    siz[i] = 0.35 + Math.random() * 0.6;
  }
  return makeLayer(pos, col, siz);
}

function genHalo(n: number) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const siz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // power-law: more stars inside, sparse halo outside
    const r = 60 + Math.pow(Math.random(), 0.4) * 240;
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i*3+0] = r * s * Math.cos(t);
    pos[i*3+1] = r * u;
    pos[i*3+2] = r * s * Math.sin(t);
    const b = 0.25 + Math.random() * 0.3;
    col[i*3+0] = 0.95 * b;
    col[i*3+1] = 0.85 * b;
    col[i*3+2] = 0.7  * b;
    siz[i] = 0.3 + Math.random() * 0.4;
  }
  return makeLayer(pos, col, siz);
}

function genDustLanes(n: number) {
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3); // unused, but keep attribute count consistent
  const siz = new Float32Array(n);
  const ARMS = 4;
  const ARM_OFFSETS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const b = 0.22;
  for (let i = 0; i < n; i++) {
    const r = 16 + Math.pow(Math.random(), 0.6) * 200;
    const arm = i % ARMS;
    // place dust just _inside_ the arm (slight phase offset) so it reads as silhouette
    const a = 6;
    const armTheta = Math.log(Math.max(1, r) / a) / b + ARM_OFFSETS[arm] - 0.18;
    const armSpread = 3 + r * 0.06;
    const offsetA = gauss() * armSpread;
    const x = r * Math.cos(armTheta) + Math.cos(armTheta + Math.PI / 2) * offsetA;
    const z = r * Math.sin(armTheta) + Math.sin(armTheta + Math.PI / 2) * offsetA;
    // very thin slab
    const y = gauss() * 1.2;
    pos[i*3+0] = x; pos[i*3+1] = y; pos[i*3+2] = z;
    col[i*3+0] = 0; col[i*3+1] = 0; col[i*3+2] = 0;
    siz[i] = 1.4 + Math.random() * 2.2;
  }
  return makeLayer(pos, col, siz);
}

function genGlobulars() {
  const blobs: { center: [number,number,number]; geom: THREE.BufferGeometry }[] = [];
  const cfg = [
    [-180, 130, -60], [220, -110, 80], [-90, -180, 140],
    [160, 150, -130], [-220, 60, 180], [60, -200, -100],
    [200, 80, 200], [-160, -90, -200],
  ];
  for (const c of cfg) {
    const n = 200;
    const pos = new Float32Array(n*3), col = new Float32Array(n*3), siz = new Float32Array(n);
    for (let i=0;i<n;i++){
      const dx = gauss()*5, dy = gauss()*5, dz = gauss()*5;
      pos[i*3+0]=c[0]+dx; pos[i*3+1]=c[1]+dy; pos[i*3+2]=c[2]+dz;
      const b = 0.5 + Math.random()*0.4;
      col[i*3+0]=1.0*b; col[i*3+1]=0.88*b; col[i*3+2]=0.7*b;
      siz[i]=0.4+Math.random()*0.5;
    }
    blobs.push({ center: c as any, geom: makeLayer(pos, col, siz) });
  }
  return blobs;
}

function StarLayer({ geometry, opacity, sizeScale, dust = false }: {
  geometry: THREE.BufferGeometry; opacity: number; sizeScale: number; dust?: boolean;
}) {
  const uniforms = useMemo(() => ({
    uPixelRatio: { value: typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1 },
    uSizeScale: { value: sizeScale },
    uOpacity: { value: opacity },
  }), [sizeScale, opacity]);
  return (
    <points geometry={geometry}>
      <shaderMaterial
        vertexShader={STAR_VERT}
        fragmentShader={dust ? DUST_FRAG : STAR_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={dust ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

export function GalaxyVolume({ tier = "desktop" }: { tier?: "desktop" | "mobile" | "tablet" }) {
  const mobile = tier === "mobile";
  const counts = {
    bulge: mobile ? 2500 : 6000,
    thin:  mobile ? 6000 : 18000,
    thick: mobile ? 1800 : 5000,
    halo:  mobile ? 1500 : 4000,
    dust:  mobile ? 0    : 7500,
  };

  const layers = useMemo(() => ({
    bulge: genBulge(counts.bulge),
    thin:  genThinDisc(counts.thin),
    thick: genThickDisc(counts.thick),
    halo:  genHalo(counts.halo),
    dust:  counts.dust ? genDustLanes(counts.dust) : null,
    globs: !mobile ? genGlobulars() : [],
  }), [counts.bulge, counts.thin, counts.thick, counts.halo, counts.dust, mobile]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.010;
  });

  // Slight tilt of the whole galaxy plane (XZ) — gives 3D look at default camera
  return (
    <group ref={groupRef} rotation={[THREE.MathUtils.degToRad(8), 0, THREE.MathUtils.degToRad(6)]}>
      <StarLayer geometry={layers.bulge} opacity={0.95} sizeScale={1.05} />
      <StarLayer geometry={layers.thick} opacity={0.55} sizeScale={0.9} />
      <StarLayer geometry={layers.thin}  opacity={0.85} sizeScale={1.0} />
      <StarLayer geometry={layers.halo}  opacity={0.5}  sizeScale={0.8} />
      {layers.dust && <StarLayer geometry={layers.dust} opacity={0.55} sizeScale={1.4} dust />}
      {layers.globs.map((g, i) => (
        <StarLayer key={`gl-${i}`} geometry={g.geom} opacity={0.85} sizeScale={1.0} />
      ))}
    </group>
  );
}