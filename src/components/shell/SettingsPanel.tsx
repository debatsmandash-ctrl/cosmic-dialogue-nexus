import { useUniverse, useSettings, type QualityPreset, type FpsCap } from "@/lib/store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.3em", color: "#a855f7", marginBottom: 10, textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "DM Sans", fontSize: 12, color: "#cbd5e1" }}>{label}</span>
        {children}
      </div>
      {hint && <div style={{ fontFamily: "DM Sans", fontSize: 10, color: "#5a6f8a", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{
        padding: "4px 10px", fontSize: 11, fontFamily: "Space Mono", letterSpacing: "0.1em",
        background: active ? "rgba(168,85,247,0.18)" : "transparent",
        border: `1px solid ${active ? "#a855f7" : "rgba(168,85,247,0.25)"}`,
        color: active ? "#e8f4ff" : "#8ba3c0", borderRadius: 4, cursor: "pointer",
      }}>{children}</button>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: 130, accentColor: "#a855f7" }} />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 38, height: 20, borderRadius: 99, position: "relative", cursor: "pointer",
        background: value ? "rgba(0,255,200,0.35)" : "rgba(168,85,247,0.15)",
        border: `1px solid ${value ? "#00ffc8" : "rgba(168,85,247,0.3)"}`,
      }}>
      <span style={{
        position: "absolute", top: 1, left: value ? 18 : 1, width: 16, height: 16, borderRadius: 99,
        background: value ? "#00ffc8" : "#a855f7", transition: "left 150ms",
      }} />
    </button>
  );
}

export function SettingsPanel() {
  const open = useUniverse((s) => s.settingsOpen);
  const setOpen = useUniverse((s) => s.setSettingsOpen);
  const s = useSettings();
  const update = useSettings((st) => st.update);
  const reset = useSettings((st) => st.reset);

  if (!open) return null;

  return (
    <>
      <div onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50 }} />
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(360px, 92vw)", zIndex: 51,
          background: "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(5,8,15,0.96))",
          borderLeft: "1px solid rgba(168,85,247,0.25)",
          backdropFilter: "blur(16px)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(168,85,247,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue", fontSize: 20, letterSpacing: "0.18em", color: "#e8f4ff" }}>SETTINGS</div>
            <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: "#5a6f8a", marginTop: 2 }}>PERFORMANCE · VISUAL · AUDIO</div>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width: 30, height: 30, background: "transparent", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", cursor: "pointer", borderRadius: 4 }}>✕</button>
        </div>

        <div className="panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          <Section title="Performance">
            <Row label="Quality preset" hint="Mengontrol nebula, bloom, dan kepadatan bintang">
              <div style={{ display: "flex", gap: 4 }}>
                {(["low","medium","high","ultra"] as QualityPreset[]).map(q => (
                  <Pill key={q} active={s.quality === q} onClick={() => update({ quality: q })}>{q.toUpperCase()}</Pill>
                ))}
              </div>
            </Row>
            <Row label="FPS cap" hint="0 = unlimited (gunakan refresh rate layar)">
              <div style={{ display: "flex", gap: 4 }}>
                {([0,30,60,120] as FpsCap[]).map(f => (
                  <Pill key={f} active={s.fpsCap === f} onClick={() => update({ fpsCap: f })}>{f === 0 ? "∞" : f}</Pill>
                ))}
              </div>
            </Row>
            <Row label="FPS counter"><Toggle value={s.showFps} onChange={(v) => update({ showFps: v })} /></Row>
          </Section>

          <Section title="Visual">
            <Row label={`Bloom ${s.bloomIntensity.toFixed(2)}`}>
              <Slider value={s.bloomIntensity} min={0} max={1.5} step={0.05} onChange={(v) => update({ bloomIntensity: v })} />
            </Row>
            <Row label={`Nebula opacity ${s.nebulaOpacity.toFixed(2)}`}>
              <Slider value={s.nebulaOpacity} min={0} max={1.2} step={0.05} onChange={(v) => update({ nebulaOpacity: v })} />
            </Row>
            <Row label={`Star size ×${s.starSize.toFixed(2)}`}>
              <Slider value={s.starSize} min={0.5} max={1.6} step={0.05} onChange={(v) => update({ starSize: v })} />
            </Row>
            <Row label="Hover edges"><Toggle value={s.showHoverEdges} onChange={(v) => update({ showHoverEdges: v })} /></Row>
          </Section>

          <Section title="Camera">
            <Row label="Auto-rotate"><Toggle value={s.autoRotate} onChange={(v) => update({ autoRotate: v })} /></Row>
            <Row label={`Rotate speed ${s.autoRotateSpeed.toFixed(2)}`}>
              <Slider value={s.autoRotateSpeed} min={0.05} max={1.5} step={0.05} onChange={(v) => update({ autoRotateSpeed: v })} />
            </Row>
            <Row label={`Damping ${s.damping.toFixed(2)}`}>
              <Slider value={s.damping} min={0.04} max={0.2} step={0.01} onChange={(v) => update({ damping: v })} />
            </Row>
            <Row label={`Drag sensitivity ×${s.cameraRotateSpeed.toFixed(2)}`} hint="Kecepatan rotasi saat menyeret">
              <Slider value={s.cameraRotateSpeed} min={0.3} max={3.0} step={0.05} onChange={(v) => update({ cameraRotateSpeed: v })} />
            </Row>
            <Row label={`Zoom sensitivity ×${s.cameraZoomSpeed.toFixed(2)}`}>
              <Slider value={s.cameraZoomSpeed} min={0.3} max={3.0} step={0.05} onChange={(v) => update({ cameraZoomSpeed: v })} />
            </Row>
            <Row label={`Pan sensitivity ×${s.cameraPanSpeed.toFixed(2)}`}>
              <Slider value={s.cameraPanSpeed} min={0.3} max={3.0} step={0.05} onChange={(v) => update({ cameraPanSpeed: v })} />
            </Row>
          </Section>

          <Section title="Audio">
            <Row label="Background music"><Toggle value={!s.audioMuted} onChange={(v) => update({ audioMuted: !v })} /></Row>
            <Row label={`Volume ${(s.audioVolume*100).toFixed(0)}%`}>
              <Slider value={s.audioVolume} min={0} max={1} step={0.05} onChange={(v) => update({ audioVolume: v })} />
            </Row>
          </Section>

          <Section title="Mobile Layout">
            <Row label="Style" hint="Berlaku di tampilan HP/tablet sentuh">
              <div style={{ display: "flex", gap: 4 }}>
                <Pill active={s.mobileLayout === "sheet"} onClick={() => update({ mobileLayout: "sheet" })}>SHEET</Pill>
                <Pill active={s.mobileLayout === "pills"} onClick={() => update({ mobileLayout: "pills" })}>PILLS</Pill>
              </div>
            </Row>
          </Section>

          <Section title="Accessibility">
            <Row label="Reduced motion" hint="Matikan auto-rotate dan animasi transisi">
              <Toggle value={s.reducedMotion} onChange={(v) => update({ reducedMotion: v, autoRotate: v ? false : s.autoRotate })} />
            </Row>
            <Row label="High-contrast labels"><Toggle value={s.highContrastLabels} onChange={(v) => update({ highContrastLabels: v })} /></Row>
          </Section>

          <button onClick={() => reset()}
            style={{ width: "100%", padding: "10px", marginTop: 8, background: "transparent",
              border: "1px solid rgba(251,113,133,0.4)", color: "#fb7185", cursor: "pointer", borderRadius: 4,
              fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em" }}>
            RESET TO DEFAULTS
          </button>
        </div>
      </aside>
    </>
  );
}