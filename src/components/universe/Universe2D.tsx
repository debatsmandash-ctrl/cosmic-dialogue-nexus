import { useEffect, useMemo, useRef } from "react";
import { buildGraph } from "@/lib/graph/build";
import { useUniverse, useSettings } from "@/lib/store";
import type { StarNode } from "@/data/types";
import mondstadtBgAsset from "@/assets/mondstadt-sky.png.asset.json";

/**
 * Universe2D — Mondstadt Infinite Sky.
 * - Background = gambar Mondstadt HD (parallax pan, mirror-tiled horizontal).
 * - World infinite-wrap (9-copy modulo): node yang keluar viewport muncul lagi dari sisi lain.
 * - Bintang berwarna per cluster (lihat cluster.color di graph build).
 * - Edge = MST per cluster → bentuk rantai/cabang seperti rasi bintang asli (BUKAN jaring laba-laba).
 */

const WORLD_W = 3600;
const WORLD_H = 2400;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Minimum spanning tree (Prim's) over node positions → chain-shaped constellation.
function mstEdges(points: { id: string; x: number; y: number }[]): [string, string][] {
  if (points.length < 2) return [];
  const inTree = new Set<string>([points[0].id]);
  const edges: [string, string][] = [];
  const remaining = new Map<string, { x: number; y: number }>();
  for (let i = 1; i < points.length; i++) remaining.set(points[i].id, { x: points[i].x, y: points[i].y });
  const treePts = new Map<string, { x: number; y: number }>([[points[0].id, { x: points[0].x, y: points[0].y }]]);
  while (remaining.size > 0) {
    let best: { a: string; b: string; d: number } | null = null;
    for (const [bid, bp] of remaining) {
      for (const [aid, ap] of treePts) {
        const d = Math.hypot(ap.x - bp.x, ap.y - bp.y);
        if (!best || d < best.d) best = { a: aid, b: bid, d };
      }
    }
    if (!best) break;
    edges.push([best.a, best.b]);
    treePts.set(best.b, remaining.get(best.b)!);
    remaining.delete(best.b);
    inTree.add(best.b);
  }
  return edges;
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
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => { setLoaded(true); }, [setLoaded]);

  // Preload background.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = mondstadtBgAsset.url;
    img.onload = () => { bgImgRef.current = img; };
  }, []);

  // ─── Layout: setiap cluster sebagai "rasi" terpisah (Poisson-disk centers, chain leaves) ───
  const { projected, edgesByCluster } = useMemo(() => {
    const rand = mulberry(20260614);
    const map = new Map<string, { x: number; y: number; node: StarNode; cidx: number }>();
    const clusters = graph.nodes.filter((n) => n.kind === "cluster");

    const childrenOfCluster = new Map<string, StarNode[]>();
    for (const n of graph.nodes) {
      if (n.kind === "cluster" || n.kind === "root") continue;
      if (!childrenOfCluster.has(n.cluster)) childrenOfCluster.set(n.cluster, []);
      childrenOfCluster.get(n.cluster)!.push(n);
    }

    const root = graph.nodes.find((n) => n.id === "root");
    if (root) map.set(root.id, { x: 0, y: 0, node: root, cidx: -1 });

    // Place cluster centers via Poisson-disk in world bounds.
    const placed: { x: number; y: number; r: number }[] = [{ x: 0, y: 0, r: 240 }];
    const placeCenter = (minR: number) => {
      for (let i = 0; i < 120; i++) {
        const x = (rand() - 0.5) * (WORLD_W - 400);
        const y = (rand() - 0.5) * (WORLD_H - 300);
        let ok = true;
        for (const p of placed) if (Math.hypot(p.x - x, p.y - y) < p.r + minR) { ok = false; break; }
        if (ok) { placed.push({ x, y, r: minR }); return { x, y }; }
      }
      const x = (rand() - 0.5) * (WORLD_W - 400);
      const y = (rand() - 0.5) * (WORLD_H - 300);
      placed.push({ x, y, r: minR });
      return { x, y };
    };

    const edgesByCluster: { color: string; pairs: [string, string][] }[] = [];

    clusters.forEach((c, i) => {
      const center = placeCenter(360);
      map.set(c.id, { x: center.x, y: center.y, node: c, cidx: i });

      const kids = childrenOfCluster.get(c.cluster) ?? [];
      // Tier ordering: hub-like first (closer), leaves outer.
      const tierOf = (k: string) =>
        k === "subhub" ? 0 :
        k === "domain" || k === "school" ? 1 :
        k === "bab" || k === "team" || k === "role" || k === "letter" ? 2 : 3;
      const sorted = [...kids].sort((a, b) => tierOf(a.kind) - tierOf(b.kind));

      // Scatter leaves in irregular constellation-like cloud around center
      // (slightly elliptical, with branch-friendly jitter so MST yields elongated chains).
      const baseR = 80 + Math.sqrt(sorted.length) * 26;
      const localPlaced: { id: string; x: number; y: number }[] = [{ id: c.id, x: center.x, y: center.y }];
      // Direction bias per cluster — gives every constellation its own elongation axis.
      const axisAng = rand() * Math.PI * 2;
      const axisStretch = 1.3 + rand() * 0.6;
      const minSepFor = (k: string) =>
        k === "subhub" ? 70 : k === "domain" || k === "school" ? 46 : k === "bab" || k === "team" || k === "role" || k === "letter" ? 22 : 14;

      for (let j = 0; j < sorted.length; j++) {
        const k = sorted[j];
        const tier = tierOf(k.kind);
        const radius = baseR * (0.4 + tier * 0.3);
        const minSep = minSepFor(k.kind);
        let best: { x: number; y: number } | null = null;
        for (let t = 0; t < 60; t++) {
          const ang = rand() * Math.PI * 2;
          const rr = radius * (0.55 + rand() * 0.9);
          // anisotropic stretch along cluster axis
          let dx = Math.cos(ang) * rr;
          let dy = Math.sin(ang) * rr;
          // rotate to axis, stretch x, rotate back
          const ca = Math.cos(axisAng), sa = Math.sin(axisAng);
          const rx = ca * dx + sa * dy;
          const ry = -sa * dx + ca * dy;
          dx = rx * axisStretch;
          dy = ry / axisStretch;
          const fx = ca * dx - sa * dy;
          const fy = sa * dx + ca * dy;
          const x = center.x + fx;
          const y = center.y + fy;
          let ok = true;
          for (const lp of localPlaced) if (Math.hypot(lp.x - x, lp.y - y) < minSep) { ok = false; break; }
          if (ok) { best = { x, y }; break; }
        }
        if (!best) {
          const ang = (j / Math.max(1, sorted.length)) * Math.PI * 2;
          best = { x: center.x + Math.cos(ang) * radius, y: center.y + Math.sin(ang) * radius };
        }
        localPlaced.push({ id: k.id, x: best.x, y: best.y });
        map.set(k.id, { x: best.x, y: best.y, node: k, cidx: i });
      }

      // Build MST → chain-shaped constellation edges.
      const pairs = mstEdges(localPlaced);
      edgesByCluster.push({ color: c.color, pairs });
    });

    return { projected: map, edgesByCluster };
  }, [graph]);

  // Background twinkle stars (very subtle, layered over bg image).
  const bgStars = useMemo(() => {
    const arr: { x: number; y: number; r: number; b: number; tw: number }[] = [];
    for (let i = 0; i < 220; i++) {
      arr.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        r: 0.3 + Math.pow(Math.random(), 3) * 1.4,
        b: 0.4 + Math.random() * 0.6,
        tw: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  // Comets (rare).
  const cometsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; max: number }[]>([]);

  // Lit set.
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

    const real = settings.realSky2D;
    const lineOpacity = settings.constellationLineOpacity;
    const starMode = settings.starColorMode;

    const spawnComet = () => {
      const w = canvas.width;
      const fromLeft = Math.random() < 0.5;
      const angle = (Math.PI / 7) + Math.random() * (Math.PI / 5);
      const speed = (w) * 0.0005;
      cometsRef.current.push({
        x: fromLeft ? -50 : w + 50,
        y: Math.random() * canvas.height * 0.5,
        vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr * 0.4,
        life: 0, max: 260,
      });
    };

    const drawBackground = (w: number, h: number, t: number) => {
      // Deep base
      ctx.fillStyle = "#040814";
      ctx.fillRect(0, 0, w, h);

      const img = bgImgRef.current;
      if (img && img.complete) {
        // cover w × h, with parallax pan (0.25× view) and very slow drift.
        const ar = img.width / img.height;
        const ch = h;
        const cw = ch * ar;
        const tilesNeeded = Math.ceil(w / cw) + 2;
        const drift = (t * 6) % cw;
        const parallaxX = (viewRef.current.x * 0.22 * dpr) % cw;
        const startX = -((drift + parallaxX) % cw) - cw;
        for (let i = 0; i < tilesNeeded + 1; i++) {
          const dx = startX + i * cw;
          // Mirror every other tile for seamless horizon
          ctx.save();
          if (i % 2 === 1) {
            ctx.translate(dx + cw, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, cw, ch);
          } else {
            ctx.drawImage(img, dx, 0, cw, ch);
          }
          ctx.restore();
        }
        // soft top fade to deepen sky
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "rgba(4,8,20,0.55)");
        grd.addColorStop(0.45, "rgba(4,8,20,0.15)");
        grd.addColorStop(1, "rgba(4,8,20,0.0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Fallback gradient until image loads
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#06112b");
        grd.addColorStop(0.55, "#0d2152");
        grd.addColorStop(1, "#0a1a3a");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      }

      // Extra twinkle bintang layer di langit
      for (const s of bgStars) {
        const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + s.tw);
        ctx.fillStyle = `rgba(220,235,255,${s.b * tw * 0.55})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Comet
      if (!real && Math.random() < 0.0045) spawnComet();
      cometsRef.current = cometsRef.current.filter((c) => c.life < c.max && c.x > -120 && c.x < w + 120);
      for (const c of cometsRef.current) {
        c.x += c.vx; c.y += c.vy; c.life += 1;
        const alpha = Math.min(1, c.life / 20) * Math.max(0, 1 - c.life / c.max);
        for (let i = 0; i < 22; i++) {
          const k = i / 22;
          ctx.fillStyle = `rgba(180,210,255,${alpha * (1 - k) * 0.55})`;
          ctx.beginPath();
          ctx.arc(c.x - c.vx * i * 1.6, c.y - c.vy * i * 1.6, (2.4 - k * 2.1) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.6 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      const view = viewRef.current;
      const anyActive = !!(selectedId ?? hoveredId);
      const w = canvas.width, h = canvas.height;
      const t = performance.now() / 1000;

      drawBackground(w, h, t);

      const z = view.zoom * dpr;
      const cx = w / 2 + view.x * dpr;
      const cy = h / 2 + view.y * dpr;
      const tileW = WORLD_W * z;
      const tileH = WORLD_H * z;

      // Determine which tile offsets are visible (infinite wrap, 3×3 max).
      const offsetsX: number[] = [];
      const offsetsY: number[] = [];
      for (let ox = -1; ox <= 1; ox++) {
        const screenX = cx + ox * tileW;
        if (screenX + tileW / 2 > -tileW * 0.6 && screenX - tileW / 2 < w + tileW * 0.6) offsetsX.push(ox * tileW);
      }
      for (let oy = -1; oy <= 1; oy++) {
        const screenY = cy + oy * tileH;
        if (screenY + tileH / 2 > -tileH * 0.6 && screenY - tileH / 2 < h + tileH * 0.6) offsetsY.push(oy * tileH);
      }

      const project = (x: number, y: number, ox: number, oy: number) => ({
        px: cx + x * z + ox,
        py: cy + y * z + oy,
      });

      // World tile border (very faint) at each visible tile
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = "rgba(120,170,255,0.06)";
      for (const ox of offsetsX) for (const oy of offsetsY) {
        ctx.strokeRect(cx - tileW / 2 + ox, cy - tileH / 2 + oy, tileW, tileH);
      }

      // Edges (MST per cluster → constellation chains, colored by cluster)
      for (const { color, pairs } of edgesByCluster) {
        for (const [aid, bid] of pairs) {
          const a = projected.get(aid), b = projected.get(bid);
          if (!a || !b) continue;
          const lit = anyActive && litSet.has(aid) && litSet.has(bid);
          const baseStroke = starMode === "cluster" ? color : "#cdd9ff";
          for (const ox of offsetsX) for (const oy of offsetsY) {
            const A = project(a.x, a.y, ox, oy);
            const B = project(b.x, b.y, ox, oy);
            if (Math.max(A.px, B.px) < -40 || Math.min(A.px, B.px) > w + 40) continue;
            if (Math.max(A.py, B.py) < -40 || Math.min(A.py, B.py) > h + 40) continue;
            ctx.strokeStyle = lit ? rgba(baseStroke, 0.92) : rgba(baseStroke, lineOpacity * 0.7);
            ctx.lineWidth = (lit ? 1.1 : 0.6) * dpr;
            ctx.beginPath();
            ctx.moveTo(A.px, A.py);
            ctx.lineTo(B.px, B.py);
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (const { x, y, node } of projected.values()) {
        const isSel = node.id === selectedId;
        const isHov = node.id === hoveredId;
        const isLit = litSet.has(node.id);
        const dim = anyActive && !isLit;
        const baseR =
          node.kind === "root" ? 4.6 :
          node.kind === "cluster" ? 4.0 :
          node.kind === "subhub" ? 2.8 :
          node.kind === "domain" || node.kind === "school" ? 2.2 :
          node.kind === "bab" || node.kind === "team" || node.kind === "role" || node.kind === "letter" ? 1.7 : 1.1;
        const r = baseR * (isSel || isHov ? 1.85 : 1) * dpr;

        let starColor = "#ffffff";
        if (starMode === "cluster") starColor = node.color;
        else if (starMode === "rainbow") {
          const hue = (x * 7 + y * 11) % 360;
          starColor = `hsl(${(hue + 360) % 360}, 80%, 70%)`;
        }

        for (const ox of offsetsX) for (const oy of offsetsY) {
          const { px, py } = project(x, y, ox, oy);
          if (px < -30 || px > w + 30 || py < -30 || py > h + 30) continue;
          // Halo
          const halo = ctx.createRadialGradient(px, py, 0, px, py, r * 6);
          halo.addColorStop(0, rgba(starColor, dim ? 0.06 : 0.55));
          halo.addColorStop(0.45, rgba(starColor, dim ? 0.02 : 0.18));
          halo.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(px, py, r * 6, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = dim ? rgba(starColor, 0.4) : starColor;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
          // 4-point sparkle for hubs
          if (baseR >= 2.6 && !dim) {
            ctx.strokeStyle = rgba(starColor, isSel || isHov ? 0.9 : 0.6);
            ctx.lineWidth = 0.6 * dpr;
            ctx.beginPath();
            ctx.moveTo(px - r * 3.6, py); ctx.lineTo(px + r * 3.6, py);
            ctx.moveTo(px, py - r * 3.6); ctx.lineTo(px, py + r * 3.6);
            ctx.stroke();
          }
          // Label
          if (node.kind === "root" || node.kind === "cluster" || node.kind === "subhub" || isSel || isHov) {
            ctx.globalAlpha = dim ? 0.35 : 1;
            ctx.font = `${node.kind === "root" ? 14 : node.kind === "cluster" ? 12 : 10}px DM Sans, sans-serif`;
            ctx.fillStyle = "rgba(232,244,255,0.95)";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(4,8,20,0.95)";
            ctx.shadowBlur = 6;
            ctx.fillText(node.label, px, py + r + 14 * dpr);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    // ─── Interactions ─── (infinite wrap-aware hit test)
    const screenToWorld = (sx: number, sy: number) => {
      const view = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = (sx - rect.left) * dpr;
      const py = (sy - rect.top) * dpr;
      const z = view.zoom * dpr;
      const cx = canvas.width / 2 + view.x * dpr;
      const cy = canvas.height / 2 + view.y * dpr;
      let wx = (px - cx) / z;
      let wy = (py - cy) / z;
      // wrap to canonical world tile
      wx = ((wx + WORLD_W / 2) % WORLD_W + WORLD_W) % WORLD_W - WORLD_W / 2;
      wy = ((wy + WORLD_H / 2) % WORLD_H + WORLD_H) % WORLD_H - WORLD_H / 2;
      return { x: wx, y: wy };
    };
    const hitTest = (sx: number, sy: number) => {
      const wp = screenToWorld(sx, sy);
      let best: { id: string; d: number } | null = null;
      for (const { x, y, node } of projected.values()) {
        const baseR = node.kind === "root" ? 7 : node.kind === "cluster" ? 6 : node.kind === "subhub" ? 5 : 3.5;
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
        if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
        viewRef.current.x = dragRef.current.vx + dx;
        viewRef.current.y = dragRef.current.vy + dy;
        return;
      }
      const id = hitTest(e.clientX, e.clientY);
      hover(id);
      canvas.style.cursor = id ? "pointer" : "grab";
    };
    const onDown = (e: PointerEvent) => {
      dragRef.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
      canvas.style.cursor = "grabbing";
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d && !d.moved) {
        const id = hitTest(e.clientX, e.clientY);
        if (id) select(id);
        else select(null);
      }
      dragRef.current = null;
      canvas.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0012);
      viewRef.current.zoom = Math.max(0.35, Math.min(4, viewRef.current.zoom * f));
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
  }, [graph, projected, edgesByCluster, bgStars, selectedId, hoveredId, litSet, hover, select,
      settings.realSky2D, settings.constellationLineOpacity, settings.starColorMode]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, background: "#040814", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ cursor: "grab", display: "block" }} />
      <div style={{
        position: "absolute", top: 12, left: 12, zIndex: 4,
        fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.25em",
        color: "#b8d0ff", padding: "5px 11px",
        background: "rgba(10,20,40,0.6)", border: "1px solid rgba(160,180,255,0.28)",
        borderRadius: 4, backdropFilter: "blur(8px)", pointerEvents: "none",
      }}>
        MONDSTADT · INFINITE SKY · DRAG / SCROLL TO PAN · WHEEL TO ZOOM
      </div>
    </div>
  );
}
