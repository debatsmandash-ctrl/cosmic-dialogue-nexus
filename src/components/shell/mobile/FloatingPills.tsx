import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniverse } from "@/lib/store";
import { buildGraph, CLUSTER_META } from "@/lib/graph/build";
import { PanelContent } from "../panels/PanelContent";
import logo from "@/assets/smandash-logo.png";

const ICONS: Record<string, string> = {
  styles: "✦", roles: "◇", matter: "✧", motion: "◉", kamus: "◎",
  practice: "◐", circuit: "○", assistant: "✚", editor: "▤", meta: "·",
  competitor: "♟", active_member: "★", event: "♛",
};

/**
 * Floating pills layout — alternatif mobile yang minim cover peta.
 * Nav pill di atas (collapsible), info pill di bawah (expand on tap).
 */
export function FloatingPills() {
  const selectedId = useUniverse((s) => s.selectedId);
  const select = useUniverse((s) => s.select);
  const focusCluster = useUniverse((s) => s.focusCluster);
  const setSearchOpen = useUniverse((s) => s.setSearchOpen);
  const setSettingsOpen = useUniverse((s) => s.setSettingsOpen);

  const graph = useMemo(() => buildGraph(), []);
  const node = selectedId ? graph.byId.get(selectedId) : null;
  const hasNode = !!node && node.id !== "root";

  const [navOpen, setNavOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      {/* TOP PILL — logo + collapse nav + search + settings */}
      <div style={{
        position: "fixed", top: 10, left: 10, right: 10, zIndex: 30,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8,
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button
            onClick={() => { select("root"); focusCluster(null); }}
            aria-label="Home"
            style={pillStyle("#a855f7")}
          >
            <img src={logo} alt="" style={{ width: 18, height: 18, borderRadius: 999 }} />
          </button>
          <button onClick={() => setNavOpen((v) => !v)} aria-label="Nav" style={pillStyle("#a855f7")}>
            <span style={{ fontFamily: "Space Mono", fontSize: 11, letterSpacing: "0.2em" }}>{navOpen ? "✕" : "☰"}</span>
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, pointerEvents: "auto" }}>
          <button onClick={() => setSearchOpen(true)} aria-label="Cari" style={pillStyle("#38bdf8")}>⌕</button>
          <button onClick={() => setSettingsOpen(true)} aria-label="Settings" style={pillStyle("#a855f7")}>⚙</button>
        </div>
      </div>

      {/* NAV LIST (only when expanded) */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{
              position: "fixed", top: 60, left: 10, zIndex: 29,
              maxWidth: "calc(100vw - 20px)",
              background: "rgba(11,18,32,0.92)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(168,85,247,0.3)", borderRadius: 12, padding: 6,
              display: "grid", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 4,
              boxShadow: "0 10px 40px -10px rgba(168,85,247,0.35)",
            }}
          >
            {CLUSTER_META.map((c) => (
              <button
                key={c.key}
                onClick={() => { focusCluster(c.key); setNavOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  background: "transparent", border: "1px solid transparent", borderRadius: 8,
                  color: "#cbd5e1", fontFamily: "DM Sans", fontSize: 12, cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{ color: c.color, textShadow: `0 0 6px ${c.color}`, width: 16, textAlign: "center" }}>{ICONS[c.key] || "·"}</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM INFO PILL — collapsed when not expanded; tap to expand */}
      <AnimatePresence>
        {hasNode && node && (
          <motion.div
            key={node.id + (infoOpen ? "-open" : "-closed")}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            style={{
              position: "fixed", left: 10, right: 10, bottom: 10, zIndex: 30,
              background: "linear-gradient(180deg, rgba(11,18,32,0.95), rgba(5,8,15,0.92))",
              border: `1px solid ${node.color}55`, borderRadius: 14,
              boxShadow: `0 -10px 40px -10px ${node.color}44`, backdropFilter: "blur(16px)",
              maxHeight: infoOpen ? "62vh" : 68,
              display: "flex", flexDirection: "column", overflow: "hidden",
              transition: "max-height 280ms cubic-bezier(.7,0,.2,1)",
            }}
          >
            <div
              onClick={() => setInfoOpen((v) => !v)}
              style={{
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                borderBottom: infoOpen ? `1px solid ${node.color}33` : "none",
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 999, background: node.color, boxShadow: `0 0 10px ${node.color}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: node.color, textTransform: "uppercase" }}>{node.kind}</div>
                <div style={{ fontFamily: "Bebas Neue", fontSize: 16, letterSpacing: "0.05em", color: "#e8f4ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); select(null); }}
                aria-label="Tutup"
                style={{ background: "transparent", border: `1px solid ${node.color}44`, color: node.color, width: 26, height: 26, borderRadius: 4, cursor: "pointer", fontSize: 11 }}
              >✕</button>
              <span style={{ color: node.color, fontFamily: "Space Mono", fontSize: 12 }}>{infoOpen ? "▾" : "▸"}</span>
            </div>
            {infoOpen && (
              <div className="panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 14px 18px" }}>
                <PanelContent node={node} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function pillStyle(color: string): React.CSSProperties {
  return {
    width: 40, height: 40, borderRadius: 999,
    background: "rgba(11,18,32,0.88)", backdropFilter: "blur(12px)",
    border: `1px solid ${color}55`, color, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: `0 4px 16px -4px ${color}66`,
    fontSize: 16,
  };
}
