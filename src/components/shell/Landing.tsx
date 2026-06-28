import { useEffect, useRef, useState } from "react";
import { MOTIONS, MATTER, VOCAB, ROLES, COMPETITORS, ACTIVE_MEMBERS, EVENTS } from "@/data";

/**
 * Landing — Corporate scroll lobby (Bloomberg × Linear).
 * Vertical scroll, fixed top-left brand, dark dense data tone.
 * On ENTER → calls onDone() which unmounts and reveals the 3D universe.
 */

const ACCENT = "#38bdf8";
const ACCENT_2 = "#a855f7";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Ticker() {
  const items = [
    `MOTIONS · ${MOTIONS.length}`,
    `MATTER DOMAINS · ${Object.keys(MATTER).length}`,
    `VOCAB · ${VOCAB.length}`,
    `ROLES · ${ROLES.length}`,
    `COMPETITORS · ${COMPETITORS.length}`,
    `ACTIVE MEMBERS · ${ACTIVE_MEMBERS.length}`,
    `EVENTS · ${EVENTS.length}`,
    "STATUS · OPERATIONAL",
    "BUILD · v0.9",
    "REGION · ID-JKT",
  ];
  const row = [...items, ...items, ...items];
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(8,12,22,0.7)",
    }}>
      <div style={{
        display: "inline-flex", gap: 36, whiteSpace: "nowrap",
        animation: "ticker 60s linear infinite",
        padding: "10px 0",
        fontFamily: "Space Mono, monospace", fontSize: 11, letterSpacing: "0.2em",
        color: "#8ba3c0",
      }}>
        {row.map((t, i) => (
          <span key={i}>
            <span style={{ color: ACCENT, marginRight: 8 }}>▸</span>{t}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

function Metric({ label, value, sub, accent = ACCENT }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.07)",
      background: "linear-gradient(180deg, rgba(15,23,42,0.65), rgba(8,12,22,0.65))",
      padding: "18px 20px",
      borderRadius: 4,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: accent, opacity: 0.7 }} />
      <div style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.3em", color: "#5a6f8a", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "Bebas Neue, Impact, sans-serif", fontSize: 44, lineHeight: 1.05, color: "#e8f4ff", marginTop: 6, letterSpacing: "0.02em" }}>{value}</div>
      {sub && <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, color: "#8ba3c0", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ModuleCard({ idx, code, title, count, desc }: { idx: string; code: string; title: string; count: string; desc: string }) {
  return (
    <div
      className="lobby-module"
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(10,15,28,0.55)",
        padding: "20px 22px",
        borderRadius: 4,
        position: "relative",
        cursor: "default",
        transition: "border-color 200ms, transform 200ms, box-shadow 200ms",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.3em", color: "#5a6f8a" }}>{idx} · {code}</span>
        <span style={{ fontFamily: "Space Mono", fontSize: 9, color: ACCENT }}>● LIVE</span>
      </div>
      <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 28, color: "#e8f4ff", letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ fontFamily: "Space Mono", fontSize: 11, color: ACCENT, marginTop: 4, letterSpacing: "0.15em" }}>{count}</div>
      <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "#8ba3c0", marginTop: 12, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export function Landing({ onDone }: { onDone: () => void }) {
  const now = useNow();
  const [scrolled, setScrolled] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setScrolled(max > 0 ? el.scrollTop / max : 0);
    };
    const el = wrapRef.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  const enter = () => {
    setLeaving(true);
    setTimeout(onDone, 700);
  };

  const ts = now.toISOString().replace("T", " · ").slice(0, 19) + " UTC";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "radial-gradient(ellipse at 70% 0%, #0a1428 0%, #05080f 55%, #02040a 100%)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 700ms ease-out",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      {/* Fixed top-left brand */}
      <div style={{
        position: "fixed", top: 22, left: 28, zIndex: 110,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 26, height: 26, border: `1.5px solid ${ACCENT}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Bebas Neue", fontSize: 16, color: ACCENT,
          boxShadow: `0 0 10px ${ACCENT}40`,
        }}>S</div>
        <div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 13, letterSpacing: "0.28em", color: "#e8f4ff", lineHeight: 1 }}>
            SMANDASH · DEBATE COACH
          </div>
          <div style={{ fontFamily: "Space Mono", fontSize: 8, letterSpacing: "0.3em", color: "#5a6f8a", marginTop: 3 }}>
            STAR UNIVERSE TERMINAL · v0.9
          </div>
        </div>
      </div>

      {/* Fixed top-right nav + clock */}
      <div style={{
        position: "fixed", top: 22, right: 28, zIndex: 110,
        display: "flex", alignItems: "center", gap: 22,
        fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.25em",
        color: "#8ba3c0",
      }}>
        <span>{ts}</span>
        <span style={{ color: ACCENT }}>● CONNECTED</span>
        <button
          onClick={enter}
          style={{
            background: "transparent",
            border: `1px solid ${ACCENT}`,
            color: ACCENT,
            padding: "7px 16px",
            cursor: "pointer",
            fontFamily: "Space Mono",
            fontSize: 10,
            letterSpacing: "0.3em",
            borderRadius: 3,
          }}
        >
          ENTER →
        </button>
      </div>

      {/* Scroll progress rail */}
      <div style={{
        position: "fixed", top: 0, left: 0, height: 2, width: `${scrolled * 100}%`,
        background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
        zIndex: 120, transition: "width 100ms linear",
      }} />

      {/* Scroll container */}
      <div
        ref={wrapRef}
        style={{
          position: "absolute", inset: 0, overflowY: "auto",
          scrollSnapType: "y proximity",
        }}
      >
        {/* SECTION 1 — HERO */}
        <section style={{ minHeight: "100vh", padding: "120px 56px 60px", display: "flex", flexDirection: "column", justifyContent: "center", scrollSnapAlign: "start" }}>
          <div style={{ fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.4em", color: ACCENT, marginBottom: 24 }}>
            ▸ 001 · OVERVIEW
          </div>
          <div style={{ fontFamily: "Bebas Neue, Impact, sans-serif", fontSize: "min(160px, 14vw)", lineHeight: 0.92, color: "#e8f4ff", letterSpacing: "0.01em" }}>
            STAR<br />UNIVERSE
          </div>
          <div style={{
            fontFamily: "DM Sans, sans-serif", fontSize: 16, color: "#8ba3c0", maxWidth: 640,
            marginTop: 32, lineHeight: 1.7,
          }}>
            Sebuah <span style={{ color: ACCENT }}>peta intelijen debat</span> — seluruh kurikulum SMANDASH Debate Club
            divisualisasikan sebagai semesta bintang yang saling terhubung. Matter, motion, kamus, roles,
            kompetitor, anggota aktif. Satu antarmuka. Satu komando.
          </div>
          <div style={{
            marginTop: 48, display: "flex", gap: 16, alignItems: "center",
            fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.3em", color: "#5a6f8a",
          }}>
            <span>SCROLL ↓ TO BRIEF</span>
            <span style={{ width: 40, height: 1, background: "rgba(255,255,255,0.15)" }} />
            <span>OR PRESS ENTER →</span>
          </div>
        </section>

        <Ticker />

        {/* SECTION 2 — METRICS */}
        <section style={{ minHeight: "100vh", padding: "80px 56px", scrollSnapAlign: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.4em", color: ACCENT_2 }}>
                ▸ 002 · LIVE INTELLIGENCE
              </div>
              <div style={{ fontFamily: "Bebas Neue", fontSize: 56, color: "#e8f4ff", letterSpacing: "0.03em", marginTop: 8 }}>
                CURRICULUM AT A GLANCE
              </div>
            </div>
            <div style={{ fontFamily: "Space Mono", fontSize: 10, color: "#5a6f8a", letterSpacing: "0.25em" }}>
              REFRESH · REAL-TIME
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <Metric label="Motion Bank" value={String(MOTIONS.length)} sub="motion siap latihan" />
            <Metric label="Matter Domains" value={String(Object.keys(MATTER).length)} sub="domain pengetahuan" accent={ACCENT_2} />
            <Metric label="Vocab Entries" value={String(VOCAB.length)} sub="istilah & jargon" />
            <Metric label="Speaker Roles" value={String(ROLES.length)} sub="peran British/Asian Parl." accent="#fb7185" />
            <Metric label="Competitors" value={String(COMPETITORS.length)} sub="profil lawan tercatat" accent="#fde047" />
            <Metric label="Active Members" value={String(ACTIVE_MEMBERS.length)} sub="anggota SMANDASH aktif" accent="#34d399" />
          </div>
        </section>

        {/* SECTION 3 — MODULES */}
        <section style={{ minHeight: "100vh", padding: "80px 56px", scrollSnapAlign: "start" }}>
          <div style={{ fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.4em", color: ACCENT, marginBottom: 12 }}>
            ▸ 003 · MODULES
          </div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 56, color: "#e8f4ff", letterSpacing: "0.03em", marginBottom: 36 }}>
            OPERATIONAL UNITS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            <ModuleCard idx="01" code="MTR" title="MATTER" count={`${Object.keys(MATTER).length} DOMAINS`} desc="Argumen siap pakai per domain — ekonomi, politik, sains, HI, filsafat. Dilengkapi penjelasan, matter ringkas, & contoh pro/kon." />
            <ModuleCard idx="02" code="MTN" title="MOTION BANK" count={`${MOTIONS.length} MOTIONS`} desc="Bank mosi British & Asian Parliamentary — terbagi per kategori, dengan ideal house, riset, dan komparatif." />
            <ModuleCard idx="03" code="VCB" title="KAMUS" count={`${VOCAB.length} TERMS`} desc="Glosari istilah debat: definisi, detail, contoh kalimat, padanan EN, dan tag domain." />
            <ModuleCard idx="04" code="RLS" title="ROLES" count={`${ROLES.length} ROLES`} desc="Peran lengkap British & Asian Parliamentary — tugas, durasi, skill matrix per posisi." />
            <ModuleCard idx="05" code="CMP" title="COMPETITORS" count={`${COMPETITORS.length} PROFILES`} desc="Database lawan: track record, juara, best speaker, catatan strategi & ciri khas." />
            <ModuleCard idx="06" code="SMD" title="ACTIVE MEMBERS" count={`${ACTIVE_MEMBERS.length} ANGGOTA`} desc="Roster aktif SMANDASH Debate Club — peran, kekuatan, dan event yang pernah diikuti." />
          </div>
        </section>

        {/* SECTION 4 — ENTER */}
        <section style={{ minHeight: "100vh", padding: "80px 56px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", scrollSnapAlign: "start" }}>
          <div style={{ fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.4em", color: ACCENT_2, marginBottom: 32 }}>
            ▸ 004 · LAUNCH
          </div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: "min(120px, 11vw)", color: "#e8f4ff", letterSpacing: "0.04em", lineHeight: 1, textAlign: "center" }}>
            READY?
          </div>
          <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 14, color: "#8ba3c0", marginTop: 18, marginBottom: 48, maxWidth: 540, textAlign: "center", lineHeight: 1.7 }}>
            Masuki semesta penuh: orbit di sekeliling bola pengetahuan,
            telusuri rasi bintang antar topik, dan kuasai medan debat.
          </div>
          <button
            onClick={enter}
            style={{
              position: "relative",
              padding: "20px 64px",
              background: "transparent",
              border: `1px solid ${ACCENT}`,
              color: "#e8f4ff",
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 28,
              letterSpacing: "0.4em",
              cursor: "pointer",
              borderRadius: 2,
              boxShadow: `0 0 0 0 ${ACCENT}, inset 0 0 30px rgba(56,189,248,0.08)`,
              transition: "box-shadow 250ms, transform 200ms, background 200ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 30px ${ACCENT}66, inset 0 0 30px rgba(56,189,248,0.18)`;
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(56,189,248,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 0 ${ACCENT}, inset 0 0 30px rgba(56,189,248,0.08)`;
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            ENTER UNIVERSE →
          </button>
          <div style={{ marginTop: 36, fontFamily: "Space Mono", fontSize: 9, letterSpacing: "0.3em", color: "#5a6f8a" }}>
            DEBATE COACH TOOLKIT · v0.9 · ROJAAKS · SMANDASH
          </div>
        </section>
      </div>
    </div>
  );
}
