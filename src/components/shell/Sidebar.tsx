import { useUniverse, useSettings } from "@/lib/store";
import { CLUSTER_META } from "@/lib/graph/build";
import { useState } from "react";
import { usePointerDrag } from "@/hooks/usePointerDrag";
import logo from "@/assets/smandash-logo.png";

const ICONS: Record<string, string> = {
  styles: "✦", roles: "◇", matter: "✧", motion: "◉", jenis: "▴",
  kamus: "◎", practice: "◐", circuit: "○", assistant: "✚", editor: "▤", meta: "·",
  competitor: "♟", active_member: "★", event: "♛",
};

export function Sidebar() {
  const focusCluster = useUniverse((s) => s.focusCluster);
  const focusClusterKey = useUniverse((s) => s.focusClusterKey);
  const select = useUniverse((s) => s.select);
  const setSearchOpen = useUniverse((s) => s.setSearchOpen);
  const setSettingsOpen = useUniverse((s) => s.setSettingsOpen);
  const setAssistantOpen = useUniverse((s) => s.setAssistantOpen);
  const setEditorUnlockOpen = useUniverse((s) => s.setEditorUnlockOpen);
  const editorMode = useUniverse((s) => s.editorMode);
  const [collapsed, setCollapsed] = useState(false);
  const offset = useSettings((s) => s.sidebarOffset);
  const update = useSettings((s) => s.update);
  const drag = usePointerDrag(offset, (next) => update({ sidebarOffset: next }));

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? 56 : 240,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        background: "linear-gradient(180deg, rgba(8,13,24,0.95), rgba(5,8,15,0.85))",
        borderRight: "1px solid rgba(168,85,247,0.18)",
        backdropFilter: "blur(14px)",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        transition: "width 220ms cubic-bezier(.7,0,.2,1)",
      }}
    >
      <div
        onClick={() => { select("root"); focusCluster(null); }}
        style={{
          padding: "16px 14px",
          borderBottom: "1px solid rgba(168,85,247,0.12)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <img
          src={logo}
          alt="SMANDASH"
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            objectFit: "contain",
            filter: "drop-shadow(0 0 8px #ff5cf0) drop-shadow(0 0 14px #a855f7)",
            flexShrink: 0,
          }}
        />
        {!collapsed && (
          <div>
            <div style={{ fontFamily: "Bebas Neue", letterSpacing: "0.14em", fontSize: 16, color: "#e8f4ff" }}>
              DEBATE COACH
            </div>
            <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: "#3d5a7a" }}>
              v0.9 · STAR UNIVERSE
            </div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }} className="panel-scroll">
        {CLUSTER_META.map((c) => {
          const active = focusClusterKey === c.key;
          return (
            <button
              key={c.key}
              onClick={() => focusCluster(c.key)}
              title={c.label}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                marginBottom: 4,
                background: active ? `linear-gradient(90deg, ${c.color}22, transparent)` : "transparent",
                border: "none",
                borderLeft: active ? `2px solid ${c.color}` : "2px solid transparent",
                color: active ? c.color : "#8ba3c0",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12,
                letterSpacing: "0.08em",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 160ms",
              }}
              onMouseOver={(e) => { if (!active) (e.currentTarget.style.color = c.color); }}
              onMouseOut={(e) => { if (!active) (e.currentTarget.style.color = "#8ba3c0"); }}
            >
              <span
                style={{
                  width: 18,
                  textAlign: "center",
                  color: c.color,
                  textShadow: `0 0 8px ${c.color}`,
                  fontSize: 14,
                }}
              >
                {ICONS[c.key] || "·"}
              </span>
              {!collapsed && <span style={{ flex: 1 }}>{c.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: 10, borderTop: "1px solid rgba(168,85,247,0.12)", display: "flex", gap: 8 }}>
        <button
          onClick={() => setSearchOpen(true)}
          title="Cari (⌘K)"
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.25)",
            color: "#38bdf8",
            fontFamily: "Space Mono",
            fontSize: 10,
            letterSpacing: "0.2em",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          ⌘K CARI
        </button>
        <button
          onClick={() => setAssistantOpen(true)}
          title="AI Assistant"
          style={{
            padding: "8px 10px",
            background: "rgba(0,212,170,0.12)",
            border: "1px solid rgba(0,212,170,0.4)",
            color: "#00d4aa",
            cursor: "pointer", borderRadius: 4,
            fontFamily: "Space Mono", fontSize: 11,
          }}
        >✚AI</button>
        <button
          onClick={() => setEditorUnlockOpen(true)}
          title={editorMode ? "Editor aktif — klik untuk kelola" : "Buka mode editor"}
          style={{
            padding: "8px 10px",
            background: editorMode ? "rgba(0,255,200,0.12)" : "transparent",
            border: `1px solid ${editorMode ? "rgba(0,255,200,0.5)" : "rgba(168,85,247,0.25)"}`,
            color: editorMode ? "#00ffc8" : "#a855f7",
            cursor: "pointer",
            borderRadius: 4,
            fontFamily: "Space Mono",
            fontSize: 11,
          }}
        >
          ✎
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          style={{
            padding: "8px 10px", background: "transparent",
            border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7",
            cursor: "pointer", borderRadius: 4, fontFamily: "Space Mono", fontSize: 12,
          }}
        >⚙</button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          title="Lipat"
          style={{
            padding: "8px 10px",
            background: "transparent",
            border: "1px solid rgba(168,85,247,0.25)",
            color: "#a855f7",
            cursor: "pointer",
            borderRadius: 4,
          }}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Drag handle — geser panel; double-click utk reset */}
      <div
        title="Geser panel — double-click utk reset"
        onDoubleClick={() => update({ sidebarOffset: { x: 0, y: 0 } })}
        {...drag}
        style={{
          position: "absolute", top: "50%", right: -6, transform: "translateY(-50%)",
          width: 12, height: 56, borderRadius: 6,
          background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)",
          cursor: "grab", touchAction: "none", zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <span style={{ width: 2, height: 24, background: "rgba(232,244,255,0.5)", borderRadius: 2 }} />
      </div>
    </aside>
  );
}