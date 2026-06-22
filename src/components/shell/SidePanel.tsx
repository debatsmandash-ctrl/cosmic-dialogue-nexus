import { AnimatePresence, motion } from "framer-motion";
import { useUniverse, useSettings } from "@/lib/store";
import { buildGraph } from "@/lib/graph/build";
import { invalidateGraphCache } from "@/lib/graph/build";
import { useMemo, useState, useEffect } from "react";
import { PanelContent } from "./panels/PanelContent";
import { setOverride, loadOverrides, clearOverrides, exportOverrides } from "@/lib/editor/overrides";
import { usePointerDrag } from "@/hooks/usePointerDrag";

const KIND_GLYPH: Record<string, string> = {
  cluster: "✦", subhub: "◈", root: "★",
  motion: "◉", jenis: "▣",
  vocab: "A", letter: "α",
  domain: "◆", bab: "❋", subbab: "•",
  style: "✺",
  role: "◐", roleskill: "◦",
  school: "▲", team: "▶", speaker: "✪",
  bracket: "♛",
  section: "◇",
};
function kindGlyph(k: string) { return KIND_GLYPH[k] || "★"; }
function crownLabel(c: string) {
  if (c === "best-speaker") return "★ BEST SPEAKER";
  if (c === "j1") return "🥇 JUARA 1";
  if (c === "j2") return "🥈 JUARA 2";
  if (c === "j3") return "🥉 JUARA 3";
  return c.toUpperCase();
}


