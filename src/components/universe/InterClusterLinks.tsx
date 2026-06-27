import { useMemo } from "react";
import * as THREE from "three";
import type { Graph } from "@/lib/graph/build";

/**
 * InterClusterLinks — garis tipis melengkung dari satu cluster ke cluster lain
 * untuk memberi rasa "rasi antar-kelompok". Curve via great-circle (slerp) di shell.
 */
export function InterClusterLinks({ graph }: { graph: Graph }) {
  const lines = useMemo(() => {
    const clusters = graph.nodes.filter((n) => n.kind === "cluster");
    const out: THREE.Line[] = [];
    for (let i = 0; i < clusters.length; i++) {
      // connect each cluster to the next 2 (ring + chord)
      for (let off = 1; off <= 2; off++) {
        const a = clusters[i];
        const b = clusters[(i + off) % clusters.length];
        const A = new THREE.Vector3(...a.pos);
        const B = new THREE.Vector3(...b.pos);
        const pts: THREE.Vector3[] = [];
        const N = 28;
        for (let k = 0; k <= N; k++) {
          const t = k / N;
          // slerp along sphere
          const dot = Math.max(-1, Math.min(1, A.clone().normalize().dot(B.clone().normalize())));
          const omega = Math.acos(dot) || 0.0001;
          const sinO = Math.sin(omega);
          const p = A.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinO)
            .add(B.clone().multiplyScalar(Math.sin(t * omega) / sinO));
          pts.push(p);
        }
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        // gradient color
        const colors = new Float32Array((N + 1) * 3);
        const cA = new THREE.Color(a.color);
        const cB = new THREE.Color(b.color);
        for (let k = 0; k <= N; k++) {
          const t = k / N;
          const c = cA.clone().lerp(cB, t);
          colors[k * 3 + 0] = c.r;
          colors[k * 3 + 1] = c.g;
          colors[k * 3 + 2] = c.b;
        }
        geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
        out.push(new THREE.Line(geom, mat));
      }
    }
    return out;
  }, [graph]);

  return <>{lines.map((l, i) => <primitive key={i} object={l} />)}</>;
}
