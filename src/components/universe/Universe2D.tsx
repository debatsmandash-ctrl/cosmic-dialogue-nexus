import { useEffect, useMemo, useRef } from "react";
import { buildGraph } from "@/lib/graph/build";
import { useUniverse, useSettings } from "@/lib/store";
import type { StarNode } from "@/data/types";

/**
 * Universe2D — Genshin Sky Engine.
 * 4 sky backdrops: mondstadt (default), snezhnaya, liyue, constellation_pure.
 * 4 constellation shapes: free_lines (default), figurative, orbit_rings, hybrid.
 * Star color: cluster | pure_white | rainbow.
 * `realSky2D` toggle = matikan aurora + komet hias (untuk vibe astronomi murni).
 */

const VW = 2400;
const VH = 1500;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Deterministic PRNG per seed
function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function Universe2D() {
  const graph = useMemo(() => buildGraph(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const select = useUniverse((s) => s.select);
  const hover = useUniverse((s) => s.hover);
  const selectedId = useUniverse((s) => s.selectedId);
  const hoveredId = useUniverse((s) => s.hoveredId);
  const setLoaded = useUniverse((s) => s.setLoaded);
  const settings = useSettings();
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => { setLoaded(true); }, [setLoaded]);

  // Background twinkle stars
  const bgStars = useMemo(() => {
    const arr: { x: number; y: number; r: number; b: number; tw: number; warm: boolean }[] = [];
    const N = 1200;
    for (let i = 0; i < N; i++) {
      arr.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.25 + Math.pow(Math.random(), 3) * 1.4,
        b: 0.25 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.15,
      });
    }
    return arr;
  }, []);

  // ─── Layout ─────────────────────────────────────────────
  const projected = useMemo(() => {
    const rand = mulberry(20260614);
    const map = new Map<string, { x: number; y: number; node: StarNode; cidx: number }>();
    const clusters = graph.nodes.filter((n) => n.kind === "cluster");
    const clusterIdx = new Map<string, number>();
    clusters.forEach((c, i) => clusterIdx.set(c.cluster, i));

    const childrenOfCluster = new Map<string, StarNode[]>();
    for (const n of graph.nodes) {
      if (n.kind === "cluster" || n.kind === "root") continue;
      if (!childrenOfCluster.has(n.cluster)) childrenOfCluster.set(n.cluster, []);
      childrenOfCluster.get(n.cluster)!.push(n);
    }

    const shape = settings.constellationShape;

    // Root center
    const root = graph.nodes.find((n) => n.id === "root");
    if (root) map.set(root.id, { x: 0, y: 0, node: root, cidx: -1 });

    if (shape === "orbit_rings" || shape === "hybrid") {
      // Cluster placed on concentric rings, evenly distributed around.
      const ringRadii = [320, 520, 720];
      clusters.forEach((c, i) => {
        const ring = i % ringRadii.length;
        const slot = Math.floor(i / ringRadii.length);
        const perRing = Math.ceil(clusters.length / ringRadii.length);
        const ang = (slot / perRing) * Math.PI * 2 + ring * 0.4;
        const r = ringRadii[ring];
        const cx = Math.cos(ang) * r;
        const cy = Math.sin(ang) * r * 0.45; // squish vertical = orbit ellipse
        map.set(c.id, { x: cx, y: cy, node: c, cidx: i });

        const kids = childrenOfCluster.get(c.cluster) ?? [];
        const placed: { x: number; y: number }[] = [];
        kids.forEach((k, ki) => {
          if (shape === "hybrid" && c.cluster !== "matter") {
            // Hybrid uses figurative for some clusters; fallback to compact rosette
          }
          const tier =
            k.kind === "subhub" ? 0 :
            k.kind === "domain" || k.kind === "school" ? 1 :
            k.kind === "bab" || k.kind === "team" || k.kind === "letter" || k.kind === "role" ? 2 : 3;
          const localR = 40 + tier * 28 + Math.sqrt(ki) * 4;
          const a = (ki * 137.5) * Math.PI / 180 + ki * 0.13;
          const px = cx + Math.cos(a) * localR;
          const py = cy + Math.sin(a) * localR * 0.7;
          placed.push({ x: px, y: py });
          map.set(k.id, { x: px, y: py, node: k, cidx: i });
        });
      });
    } else {
      // free_lines / figurative: spread cluster centers via Poisson-disk.
      const placed: { x: number; y: number; r: number }[] = [{ x: 0, y: 0, r: 110 }];
      const tryPlace = (minR: number) => {
        for (let i = 0; i < 80; i++) {
          const x = (rand() - 0.5) * (VW - 200);
          const y = (rand() - 0.5) * (VH - 200);
          let ok = true;
          for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < p.r + minR) { ok = false; break; }
          if (ok) { placed.push({ x, y, r: minR }); return { x, y }; }
        }
        const x = (rand() - 0.5) * (VW - 200);
        const y = (rand() - 0.5) * (VH - 200);
        placed.push({ x, y, r: minR });
        return { x, y };
      };
      clusters.forEach((c, i) => {
        const p = tryPlace(220);
        map.set(c.id, { x: p.x, y: p.y, node: c, cidx: i });
        const kids = childrenOfCluster.get(c.cluster) ?? [];
        const baseR = 80 + Math.sqrt(kids.length) * 22;
        const tierOf = (k: string) =>
          k === "subhub" ? 0 :
          k === "domain" || k === "school" ? 1 :
          k === "bab" || k === "team" || k === "role" || k === "letter" ? 2 : 3;
        const sorted = [...kids].sort((a, b) => tierOf(a.kind) - tierOf(b.kind));
        const localPlaced: { x: number; y: number }[] = [{ x: p.x, y: p.y }];
        for (let j = 0; j < sorted.length; j++) {
          const k = sorted[j];
          const tier = tierOf(k.kind);
          const radius = baseR * (0.35 + tier * 0.28);
          const minSep = k.kind === "subhub" ? 60 : k.kind === "domain" || k.kind === "school" ? 42 : 18;
          let best: { x: number; y: number } | null = null;
          for (let t = 0; t < 50; t++) {
            const ang = rand() * Math.PI * 2;
            const r = radius * (0.7 + rand() * 0.6);
            const x = p.x + Math.cos(ang) * r;
            const y = p.y + Math.sin(ang) * r;
            let ok = true;
            for (const lp of localPlaced) if (Math.hypot(lp.x - x, lp.y - y) < minSep) { ok = false; break; }
            if (ok) { best = { x, y }; break; }
          }
          if (!best) {
            const ang = (j / sorted.length) * Math.PI * 2;
            best = { x: p.x + Math.cos(ang) * radius, y: p.y + Math.sin(ang) * radius };
          }
          localPlaced.push(best);
          map.set(k.id, { x: best.x, y: best.y, node: k, cidx: i });
        }
      });
    }
    return map;
  }, [graph, settings.constellationShape]);

  // Lit set
  const litSet = useMemo(() => {
    const s = new Set<string>();
    const a = selectedId ?? hoveredId;
    if (a) {
      s.add(a);
      const ns = graph.neighbors.get(a);
      if (ns) for (const id of ns) s.add(id);
    }
    return s;
  }, [selectedId, hoveredId, graph]);

  // Comets
  const cometsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; max: number }[]>([]);
  // Snowflakes (snezhnaya) / fireflies (mondstadt) / lanterns (liyue)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; hue: string; life: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const sky = settings.sky2DTheme;
    const real = settings.realSky2D;
    const lineOpacity = settings.constellationLineOpacity;
    const starMode = settings.starColorMode;

    const spawnComet = () => {
      const w = canvas.width, h = canvas.height;
      const fromLeft = Math.random() < 0.5;
      const angle = (Math.PI / 6) + Math.random() * (Math.PI / 5);
      const speed = (w + h) * 0.00038;
      cometsRef.current.push({
        x: fromLeft ? -50 : w + 50,
        y: Math.random() * h * 0.55,
        vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr,
        life: 0, max: 240,
      });
    };

    const spawnParticle = () => {
      const w = canvas.width, h = canvas.height;
      if (sky === "mondstadt") {
        particlesRef.current.push({
          x: Math.random() * w,
          y: h * (0.6 + Math.random() * 0.35),
          vx: (Math.random() - 0.5) * 0.3 * dpr,
          vy: -0.3 * dpr - Math.random() * 0.4 * dpr,
          r: 1.0 + Math.random() * 1.4,
          hue: Math.random() < 0.85 ? "#ffe28a" : "#fff4c2",
          life: 0,
        });
      } else if (sky === "snezhnaya") {
        particlesRef.current.push({
          x: Math.random() * w,
          y: -10,
          vx: (Math.random() - 0.5) * 0.4 * dpr,
          vy: 0.4 * dpr + Math.random() * 0.6 * dpr,
          r: 0.6 + Math.random() * 1.4,
          hue: "#e8f4ff",
          life: 0,
        });
      } else if (sky === "liyue") {
        particlesRef.current.push({
          x: Math.random() * w,
          y: h * (0.65 + Math.random() * 0.3),
          vx: (Math.random() - 0.5) * 0.25 * dpr,
          vy: -0.2 * dpr - Math.random() * 0.3 * dpr,
          r: 2.4 + Math.random() * 2.0,
          hue: Math.random() < 0.7 ? "#ff6b3d" : "#ffd166",
          life: 0,
        });
      }
    };

    const drawSky = (w: number, h: number, t: number) => {
      // Per-theme gradient + landscape silhouettes
      let grad: CanvasGradient;
      if (sky === "mondstadt") {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#06112b");
        grad.addColorStop(0.4, "#0d2152");
        grad.addColorStop(0.75, "#0e2c5a");
        grad.addColorStop(1, "#0a1a3a");
      } else if (sky === "snezhnaya") {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#02050f");
        grad.addColorStop(0.35, "#061026");
        grad.addColorStop(0.75, "#0a1830");
        grad.addColorStop(1, "#142a45");
      } else if (sky === "liyue") {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0a0510");
        grad.addColorStop(0.4, "#1c0a18");
        grad.addColorStop(0.78, "#3a1410");
        grad.addColorStop(1, "#5a230f");
      } else {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#02040c");
        grad.addColorStop(0.6, "#070a18");
        grad.addColorStop(1, "#020308");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Milky way band — mondstadt & constellation_pure
      if (!real || sky === "constellation_pure" || sky === "mondstadt") {
        const bandY = h * (sky === "mondstadt" ? 0.30 : 0.28);
        const bandH = h * 0.18;
        const mw = ctx.createLinearGradient(0, bandY - bandH, 0, bandY + bandH);
        mw.addColorStop(0, "rgba(140,150,220,0)");
        mw.addColorStop(0.5, sky === "liyue" ? "rgba(255,210,150,0.18)" : "rgba(140,160,255,0.22)");
        mw.addColorStop(1, "rgba(140,150,220,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = mw;
        ctx.fillRect(0, bandY - bandH, w, bandH * 2);
        ctx.restore();
      }

      // Aurora — only when realSky off
      if (!real && sky !== "constellation_pure") {
        const bands = sky === "snezhnaya"
          ? [
              { y: 0.16, amp: 90, period: 0.0012, hue: "rgba(80,255,180,", base: 0.22, speed: 0.18 },
              { y: 0.28, amp: 110, period: 0.0009, hue: "rgba(140,110,255,", base: 0.18, speed: 0.12 },
              { y: 0.42, amp: 80, period: 0.0011, hue: "rgba(80,200,255,", base: 0.15, speed: 0.10 },
            ]
          : sky === "liyue"
          ? [
              { y: 0.55, amp: 60, period: 0.0011, hue: "rgba(255,180,80,", base: 0.16, speed: 0.08 },
              { y: 0.65, amp: 90, period: 0.0008, hue: "rgba(255,90,50,", base: 0.12, speed: 0.06 },
            ]
          : [
              { y: 0.18, amp: 70, period: 0.0014, hue: "rgba(120,140,255,", base: 0.22, speed: 0.13 },
              { y: 0.32, amp: 95, period: 0.0010, hue: "rgba(160,110,255,", base: 0.18, speed: 0.09 },
              { y: 0.48, amp: 120, period: 0.0008, hue: "rgba(220,100,200,", base: 0.13, speed: 0.06 },
            ];
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const b of bands) {
          const yBase = b.y * h;
          const grd = ctx.createLinearGradient(0, yBase - b.amp * dpr * 1.4, 0, yBase + b.amp * dpr * 1.4);
          grd.addColorStop(0, b.hue + "0)");
          grd.addColorStop(0.5, b.hue + b.base + ")");
          grd.addColorStop(1, b.hue + "0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(0, yBase);
          for (let x = 0; x <= w; x += 12 * dpr) {
            const k = x * b.period;
            const yy = yBase
              + Math.sin(k + t * b.speed) * b.amp * dpr * 0.6
              + Math.sin(k * 2.3 + t * b.speed * 0.6) * b.amp * dpr * 0.4;
            ctx.lineTo(x, yy);
          }
          ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Background twinkle
      for (const s of bgStars) {
        const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + s.tw);
        const col = s.warm
          ? `rgba(255,235,200,${s.b * tw * 0.7})`
          : `rgba(${220 + s.b * 35 | 0},${230 + s.b * 25 | 0},255,${s.b * tw * 0.75})`;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Landscape (silhouette) — skip on constellation_pure & realSky
      if (!real && sky !== "constellation_pure") {
        ctx.save();
        if (sky === "mondstadt") {
          // mountains silhouette
          ctx.fillStyle = "#040912";
          ctx.beginPath();
          ctx.moveTo(0, h);
          const ridge = [0.92, 0.86, 0.90, 0.82, 0.88, 0.78, 0.84, 0.80, 0.86, 0.83, 0.90];
          ridge.forEach((y, i) => ctx.lineTo((i / (ridge.length - 1)) * w, y * h));
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
          // Big tree silhouette near center-bottom
          ctx.fillStyle = "#03070f";
          const tx = w * 0.5, ty = h * 0.92;
          ctx.beginPath();
          ctx.ellipse(tx, ty - 90 * dpr, 140 * dpr, 110 * dpr, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(tx - 8 * dpr, ty - 60 * dpr, 16 * dpr, 70 * dpr);
        } else if (sky === "snezhnaya") {
          ctx.fillStyle = "#0a1730";
          ctx.beginPath();
          ctx.moveTo(0, h);
          const ridge = [0.78, 0.65, 0.74, 0.58, 0.68, 0.55, 0.62, 0.68, 0.60, 0.72, 0.78];
          ridge.forEach((y, i) => ctx.lineTo((i / (ridge.length - 1)) * w, y * h));
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
          // Snow cap highlights
          ctx.fillStyle = "rgba(220,235,255,0.5)";
          ctx.beginPath();
          ridge.forEach((y, i) => {
            const x = (i / (ridge.length - 1)) * w;
            ctx.moveTo(x, y * h);
            ctx.lineTo(x + 24 * dpr, y * h + 18 * dpr);
            ctx.lineTo(x - 24 * dpr, y * h + 18 * dpr);
            ctx.closePath();
          });
          ctx.fill();
        } else if (sky === "liyue") {
          // Distant misty mountains warm
          ctx.fillStyle = "rgba(50,20,15,0.85)";
          ctx.beginPath();
          ctx.moveTo(0, h);
          const ridge = [0.86, 0.78, 0.82, 0.72, 0.80, 0.74, 0.78, 0.82];
          ridge.forEach((y, i) => ctx.lineTo((i / (ridge.length - 1)) * w, y * h));
          ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
          // Ink cloud strokes
          ctx.strokeStyle = "rgba(255,200,140,0.35)";
          ctx.lineWidth = 2 * dpr;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            const y = h * (0.45 + i * 0.06);
            ctx.moveTo(0, y);
            for (let x = 0; x <= w; x += 40 * dpr) {
              ctx.lineTo(x, y + Math.sin((x + t * 30) * 0.005 + i) * 12 * dpr);
            }
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Particles (firefly / snow / lantern)
      if (!real && sky !== "constellation_pure") {
        if (Math.random() < (sky === "snezhnaya" ? 0.6 : sky === "mondstadt" ? 0.25 : 0.08)) spawnParticle();
        particlesRef.current = particlesRef.current.filter((p) => p.life < 600 && p.y > -40 && p.y < h + 40);
        for (const p of particlesRef.current) {
          p.x += p.vx; p.y += p.vy; p.life += 1;
          ctx.fillStyle = p.hue;
          ctx.shadowColor = p.hue;
          ctx.shadowBlur = p.r * 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // Comets — only when realSky off
      if (!real) {
        if (Math.random() < 0.004) spawnComet();
        cometsRef.current = cometsRef.current.filter((c) => c.life < c.max);
        for (const c of cometsRef.current) {
          c.x += c.vx; c.y += c.vy; c.life += 1;
          const alpha = Math.min(1, c.life / 20) * Math.max(0, 1 - c.life / c.max);
          for (let i = 0; i < 18; i++) {
            const k = i / 18;
            ctx.fillStyle = `rgba(220,230,255,${alpha * (1 - k) * 0.5})`;
            ctx.beginPath();
            ctx.arc(c.x - c.vx * i * 1.8, c.y - c.vy * i * 1.8, (2.2 - k * 2) * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 2.4 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawOrbitRings = (cx: number, cy: number, z: number) => {
      // for orbit_rings / hybrid: draw concentric silver ellipses
      ctx.save();
      ctx.strokeStyle = "rgba(200,215,255,0.18)";
      ctx.lineWidth = 0.7 * dpr;
      for (const r of [320, 520, 720]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * z, r * z * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      const view = viewRef.current;
      const anyActive = !!(selectedId ?? hoveredId);
      const w = canvas.width, h = canvas.height;
      const t = performance.now() / 1000;

      drawSky(w, h, t);

      const cx = w / 2 + view.x * dpr;
      const cy = h / 2 + view.y * dpr;
      const z = view.zoom * dpr * Math.min(w / VW / dpr, h / VH / dpr) * dpr;

      if (settings.constellationShape === "orbit_rings" || settings.constellationShape === "hybrid") {
        drawOrbitRings(cx, cy, z);
      }

      // Edges (constellation lines)
      ctx.lineWidth = 0.6 * dpr;
      for (const e of graph.edges) {
        if (e.kind === "link") continue;
        const a = projected.get(e.a), b = projected.get(e.b);
        if (!a || !b) continue;
        const lit = anyActive && litSet.has(e.a) && litSet.has(e.b);
        const dim = anyActive && !lit;
        const color = starMode === "cluster" ? (e.color || "#cdd9ff") : "#cdd9ff";
        ctx.strokeStyle = lit ? rgba(color, 0.95) : rgba(color, lineOpacity);
        ctx.globalAlpha = lit ? 1 : dim ? 0.05 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + a.x * z, cy + a.y * z);
        ctx.lineTo(cx + b.x * z, cy + b.y * z);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Nodes
      for (const { x, y, node } of projected.values()) {
        const px = cx + x * z;
        const py = cy + y * z;
        if (px < -50 || px > w + 50 || py < -50 || py > h + 50) continue;
        const isSel = node.id === selectedId;
        const isHov = node.id === hoveredId;
        const isLit = litSet.has(node.id);
        const dim = anyActive && !isLit;
        const baseR =
          node.kind === "root" ? 4.4 :
          node.kind === "cluster" ? 3.8 :
          node.kind === "subhub" ? 2.7 :
          node.kind === "domain" || node.kind === "school" ? 2.1 :
          node.kind === "bab" || node.kind === "team" || node.kind === "role" || node.kind === "letter" ? 1.6 : 1.0;
        const r = baseR * (isSel || isHov ? 1.85 : 1) * dpr;

        let starColor = "#ffffff";
        if (starMode === "cluster") starColor = node.color;
        else if (starMode === "rainbow") {
          const hue = (x * 7 + y * 11) % 360;
          starColor = `hsl(${(hue + 360) % 360}, 80%, 70%)`;
        } else if (settings.realSky2D) {
          // Pure realistic — slight color jitter
          starColor = Math.random() < 0.1 ? "#ffd9a8" : "#ffffff";
        }

        // Halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, r * 6);
        halo.addColorStop(0, rgba(starColor, dim ? 0.05 : 0.45));
        halo.addColorStop(0.45, rgba(starColor, dim ? 0.02 : 0.16));
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, r * 6, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = dim ? rgba(starColor, 0.35) : starColor;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // 4-point sparkle for hubs
        if (baseR >= 2.5 && !dim) {
          ctx.strokeStyle = rgba(starColor, isSel || isHov ? 0.85 : 0.55);
          ctx.lineWidth = 0.6 * dpr;
          ctx.beginPath();
          ctx.moveTo(px - r * 3.4, py); ctx.lineTo(px + r * 3.4, py);
          ctx.moveTo(px, py - r * 3.4); ctx.lineTo(px, py + r * 3.4);
          ctx.stroke();
        }
        // Label
        if (node.kind === "root" || node.kind === "cluster" || node.kind === "subhub" || isSel || isHov) {
          ctx.globalAlpha = dim ? 0.35 : 1;
          ctx.font = `${node.kind === "root" ? 14 : node.kind === "cluster" ? 11 : 10}px DM Sans, sans-serif`;
          ctx.fillStyle = "rgba(230,240,255,0.92)";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(10,15,30,0.95)";
          ctx.shadowBlur = 6;
          ctx.fillText(node.label, px, py + r + 14 * dpr);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    // ─── Interactions ──
    const screenToWorld = (sx: number, sy: number) => {
      const view = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = (sx - rect.left) * dpr;
      const py = (sy - rect.top) * dpr;
      const cx = canvas.width / 2 + view.x * dpr;
      const cy = canvas.height / 2 + view.y * dpr;
      const z = view.zoom * dpr * Math.min(canvas.width / VW / dpr, canvas.height / VH / dpr) * dpr;
      return { x: (px - cx) / z, y: (py - cy) / z };
    };
    const hitTest = (sx: number, sy: number) => {
      const wp = screenToWorld(sx, sy);
      let best: { id: string; d: number } | null = null;
      for (const { x, y, node } of projected.values()) {
        const baseR = node.kind === "root" ? 6 : node.kind === "cluster" ? 5 : node.kind === "subhub" ? 4 : 3;
        const r = baseR + 6;
        const d = Math.hypot(x - wp.x, y - wp.y);
        if (d < r && (!best || d < best.d)) best = { id: node.id, d };
      }
      return best?.id ?? null;
    };
    const onMove = (e: PointerEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        viewRef.current.x = dragRef.current.vx + dx;
        viewRef.current.y = dragRef.current.vy + dy;
        return;
      }
      const id = hitTest(e.clientX, e.clientY);
      hover(id);
      canvas.style.cursor = id ? "pointer" : "grab";
    };
    const onDown = (e: PointerEvent) => {
      const id = hitTest(e.clientX, e.clientY);
      if (id) { select(id); return; }
      dragRef.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
      canvas.style.cursor = "grabbing";
    };
    const onUp = () => { dragRef.current = null; canvas.style.cursor = "grab"; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.001);
      viewRef.current.zoom = Math.max(0.3, Math.min(5, viewRef.current.zoom * f));
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [graph, projected, bgStars, selectedId, hoveredId, litSet, hover, select,
      settings.sky2DTheme, settings.realSky2D, settings.constellationShape,
      settings.constellationLineOpacity, settings.starColorMode]);

  const skyBg =
    settings.sky2DTheme === "mondstadt" ? "#06112b" :
    settings.sky2DTheme === "snezhnaya" ? "#02050f" :
    settings.sky2DTheme === "liyue" ? "#0a0510" : "#02040c";

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, background: skyBg, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ cursor: "grab", display: "block" }} />
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 4,
        fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em",
        color: "#a8c0ff", padding: "4px 10px",
        background: "rgba(10,20,40,0.7)", border: "1px solid rgba(160,180,255,0.3)",
        borderRadius: 4, backdropFilter: "blur(8px)", pointerEvents: "none",
      }}>
        2D · {settings.sky2DTheme.toUpperCase().replace("_", " ")} · {settings.constellationShape.toUpperCase().replace("_", " ")}
      </div>
    </div>
  );
}