export function SidePanel() {
  const selectedId = useUniverse((s) => s.selectedId);
  const select = useUniverse((s) => s.select);
  const editorMode = useUniverse((s) => s.editorMode);
  const graph = useMemo(() => buildGraph(), []);
  const node = selectedId ? graph.byId.get(selectedId) : null;
  const open = !!node && node.id !== "root";
  const [labelDraft, setLabelDraft] = useState("");
  useEffect(() => { if (node) setLabelDraft(node.label); }, [node]);
  const offset = useSettings((s) => s.sidePanelOffset);
  const update = useSettings((s) => s.update);
  const drag = usePointerDrag(offset, (next) => update({ sidePanelOffset: next }));

  return (
    <AnimatePresence>
      {open && node && (
        <motion.aside
          key={node.id}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          style={{
            position: "fixed",
            top: offset.y,
            right: -offset.x,
            bottom: -offset.y,
            width: "min(560px, 92vw)",
            background: "linear-gradient(180deg, rgba(11,18,32,0.95), rgba(5,8,15,0.92))",
            borderLeft: `1px solid ${node.color}55`,
            boxShadow: `-30px 0 60px -20px ${node.color}33`,
            backdropFilter: "blur(18px)",
            zIndex: 25,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              position: "relative",
              padding: "26px 24px 22px",
              borderBottom: `1px solid ${node.color}40`,
              background: `
                radial-gradient(140% 100% at 0% 0%, ${node.color}28, transparent 55%),
                radial-gradient(120% 90% at 100% 100%, ${node.color}18, transparent 60%),
                linear-gradient(135deg, ${node.color}10, transparent 75%)
              `,
              overflow: "hidden",
            }}
          >
            {/* dekorasi orbit halus */}
            <div
              aria-hidden
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `repeating-linear-gradient(115deg, transparent 0 14px, ${node.color}10 14px 15px)`,
                opacity: 0.35, mixBlendMode: "screen",
              }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, position: "relative", zIndex: 1 }}>
              <div
                style={{
                  width: 54, height: 54, borderRadius: 12,
                  background: `radial-gradient(circle at 30% 30%, ${node.color}, ${node.color}55 60%, transparent 100%)`,
                  boxShadow: `0 0 22px ${node.color}88, inset 0 0 18px ${node.color}55`,
                  border: `1px solid ${node.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Bebas Neue", fontSize: 26, color: "#05080f",
                  textShadow: `0 0 8px ${node.color}`,
                  flexShrink: 0,
                }}
              >
                {kindGlyph(node.kind)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.4em",
                    color: node.color, opacity: 0.9,
                  }}
                >
                  {node.kind.toUpperCase()} · {node.cluster.toUpperCase()}
                </div>
                <h2
                  style={{
                    fontFamily: "Bebas Neue", fontSize: 32, lineHeight: 1.02,
                    letterSpacing: "0.05em", color: "#f6faff", marginTop: 6,
                    textShadow: `0 0 18px ${node.color}66`,
                  }}
                >
                  {node.label}
                </h2>
                {node.crown && (
                  <div style={{ marginTop: 8, fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em", color: "#fde047" }}>
                    {crownLabel(node.crown)}
                  </div>
                )}
              </div>
              <button
                onClick={() => select(null)}
                aria-label="Close panel"
                style={{
                  background: "rgba(5,8,15,0.5)",
                  border: `1px solid ${node.color}55`,
                  color: node.color,
                  width: 34, height: 34, borderRadius: 6,
                  cursor: "pointer", fontSize: 16, fontFamily: "Space Mono",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          </header>


          <div className="panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 24px 40px" }}>
            <PanelContent node={node} />
            {editorMode && (
              <div style={{ marginTop: 28, padding: "14px 16px", background: "rgba(0,255,200,0.05)", border: "1px solid rgba(0,255,200,0.25)", borderRadius: 4 }}>
                <div style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.35em", color: "#00ffc8", marginBottom: 10 }}>EDITOR · {node.id}</div>
                <label style={{ display: "block", fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.2em", color: "#8ba3c0" }}>LABEL</label>
                <input
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", background: "rgba(5,8,15,0.6)", border: "1px solid rgba(168,85,247,0.3)", color: "#e8f4ff", fontFamily: "DM Sans", fontSize: 13, borderRadius: 3, outline: "none" }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  <button
                    onClick={() => { setOverride(node.id, { label: labelDraft }); invalidateGraphCache(); location.reload(); }}
                    style={{ padding: "6px 12px", background: "rgba(0,255,200,0.15)", border: "1px solid rgba(0,255,200,0.45)", color: "#00ffc8", cursor: "pointer", borderRadius: 3, fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.15em" }}
                  >SIMPAN</button>
                  <button
                    onClick={() => { setOverride(node.id, { deleted: true }); invalidateGraphCache(); select(null); location.reload(); }}
                    style={{ padding: "6px 12px", background: "rgba(255,92,92,0.1)", border: "1px solid rgba(255,92,92,0.4)", color: "#ff5c5c", cursor: "pointer", borderRadius: 3, fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.15em" }}
                  >HAPUS</button>
                  <button
                    onClick={() => {
                      const blob = new Blob([exportOverrides()], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "overrides.json"; a.click(); URL.revokeObjectURL(url);
                    }}
                    style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(168,85,247,0.35)", color: "#a855f7", cursor: "pointer", borderRadius: 3, fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.15em" }}
                  >EXPORT</button>
                  <button
                    onClick={() => { if (confirm("Reset semua perubahan editor?")) { clearOverrides(); invalidateGraphCache(); location.reload(); } }}
                    style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(168,85,247,0.25)", color: "#8ba3c0", cursor: "pointer", borderRadius: 3, fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.15em" }}
                  >RESET</button>
                </div>
                <div style={{ marginTop: 10, fontFamily: "Space Mono", fontSize: 9, color: "#5a6f8a", lineHeight: 1.5 }}>
                  Override disimpan di localStorage browser. {Object.keys(loadOverrides()).length} node ditimpa.
                </div>
              </div>
            )}
          </div>

          {/* Drag handle (kiri) — geser panel; double-click utk reset */}
          <div
            title="Geser panel — double-click utk reset"
            onDoubleClick={() => update({ sidePanelOffset: { x: 0, y: 0 } })}
            {...drag}
            style={{
              position: "absolute", top: "50%", left: -6, transform: "translateY(-50%)",
              width: 12, height: 56, borderRadius: 6,
              background: `${node.color}30`, border: `1px solid ${node.color}66`,
              cursor: "grab", touchAction: "none", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ width: 2, height: 24, background: "rgba(232,244,255,0.6)", borderRadius: 2 }} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}