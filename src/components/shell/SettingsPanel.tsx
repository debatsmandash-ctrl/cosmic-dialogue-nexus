import { useState, useEffect } from "react";
import { useUniverse, useSettings, type QualityPreset, type FpsCap, type ThemePalette, type CameraPreset } from "@/lib/store";
import { TRACKS, DEFAULT_ENABLED_TRACKS } from "@/lib/playlist";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.3em", color: "var(--au-purple)", marginBottom: 10, textTransform: "uppercase" }}>{title}</div>
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

function Pill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  const c = color || "var(--au-purple)";
  return (
    <button onClick={onClick}
      style={{
        padding: "4px 10px", fontSize: 11, fontFamily: "Space Mono", letterSpacing: "0.1em",
        background: active ? `color-mix(in oklab, ${c} 18%, transparent)` : "transparent",
        border: `1px solid ${active ? c : "rgba(168,85,247,0.25)"}`,
        color: active ? "#e8f4ff" : "#8ba3c0", borderRadius: 4, cursor: "pointer",
      }}>{children}</button>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: 140, accentColor: "var(--au-purple)" }} />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 38, height: 20, borderRadius: 99, position: "relative", cursor: "pointer",
        background: value ? "rgba(0,255,200,0.35)" : "rgba(168,85,247,0.15)",
        border: `1px solid ${value ? "var(--au-cyan)" : "rgba(168,85,247,0.3)"}`,
      }}>
      <span style={{
        position: "absolute", top: 1, left: value ? 18 : 1, width: 16, height: 16, borderRadius: 99,
        background: value ? "var(--au-cyan)" : "var(--au-purple)", transition: "left 150ms",
      }} />
    </button>
  );
}

type TabKey = "display" | "rover" | "theme" | "density" | "perf" | "audio" | "a11y";

