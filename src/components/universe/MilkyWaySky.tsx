import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * MilkyWaySky — skybox realistis. Kamera berada DI DALAM disc galaksi:
 *  - Sphere besar (BackSide) dengan shader pita Milky Way memanjang di ekuator
 *  - Tidak ada nebula pink / gas magenta — palet putih kebiruan → krem hangat → emas redup
 *  - Dust lane gelap di tengah pita; tepi luar fade ke gelap pekat
 *  - 2 PointLight redup sebagai "core glow" agar bintang & node tetap kontras
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

float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p, int oct){
  float a=0.0; float w=0.55;
  for(int i=0;i<7;i++){
    if(i>=oct) break;
    a+=w*vnoise(p); p=p*2.07 + vec3(11.7,3.2,7.9); w*=0.5;
  }
  return a;
}
float ridge(vec3 p){ return 1.0 - abs(vnoise(p)*2.0 - 1.0); }
float ridgeFbm(vec3 p, int oct){
  float a=0.0, w=0.55;
  for(int i=0;i<5;i++){
    if(i>=oct) break;
    a+=w*ridge(p); p=p*2.13+vec3(5.0,9.1,2.3); w*=0.5;
  }
  return a;
}

void main(){
  vec3 d = normalize(vDir);

  // Latitude relatif ke ekuator (disc plane = XZ)
  float lat = d.y;
  // pita Milky Way: gaussian band sempit di sekitar ekuator
  float band = exp(-pow(lat / 0.22, 2.0));
  // band kedua lebih lebar & redup (halo)
  float halo = exp(-pow(lat / 0.55, 2.0)) * 0.35;

  // Longitude untuk variasi sepanjang pita (azimuth)
  float lon = atan(d.z, d.x);
  // posisi sampling 3D agar konsisten saat dilihat 360°
  vec3 q = d * 2.6;

  // Struktur awan pita
  float clouds = fbm(q * 1.4 + vec3(0.0, 0.0, uTime*0.005), 6);
  float ridges = ridgeFbm(q * 2.1, 4);
  float structure = mix(clouds, ridges, 0.45);

  // Dust lane GELAP di tengah pita (jalur debu)
  float dustLane = exp(-pow(lat / 0.06, 2.0));
  float dustNoise = fbm(q * 3.2 + vec3(7.0), 4);
  float dust = dustLane * smoothstep(0.35, 0.85, dustNoise) * 0.9;

  // Core hotspot: bagian tengah Milky Way lebih terang (di azimuth tertentu)
  float coreAz = exp(-pow((lon - 0.6) / 1.2, 2.0))
               + exp(-pow((lon + 2.3) / 1.5, 2.0)) * 0.7;
  float core = band * coreAz * (0.55 + 0.45 * structure);

  // Intensitas pita keseluruhan
  float intensity = (band * structure + halo * clouds * 0.6) - dust;
  intensity = clamp(intensity, 0.0, 1.4);

  // Palet: dark navy → biru pucat → krem hangat → emas redup
  vec3 colDark   = vec3(0.012, 0.018, 0.045);
  vec3 colBlue   = vec3(0.18, 0.26, 0.42);   // pita pinggir
  vec3 colCream  = vec3(0.62, 0.55, 0.46);   // tengah pita
  vec3 colAmber  = vec3(0.78, 0.62, 0.38);   // core
  vec3 colDust   = vec3(0.02, 0.02, 0.04);

  vec3 col = colDark;
  col = mix(col, colBlue, smoothstep(0.05, 0.45, intensity));
  col = mix(col, colCream, smoothstep(0.35, 0.85, intensity));
  col = mix(col, colAmber, clamp(core, 0.0, 1.0));
  // jalur debu
  col = mix(col, colDust, dust);

  // Fade ke gelap pekat di kutub
  float poleFade = smoothstep(0.85, 0.55, abs(lat));
  col *= mix(0.35, 1.0, poleFade);

  // Opacity halus
  float alpha = clamp(intensity * 0.95 + halo * 0.4, 0.0, 1.0);
  alpha = mix(0.18, 1.0, alpha); // selalu ada base gelap

  gl_FragColor = vec4(col * uOpacity, alpha * uOpacity);
}
`;

export function MilkyWaySky({ opacity = 0.62 }: { opacity?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    }),
    [opacity]
  );

  // Tilt grup agar disc tidak rata sempurna dengan kamera awal — sedikit miring
  // sehingga pita terlihat seperti melengkung di horizon.
  useMemo(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = THREE.MathUtils.degToRad(18);
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(35);
    }
  }, []);

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
    if (matRef.current) matRef.current.uniforms.uOpacity.value = opacity;
  });

  return (
    <group
      ref={groupRef}
      rotation={[0, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(18)]}
    >
      {/* Skybox sphere — kamera berada di dalam */}
      <mesh frustumCulled={false}>
        <sphereGeometry args={[900, 64, 48]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* Core lighting halus — biru-krem, bukan magenta */}
      <pointLight position={[260, 20, 0]} intensity={0.45} color="#d8b27a" distance={520} />
      <pointLight position={[-260, -10, 60]} intensity={0.30} color="#8aa6d8" distance={520} />
    </group>
  );
}
