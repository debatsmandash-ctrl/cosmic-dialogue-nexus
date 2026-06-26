import { useEffect, useMemo, useRef } from "react";
import { buildGraph } from "@/lib/graph/build";
import { useUniverse } from "@/lib/store";
import type { StarNode } from "@/data/types";

/**
 * Universe2D — fallback rasi-bintang 2D untuk user yang kesulitan dengan 3D.
 * - Bukan galaksi (tidak ada disc/swirl).
 * - Pakai posisi node dari graph tapi diproyeksikan ke 2D (drop sumbu Z).
 * - Random twinkling stars di background.
 * - Klik/hover seperti versi 3D.
 */
export function Universe2D() {
  const graph = useMemo(() => buildGraph(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const select = useUniverse((s) => s.select);
  const hover = useUniverse((s) => s.hover);
  const selectedId = useUniverse((s) => s.selectedId);
  const hoveredId = useUniverse((s) => s.hoveredId);
  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  // background stars
  const bgStars = useMemo(() => {
    const arr: { x: number; y: number; r: number; b: number; tw: number }[] = [];
    for (let i = 0; i < 600; i++) {
      arr.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.3 + Math.random() * 1.4,
        b: 0.4 + Math.random() * 0.6,
        tw: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  // project graph nodes to 2D (drop Z, then scale)
  const projected = useMemo(() => {
    const map = new Map<string, { x: number; y: number; node: StarNode }>();
    for (const n of graph.nodes) {
      // XY plane projection — perspective dari Z
      const zPerspective = 1 + n.pos[2] / 400;
      map.set(n.id, {
        x: n.pos[0] * 6 / zPerspective,
        y: -n.pos[1] * 6 / zPerspective,
        node: n,
      });
    }
    return map;
  }, [graph]);

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

    const draw = () => {
      const view = viewRef.current;
      const anyActive = !!(selectedId ?? hoveredId);
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // background
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)/1.2);
      grad.addColorStop(0, "#0a1326");
      grad.addColorStop(0.5, "#050811");
      grad.addColorStop(1, "#020308");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const t = performance.now() / 1000;
      // bg twinkle
      for (const s of bgStars) {
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + s.tw);
        ctx.fillStyle = `rgba(${200 + s.b * 55 | 0},${210 + s.b * 45 | 0},255,${s.b * tw * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = w / 2 + view.x * dpr;
      const cy = h / 2 + view.y * dpr;
      const z = view.zoom * dpr;

      // edges
      ctx.lineWidth = 0.6 * dpr;
      for (const e of graph.edges) {
        if (e.kind === "link") continue;
        const a = projected.get(e.a), b = projected.get(e.b);
        if (!a || !b) continue;
        const lit = anyActive && litSet.has(e.a) && litSet.has(e.b);
        const dim = anyActive && !lit;
        ctx.strokeStyle = e.color || "#ffffff";
        ctx.globalAlpha = lit ? 0.9 : dim ? 0.04 : 0.18;
        ctx.beginPath();
        ctx.moveTo(cx + a.x * z, cy + a.y * z);
        ctx.lineTo(cx + b.x * z, cy + b.y * z);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // nodes
      for (const { x, y, node } of projected.values()) {
        const px = cx + x * z;
        const py = cy + y * z;
        const isSel = node.id === selectedId;
        const isHov = node.id === hoveredId;
        const isLit = litSet.has(node.id);
        const dim = anyActive && !isLit;
        const r = (1.5 + node.size * 8) * (isSel || isHov ? 1.4 : 1) * dpr;
        // halo
        const halo = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
        halo.addColorStop(0, node.color + "cc");
        halo.addColorStop(0.4, node.color + "44");
        halo.addColorStop(1, node.color + "00");
        ctx.globalAlpha = dim ? 0.15 : 0.7;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(px, py, r * 4, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.globalAlpha = dim ? 0.3 : 1;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // label for hubs
        if (node.kind === "root" || node.kind === "cluster" || node.kind === "subhub" || isSel || isHov) {
          ctx.globalAlpha = dim ? 0.4 : 1;
          ctx.font = `${node.kind === "root" ? 16 : node.kind === "cluster" ? 12 : 10}px DM Sans, sans-serif`;
          ctx.fillStyle = node.color;
          ctx.textAlign = "center";
          ctx.fillText(node.label, px, py + r + 14 * dpr);
        }
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };
    draw();

    // interactions
    const screenToWorld = (sx: number, sy: number) => {
      const view = viewRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = (sx - rect.left) * dpr;
      const py = (sy - rect.top) * dpr;
      const cx = canvas.width / 2 + view.x * dpr;
      const cy = canvas.height / 2 + view.y * dpr;
      const z = view.zoom * dpr;
      return { x: (px - cx) / z, y: (py - cy) / z };
    };
    const hitTest = (sx: number, sy: number) => {
      const wp = screenToWorld(sx, sy);
      let best: { id: string; d: number } | null = null;
      for (const { x, y, node } of projected.values()) {
        const r = 1.5 + node.size * 8 + 4;
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
      viewRef.current.zoom = Math.max(0.2, Math.min(6, viewRef.current.zoom * f));
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
  }, [graph, projected, bgStars, selectedId, hoveredId, litSet, hover, select]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, background: "#020308" }}>
      <canvas ref={canvasRef} style={{ cursor: "grab", display: "block" }} />
      <div style={{
        position: "absolute", top: 12, left: 12,
        fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em",
        color: "#a855f7", padding: "4px 10px",
        background: "rgba(11,18,32,0.7)", border: "1px solid rgba(168,85,247,0.3)",
        borderRadius: 4, backdropFilter: "blur(8px)",
      }}>2D MODE · DRAG TO PAN · SCROLL TO ZOOM</div>
    </div>
  );
}