export function SettingsPanel() {
  const open = useUniverse((s) => s.settingsOpen);
  const setOpen = useUniverse((s) => s.setSettingsOpen);
  const s = useSettings();
  const update = useSettings((st) => st.update);
  const reset = useSettings((st) => st.reset);
  const [tab, setTab] = useState<TabKey>("display");

  // Apply theme palette + font scale to document immediately.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    body.classList.remove("theme-aurora", "theme-sunset", "theme-emerald", "theme-mono");
    body.classList.add(`theme-${s.themePalette}`);
  }, [s.themePalette]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.remove("font-scale-sm", "font-scale-md", "font-scale-lg", "font-scale-xl");
    const cls = s.fontScale <= 0.95 ? "font-scale-sm" : s.fontScale <= 1.05 ? "font-scale-md" : s.fontScale <= 1.18 ? "font-scale-lg" : "font-scale-xl";
    html.classList.add(cls);
  }, [s.fontScale]);

  if (!open) return null;

  const trackMap = { ...DEFAULT_ENABLED_TRACKS, ...s.enabledTracks };

  const TABS: [TabKey, string][] = [
    ["display", "DISPLAY"],
    ["rover", "ROVER"],
    ["theme", "TEMA"],
    ["density", "DENSITY"],
    ["perf", "PERF"],
    ["audio", "AUDIO"],
    ["a11y", "A11Y"],
  ];

  return (
    <>
      <div onClick={() => setOpen(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50 }} />
      <aside
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 96vw)", zIndex: 51,
          background: "linear-gradient(180deg, rgba(8,13,24,0.98), rgba(5,8,15,0.96))",
          borderLeft: "1px solid rgba(168,85,247,0.25)",
          backdropFilter: "blur(16px)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(168,85,247,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Bebas Neue", fontSize: 22, letterSpacing: "0.18em", color: "var(--au-text)" }}>SETTINGS</div>
            <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: "#5a6f8a", marginTop: 2 }}>DISPLAY · ROVER · TEMA · DENSITY · PERF · AUDIO · A11Y</div>
          </div>
          <button onClick={() => setOpen(false)}
            style={{ width: 30, height: 30, background: "transparent", border: "1px solid rgba(168,85,247,0.3)", color: "var(--au-purple)", cursor: "pointer", borderRadius: 4 }}>✕</button>
        </div>

        {/* Tabs (horizontal scroll if needed) */}
        <div style={{ display: "flex", padding: "0 8px", borderBottom: "1px solid rgba(168,85,247,0.12)", gap: 2, overflowX: "auto", flexShrink: 0 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                flex: "0 0 auto", padding: "10px 12px", background: "transparent",
                border: "none", borderBottom: `2px solid ${tab === k ? "var(--au-purple)" : "transparent"}`,
                color: tab === k ? "var(--au-text)" : "#5a6f8a", cursor: "pointer",
                fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.2em", whiteSpace: "nowrap",
              }}>{label}</button>
          ))}
        </div>

        <div className="panel-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {tab === "display" && (<>
            <Section title="View Mode">
              <Row label="Mode" hint="2D ringan & estetik (langit malam dgn rasi bintang)">
                <div style={{ display: "flex", gap: 4 }}>
                  <Pill active={s.viewMode === "3d"} onClick={() => update({ viewMode: "3d" })}>3D</Pill>
                  <Pill active={s.viewMode === "2d"} onClick={() => update({ viewMode: "2d" })}>2D</Pill>
                </div>
              </Row>
              <Row label="2D · Langit Real" hint="Bintang murni — matikan aurora & komet hias">
                <Toggle value={s.realSky2D} onChange={(v) => update({ realSky2D: v })} />
              </Row>
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
            <Section title="Mobile Layout">
              <Row label="Style" hint="Berlaku di tampilan HP/tablet sentuh">
                <div style={{ display: "flex", gap: 4 }}>
                  <Pill active={s.mobileLayout === "sheet"} onClick={() => update({ mobileLayout: "sheet" })}>SHEET</Pill>
                  <Pill active={s.mobileLayout === "pills"} onClick={() => update({ mobileLayout: "pills" })}>PILLS</Pill>
                </div>
              </Row>
            </Section>
          </>)}

          {tab === "rover" && (<>
            <Section title="Camera Preset">
              <Row label="Mode kamera" hint="Pengubah cara kamera mengamati bola">
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {([
                    ["free", "FREE"], ["orbit", "ORBIT"], ["top", "TOP-DOWN"], ["tour", "TOUR"],
                  ] as [CameraPreset, string][]).map(([k, label]) => (
                    <Pill key={k} active={s.cameraPreset === k} onClick={() => update({ cameraPreset: k })}>{label}</Pill>
                  ))}
                </div>
              </Row>
              <Row label="Auto-rotate"><Toggle value={s.autoRotate} onChange={(v) => update({ autoRotate: v })} /></Row>
              <Row label={`Rotate speed ${s.autoRotateSpeed.toFixed(2)}`}>
                <Slider value={s.autoRotateSpeed} min={0.05} max={1.5} step={0.05} onChange={(v) => update({ autoRotateSpeed: v })} />
              </Row>
              <Row label={`Damping ${s.damping.toFixed(2)}`}>
                <Slider value={s.damping} min={0.04} max={0.2} step={0.01} onChange={(v) => update({ damping: v })} />
              </Row>
            </Section>
            <div style={{
              padding: "10px 12px", borderRadius: 4,
              background: "rgba(0,255,200,0.05)", border: "1px solid rgba(0,255,200,0.2)",
              fontFamily: "DM Sans", fontSize: 11, color: "#a8c8d8", lineHeight: 1.6,
            }}>
              <b style={{ color: "var(--au-cyan)" }}>FREE</b> — kontrol manual penuh.<br/>
              <b style={{ color: "var(--au-cyan)" }}>ORBIT</b> — kamera mengorbit otomatis pada radius tetap.<br/>
              <b style={{ color: "var(--au-cyan)" }}>TOP-DOWN</b> — pandangan dari atas seluruh bola.<br/>
              <b style={{ color: "var(--au-cyan)" }}>TOUR</b> — fly-through 4 titik mengelilingi shell.
            </div>
          </>)}

          {tab === "theme" && (<>
            <Section title="Palette Universe">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {([
                  ["aurora",  "AURORA · biru-ungu", ["#00ffc8", "#a855f7", "#38bdf8"]],
                  ["sunset",  "SUNSET · magenta",   ["#ff8b3d", "#ff2d8a", "#ffd166"]],
                  ["emerald", "EMERALD · hijau",    ["#34d399", "#5eead4", "#22d3ee"]],
                  ["mono",    "MONO · monokrom",    ["#e8f4ff", "#cbd5e1", "#94a3b8"]],
                ] as [ThemePalette, string, string[]][]).map(([k, label, colors]) => {
                  const active = s.themePalette === k;
                  return (
                    <button key={k} onClick={() => update({ themePalette: k })}
                      style={{
                        padding: "10px 12px", textAlign: "left", cursor: "pointer", borderRadius: 4,
                        background: active ? "rgba(168,85,247,0.10)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${active ? "var(--au-purple)" : "rgba(168,85,247,0.18)"}`,
                      }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        {colors.map((c) => (
                          <span key={c} style={{ width: 18, height: 18, borderRadius: 4, background: c, boxShadow: `0 0 8px ${c}88` }} />
                        ))}
                      </div>
                      <div style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.15em", color: active ? "#e8f4ff" : "#8ba3c0" }}>{label}</div>
                    </button>
                  );
                })}
              </div>
            </Section>
          </>)}

          {tab === "density" && (<>
            <Section title="3D Shell">
              <Row label={`Shell noise ±${s.shellNoise.toFixed(1)}`} hint="Ketebalan 'kulit' bola — 0 = halus, 6 = pecah organik">
                <Slider value={s.shellNoise} min={0} max={6} step={0.2} onChange={(v) => update({ shellNoise: v })} />
              </Row>
              <Row label={`Background stars ${s.backgroundStars}`} hint="Jumlah bintang latar (efek perf)">
                <Slider value={s.backgroundStars} min={500} max={5000} step={100} onChange={(v) => update({ backgroundStars: v })} />
              </Row>
            </Section>
            <div style={{
              padding: "10px 12px", borderRadius: 4,
              background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)",
              fontFamily: "DM Sans", fontSize: 11, color: "#a8b8d0", lineHeight: 1.6,
            }}>
              Shell radius tetap di <b>62 unit</b> agar semua section selalu jadi satu bola utuh. Atur <i>shell noise</i> untuk bikin kulit terasa padat (0) atau berserabut organik (6).
            </div>
          </>)}

          {tab === "perf" && (<>
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
          </>)}

          {tab === "audio" && (<>
            <Section title="Audio">
              <Row label="Background music"><Toggle value={!s.audioMuted} onChange={(v) => update({ audioMuted: !v })} /></Row>
              <Row label={`Volume ${(s.audioVolume*100).toFixed(0)}%`}>
                <Slider value={s.audioVolume} min={0} max={1} step={0.05} onChange={(v) => update({ audioVolume: v })} />
              </Row>
              <Row label="Play mode">
                <div style={{ display: "flex", gap: 4 }}>
                  <Pill active={s.playMode === "shuffle"} onClick={() => update({ playMode: "shuffle" })}>SHUFFLE</Pill>
                  <Pill active={s.playMode === "sequential"} onClick={() => update({ playMode: "sequential" })}>URUT</Pill>
                </div>
              </Row>
            </Section>
            <Section title="Playlist">
              <div style={{ fontFamily: "DM Sans", fontSize: 10, color: "#5a6f8a", marginBottom: 6 }}>
                Centang lagu yang ingin diputar. Minimum 1 lagu aktif.
              </div>
              {TRACKS.map((t) => {
                const on = trackMap[t.id] !== false;
                const activeCount = TRACKS.filter((x) => trackMap[x.id] !== false).length;
                const canDisable = activeCount > 1 || !on;
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 10px", borderRadius: 4, gap: 8,
                    background: on ? "rgba(0,255,200,0.06)" : "transparent",
                    border: `1px solid ${on ? "rgba(0,255,200,0.25)" : "rgba(168,85,247,0.15)"}`,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: "DM Sans", fontSize: 12, color: on ? "var(--au-text)" : "#8ba3c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                      <div style={{ fontFamily: "DM Sans", fontSize: 10, color: "#5a6f8a" }}>{t.artist}</div>
                    </div>
                    <Toggle
                      value={on}
                      onChange={(v) => {
                        if (!v && !canDisable) return;
                        update({ enabledTracks: { ...trackMap, [t.id]: v } });
                      }}
                    />
                  </div>
                );
              })}
            </Section>
          </>)}

          {tab === "a11y" && (<>
            <Section title="Accessibility">
              <Row label={`Font scale ×${s.fontScale.toFixed(2)}`} hint="Memperbesar seluruh teks UI">
                <Slider value={s.fontScale} min={0.9} max={1.3} step={0.05} onChange={(v) => update({ fontScale: v })} />
              </Row>
              <Row label="Reduced motion" hint="Matikan auto-rotate dan animasi transisi">
                <Toggle value={s.reducedMotion} onChange={(v) => update({ reducedMotion: v, autoRotate: v ? false : s.autoRotate })} />
              </Row>
              <Row label="High-contrast labels"><Toggle value={s.highContrastLabels} onChange={(v) => update({ highContrastLabels: v })} /></Row>
            </Section>
          </>)}

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
