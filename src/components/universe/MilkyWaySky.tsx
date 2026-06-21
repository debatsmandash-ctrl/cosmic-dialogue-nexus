import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * MilkyWaySky — galaksi realistis full-procedural shader.
 *  - 7 oktaf FBM + ridge noise → struktur awan & dust lane tajam
 *  - Pusat galaksi (bulge) ASYMMETRIC — terang di SATU sisi saja (sisi kanan kamera awal)
 *  - 3 lapis bintang dipanggang langsung di shader (haze, mid, foreground bright)
 *  - Palet: deep navy → blue-white → cream → amber/emas core (TANPA pink/magenta)
 *  - 2 PointLight aksen warna core (amber + cool blue) untuk rim-light node
 */
const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform float uOpacity;

// ─── Noise primitives ───
float hash13(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float hash12(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i+vec3(0,0,0)),hash13(i+vec3(1,0,0)),f.x),
                 mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),
                 mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm7(vec3 p){
  float a=0.0, w=0.5;
  for(int i=0;i<7;i++){ a+=w*vnoise(p); p=p*2.07+vec3(11.7,3.2,7.9); w*=0.5; }
  return a;
}
float ridge(vec3 p){ return 1.0 - abs(vnoise(p)*2.0 - 1.0); }
float ridgeFbm6(vec3 p){
  float a=0.0, w=0.55;
  for(int i=0;i<6;i++){ a+=w*ridge(p); p=p*2.13+vec3(5.0,9.1,2.3); w*=0.5; }
  return a;
}

// Bintang procedural: cell-based hash, threshold tinggi → titik tajam
float starsLayer(vec3 d, float density, float threshold, float sharpness){
  // proyeksi ke sphere ke grid pseudo-uv
  vec2 uv = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  vec2 cell = uv * density;
  vec2 fcell = fract(cell);
  vec2 icell = floor(cell);
  float h = hash12(icell);
  if (h < threshold) return 0.0;
  // jarak ke titik bintang dalam sel
  vec2 starPos = vec2(hash12(icell+1.7), hash12(icell+5.3));
  float dStar = length(fcell - starPos);
  float br = (h - threshold) / (1.0 - threshold);
  return pow(max(0.0, 1.0 - dStar * sharpness), 4.0) * br;
}

void main(){
  vec3 d = normalize(vDir);

  float lat = d.y;
  float lon = atan(d.z, d.x);

  // ─── Pita disc (lebih lebar & lembut, mirip foto astrofoto) ───
  float band = exp(-pow(lat / 0.28, 2.0));
  float halo = exp(-pow(lat / 0.65, 2.0)) * 0.40;

  // ─── Struktur awan ───
  vec3 q = d * 2.6;
  float clouds = fbm7(q * 1.4);
  float ridges = ridgeFbm6(q * 2.0);
  float structure = mix(clouds, ridges, 0.50);
  float fineCloud = fbm7(q * 5.0 + vec3(13.0));

  // ─── Dust lanes ───
  float dustLane = exp(-pow(lat / 0.06, 2.0));
  float dustNoise = fbm7(q * 3.4 + vec3(7.0));
  float dust = dustLane * smoothstep(0.32, 0.78, dustNoise) * 0.95;

  // ─── Core bulge: krem netral, BUKAN amber emas ───
  float coreAng = exp(-pow((lon - 0.7) / 0.50, 2.0));
  float coreLat = exp(-pow(lat / 0.14, 2.0));
  float bulge = coreAng * coreLat;
  float coreGlow = bulge * (0.75 + 0.30 * fineCloud);
  float coreHot = exp(-pow((lon - 0.72) / 0.20, 2.0)) * exp(-pow(lat / 0.07, 2.0));

  float intensity = (band * structure * 1.10 + halo * clouds * 0.55) - dust * 0.80;
  intensity = clamp(intensity, 0.0, 1.5);

  // ─── Palet: navy gelap → biru-abu → krem netral (sesuai referensi) ───
  vec3 colDark    = vec3(0.008, 0.012, 0.030);
  vec3 colNavy    = vec3(0.040, 0.055, 0.095);
  vec3 colBlueGry = vec3(0.16, 0.18, 0.24);
  vec3 colDust1   = vec3(0.32, 0.28, 0.26);
  vec3 colCream   = vec3(0.62, 0.56, 0.48);
  vec3 colCoreLite= vec3(0.78, 0.70, 0.58);
  vec3 colCoreHot = vec3(0.92, 0.84, 0.70);
  vec3 colDust    = vec3(0.012, 0.010, 0.018);

  vec3 col = colDark;
  col = mix(col, colNavy,    smoothstep(0.02, 0.20, intensity));
  col = mix(col, colBlueGry, smoothstep(0.18, 0.45, intensity));
  col = mix(col, colDust1,   smoothstep(0.40, 0.70, intensity));
  col = mix(col, colCream,   smoothstep(0.60, 0.95, intensity));
  col = mix(col, colCoreLite,clamp(coreGlow * 0.85, 0.0, 1.0));
  col = mix(col, colCoreHot, clamp(coreHot * 0.85, 0.0, 1.0));
  col = mix(col, colDust, dust);

  // ─── Bintang tersebar merata seluruh sky (bukan hanya di pita) ───
  float bgStars = starsLayer(d, 360.0, 0.88, 14.0) * (0.85 + band * 0.35);
  float midStars = starsLayer(d, 200.0, 0.93, 9.0) * (0.85 + band * 0.30);
  float fgStars = starsLayer(d, 70.0, 0.982, 5.0) * 1.25;

  vec3 starColCool = vec3(0.90, 0.94, 1.05);
  vec3 starColWarm = vec3(1.02, 0.92, 0.78);
  vec3 starCol = mix(starColCool, starColWarm, smoothstep(0.3, 0.85, band) * 0.45);

  vec3 starsAdd = starCol * (bgStars * 0.55 + midStars * 1.0 + fgStars * 1.7);

  float poleFade = smoothstep(0.95, 0.50, abs(lat));
  col *= mix(0.55, 1.0, poleFade);

  col += starsAdd;

  gl_FragColor = vec4(col * uOpacity, 1.0);
}
`;

export function MilkyWaySky({ opacity = 0.95 }: { opacity?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    }),
    [opacity]
  );

  useFrame((_, dt) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += dt;
      matRef.current.uniforms.uOpacity.value = opacity;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[0, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(14)]}
    >
      {/* Skybox sphere — kamera berada di dalam disc */}
      <mesh frustumCulled={false}>
        <sphereGeometry args={[900, 96, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          transparent={false}
        />
      </mesh>

      {/* Rim-light halus: core krem-netral + sisi dingin */}
      <pointLight position={[300, 30, 80]} intensity={0.35} color="#e8d8b8" distance={620} decay={1.8} />
      <pointLight position={[-280, -20, -60]} intensity={0.28} color="#8aa6d8" distance={520} decay={1.8} />
      <pointLight position={[40, 220, -40]} intensity={0.14} color="#cfd6e4" distance={500} decay={2} />
    </group>
  );
}
