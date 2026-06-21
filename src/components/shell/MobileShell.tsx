import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useUniverse, useSettings } from "@/lib/store";
import { buildGraph, CLUSTER_META } from "@/lib/graph/build";
import { PanelContent } from "./panels/PanelContent";
import { FloatingPills } from "./mobile/FloatingPills";
import logo from "@/assets/smandash-logo.png";

const ICONS: Record<string, string> = {
  styles: "✦", roles: "◇", matter: "✧", motion: "◉", kamus: "◎",
  practice: "◐", circuit: "○", assistant: "✚", editor: "▤", meta: "·",
  competitor: "♟", active_member: "★", event: "♛",
};

export function MobileShell() {
  const layout = useSettings((s) => s.mobileLayout);
  if (layout === "pills") return <FloatingPills />;
  return <BottomSheetShell />;
}

function BottomSheetShell() {
  const selectedId = useUniverse((s) => s.selectedId);
  const select = useUniverse((s) => s.select);
  const focusCluster = useUniverse((s) => s.focusCluster);
  const setSearchOpen = useUniverse((s) => s.setSearchOpen);
  const setSettingsOpen = useUniverse((s) => s.setSettingsOpen);
  const setEditorUnlockOpen = useUniverse((s) => s.setEditorUnlockOpen);
  const editorMode = useUniverse((s) => s.editorMode);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const graph = useMemo(() => buildGraph(), []);
  const node = selectedId ? graph.byId.get(selectedId) : null;
  const hasNode = !!node && node.id !== "root";

  // bottom sheet snap points (pixels from bottom)
  const SNAPS = [64, Math.round(window.innerHeight * 0.5), Math.round(window.innerHeight * 0.92)];
  const [snap, setSnap] = useState(0);
  const y = useMotionValue(window.innerHeight - SNAPS[0]);

  useEffect(() => {
    // when a node is selected, snap to mid
    if (hasNode && snap === 0) {
      setSnap(1);
      animate(y, window.innerHeight - SNAPS[1], { type: "spring", stiffness: 260, damping: 30 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNode]);

  useEffect(() => {
    animate(y, window.innerHeight - SNAPS[snap], { type: "spring", stiffness: 260, damping: 30 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);

  return (
    <>
      {/* TOP BAR */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 52, zIndex: 30,
        background: "linear-gradient(180deg, rgba(5,8,15,0.92), rgba(5,8,15,0.6))",
        backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(168,85,247,0.15)",
        display: "flex", alignItems: "center", padding: "0 12px", gap: 8,
      }}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu"
          style={{ background: "transparent", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", width: 36, height: 36, borderRadius: 4, fontSize: 16, cursor: "pointer" }}
        >☰</button>
        <div onClick={() => { select("root"); focusCluster(null); }} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer" }}>
          <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: 999, filter: "drop-shadow(0 0 6px #ff5cf0)" }} />
          <div style={{ fontFamily: "Bebas Neue", letterSpacing: "0.14em", fontSize: 14, color: "#e8f4ff" }}>DEBATE COACH</div>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Cari"
          style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", width: 36, height: 36, borderRadius: 4, fontSize: 14, cursor: "pointer" }}
        >⌕</button>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", width: 36, height: 36, borderRadius: 4, fontSize: 14, cursor: "pointer" }}
        >⚙</button>
      </div>

      {/* DRAWER */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              style={{
                position: "fixed", top: 0, bottom: 0, left: 0, width: "min(280px, 82vw)", zIndex: 41,
                background: "linear-gradient(180deg, rgba(8,13,24,0.97), rgba(5,8,15,0.95))",
                borderRight: "1px solid rgba(168,85,247,0.18)", padding: "16px 8px",
                display: "flex", flexDirection: "column",
              }}
            >
              <div style={{ padding: "8px 12px 18px", borderBottom: "1px solid rgba(168,85,247,0.15)" }}>
                <div style={{ fontFamily: "Bebas Neue", letterSpacing: "0.14em", fontSize: 16, color: "#e8f4ff" }}>NAVIGASI</div>
                <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: "#3d5a7a", marginTop: 2 }}>v0.9 · MOBILE</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {CLUSTER_META.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => { focusCluster(c.key); setDrawerOpen(false); setSnap(0); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      background: "transparent", border: "none", borderLeft: "2px solid transparent",
                      color: "#8ba3c0", fontFamily: "DM Sans", fontSize: 13, letterSpacing: "0.05em", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ color: c.color, textShadow: `0 0 8px ${c.color}`, width: 18, textAlign: "center" }}>{ICONS[c.key] || "·"}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(168,85,247,0.12)" }}>
                <button
                  onClick={() => { setEditorUnlockOpen(true); setDrawerOpen(false); }}
                  style={{
                    width: "100%", padding: "10px", background: editorMode ? "rgba(0,255,200,0.12)" : "transparent",
                    border: `1px solid ${editorMode ? "rgba(0,255,200,0.5)" : "rgba(168,85,247,0.25)"}`,
                    color: editorMode ? "#00ffc8" : "#a855f7", cursor: "pointer", borderRadius: 4,
                    fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em",
                  }}
                >✎ EDITOR{editorMode ? " · AKTIF" : ""}</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: window.innerHeight - SNAPS[0] }}
        dragElastic={0.05}
        style={{
          position: "fixed", left: 0, right: 0, top: 0, height: window.innerHeight,
          y, zIndex: 25, pointerEvents: "none",
        }}
        onDragEnd={(_, info) => {
          const currentY = y.get();
          // pick nearest snap
          const distances = SNAPS.map((s) => Math.abs((window.innerHeight - s) - currentY));
          let nearest = 0; let min = distances[0];
          for (let i = 1; i < distances.length; i++) if (distances[i] < min) { min = distances[i]; nearest = i; }
          // velocity assist
          if (info.velocity.y > 600) nearest = Math.max(0, nearest - 1);
          if (info.velocity.y < -600) nearest = Math.min(SNAPS.length - 1, nearest + 1);
          setSnap(nearest);
        }}
      >
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "auto",
            background: "linear-gradient(180deg, rgba(11,18,32,0.97), rgba(5,8,15,0.95))",
            borderTop: `1px solid ${node?.color || "#a855f7"}55`,
            boxShadow: `0 -20px 60px -20px ${node?.color || "#a855f7"}33`,
            backdropFilter: "blur(18px)",
            borderRadius: "16px 16px 0 0",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* drag handle */}
          <div style={{ padding: "8px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 44, height: 4, borderRadius: 99, background: "rgba(168,85,247,0.4)" }} />
          </div>
          {/* header */}
          <div style={{ padding: "8px 18px 12px", borderBottom: `1px solid ${(node?.color || "#a855f7")}33`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: node?.color || "#a855f7", boxShadow: `0 0 10px ${node?.color || "#a855f7"}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.35em", color: node?.color || "#a855f7", textTransform: "uppercase" }}>
                {node ? `${node.kind} · ${node.cluster}` : "EXPLORE"}
              </div>
              <div style={{ fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: "0.05em", color: "#e8f4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {node ? node.label : "TARIK KE ATAS UNTUK MENU"}
              </div>
            </div>
            {hasNode && (
              <button
                onClick={() => { select(null); setSnap(0); }}
                aria-label="Tutup"
                style={{ background: "transparent", border: `1px solid ${node?.color}44`, color: node?.color, width: 28, height: 28, borderRadius: 4, cursor: "pointer", fontFamily: "Space Mono", fontSize: 12, flexShrink: 0 }}
              >✕</button>
            )}
          </div>
          <div className="panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px 18px 80px" }}>
            {hasNode && node ? (
              <PanelContent node={node} />
            ) : (
              <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "#8ba3c0", lineHeight: 1.7 }}>
                <p>Pilih bintang di peta untuk detail. Gunakan <b style={{ color: "#a855f7" }}>☰</b> untuk navigasi kluster, atau <b style={{ color: "#38bdf8" }}>⌕</b> untuk cari.</p>
                <p style={{ marginTop: 12, color: "#5a6f8a" }}>Tarik panel ini ke atas/bawah dengan jari untuk membuka tutup.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}