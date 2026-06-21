import type { StarNode } from "@/data/types";
import {
  MOTIONS, JENIS_MOSI, VOCAB, MATTER, STYLES, ROLES,
  ROLE_LOOKUP, SPEECH_TIMING_DEFAULT,
  PRACTICE_MODES, CIRCUIT, ASSISTANT_PROMPTS, META_NODES, EDITOR_NODES,
  COMPETITORS, ACTIVE_MEMBERS, EVENTS,
} from "@/data";
import { useUniverse } from "@/lib/store";
import { buildGraph } from "@/lib/graph/build";
import { useMemo, useState } from "react";

const muted = { fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.25em", color: "var(--au-muted)", textTransform: "uppercase" as const };
const para = { fontFamily: "DM Sans", fontSize: 13.5, lineHeight: 1.75, color: "var(--au-dim)" };
const heading = { fontFamily: "Bebas Neue", fontSize: 18, letterSpacing: "0.1em", color: "var(--au-text)", marginTop: 18, marginBottom: 10 };

function Chip({ color, children, onClick }: { color: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-block",
        padding: "3px 9px",
        fontFamily: "Space Mono",
        fontSize: 9,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        borderRadius: 3,
        marginRight: 5,
        marginBottom: 5,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </span>
  );
}

function NeighborList({ id }: { id: string }) {
  const graph = useMemo(() => buildGraph(), []);
  const select = useUniverse((s) => s.select);
  const neighbors = (graph.neighbors.get(id) || [])
    .map((nid) => graph.byId.get(nid))
    .filter(Boolean)
    .filter((n) => n!.id !== "root" && !n!.id.startsWith("cluster:"))
    .slice(0, 30);
  if (!neighbors.length) return null;
  return (
    <div style={{ marginTop: 22 }}>
      <div style={muted}>Tertaut</div>
      <div style={{ marginTop: 10 }}>
        {neighbors.map((n) => (
          <Chip key={n!.id} color={n!.color} onClick={() => select(n!.id)}>{n!.label}</Chip>
        ))}
      </div>
    </div>
  );
}

function ClusterPanel({ node }: { node: StarNode }) {
  const graph = useMemo(() => buildGraph(), []);
  const select = useUniverse((s) => s.select);
  const children = graph.nodes.filter((n) => n.cluster === node.cluster && n.id !== node.id && !n.id.startsWith("cluster:"));
  return (
    <div>
      <p style={para}>
        Cluster <span style={{ color: node.color }}>{node.label}</span> berisi {children.length} bintang. Klik bintang di lobby atau dari daftar di bawah untuk membuka.
      </p>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {children.slice(0, 60).map((c) => (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${c.color}33`,
              borderLeft: `2px solid ${c.color}`,
              color: "var(--au-text)",
              fontFamily: "DM Sans",
              fontSize: 12,
              cursor: "pointer",
              borderRadius: 3,
            }}
          >
            <div style={{ ...muted, color: c.color, fontSize: 8 }}>{c.kind}</div>
            <div style={{ marginTop: 4 }}>{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StylePanel({ refId }: { refId: string }) {
  const s = STYLES.find((x) => x.id === refId);
  if (!s) return null;
  return (
    <div>
      <div style={muted}>{s.tag}</div>
      <p style={{ ...para, marginTop: 12 }}>{s.desc}</p>
      <h3 style={heading}>Eksekusi</h3>
      <p style={para}>{s.detail}</p>
    </div>
  );
}

function RolePanel({ refId }: { refId: string }) {
  // refId formats: "ap:pm", "bp:og:pmg", or legacy "pm"
  const lookup = ROLE_LOOKUP[refId];
  const legacy = !lookup ? ROLES.find((x) => x.id === refId) : null;
  const r = lookup ?? (legacy ? {
    ...legacy, format: "ap" as const, side: legacy.side,
    sub: { case: [legacy.inti], timing: [], structure: [] },
    teamLabel: undefined,
  } : null);
  if (!r) return null;
  const [tab, setTab] = useState<"case" | "timing" | "structure" | "speech">("case");
  const sideLabel = (r as any).teamLabel || ((r as any).side ? String((r as any).side).toUpperCase() : "");
  const isStructure = tab === "structure";
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip color={r.color}>{r.format === "bp" ? "BRITISH PARLIAMENTARY" : "ASIAN PARLIAMENTARY"}</Chip>
        {sideLabel && <Chip color={r.color}>{sideLabel}</Chip>}
        <Chip color="var(--au-gold)">{r.time}</Chip>
      </div>
      <h3 style={heading}>{r.nama}</h3>
      <p style={para}>{r.inti}</p>
      {/* tab bar */}
      <div style={{ display: "flex", gap: 6, marginTop: 18, flexWrap: "wrap" }}>
        {(["case", "timing", "structure", "speech"] as const).map((k) => {
          const labels = { case: "Case Building", timing: "Timing", structure: "Structure", speech: "Speech Timing" } as const;
          const active = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)}
              style={{
                padding: "6px 12px",
                fontFamily: "Space Mono", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                color: active ? "#05080f" : r.color,
                background: active ? r.color : "transparent",
                border: `1px solid ${r.color}66`, borderRadius: 3, cursor: "pointer",
              }}>{labels[k]}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 14 }}>
        {tab === "case" && (
          <ul style={{ ...para, paddingLeft: 16 }}>
            {r.sub.case.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
          </ul>
        )}
        {tab === "timing" && (
          <div>
            {(r.sub.timing.length ? r.sub.timing : SPEECH_TIMING_DEFAULT.blocks).map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 10px", borderLeft: `2px solid ${r.color}`, marginBottom: 6, background: `${r.color}08` }}>
                <span style={{ ...muted, color: r.color, minWidth: 88 }}>{b.t}</span>
                <span style={para}>{b.what}</span>
              </div>
            ))}
          </div>
        )}
        {isStructure && (
          <div style={{
            border: `1px solid ${r.color}55`,
            background: `linear-gradient(135deg, ${r.color}10, transparent)`,
            padding: "14px 16px", borderRadius: 6, boxShadow: `inset 0 0 18px ${r.color}22, 0 0 22px ${r.color}22`,
          }}>
            {r.sub.structure.map((p, i) => (
              <div key={i} style={{ ...para, marginBottom: 8, paddingLeft: 14, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: 6, width: 6, height: 6, borderRadius: "50%", background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                {p}
              </div>
            ))}
          </div>
        )}
        {tab === "speech" && (
          <div>
            <p style={{ ...para, marginBottom: 10 }}>{SPEECH_TIMING_DEFAULT.desc}</p>
            {SPEECH_TIMING_DEFAULT.blocks.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "8px 10px", borderLeft: `2px solid var(--au-cyan)`, marginBottom: 6, background: "rgba(0,255,200,0.05)" }}>
                <span style={{ ...muted, color: "var(--au-cyan)", minWidth: 88 }}>{b.t}</span>
                <span style={para}>{b.what}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleSkillPanel({ refId }: { refId: string }) {
  // refId format: "role:ap:pm|case"
  const [rolePart, kind] = refId.split("|") as [string, "case" | "timing" | "structure" | "speech"];
  // rolePart is the full node id, e.g. "role:ap:pm" → key "ap:pm"
  const key = rolePart.replace(/^role:/, "");
  const r = ROLE_LOOKUP[key];
  if (!r) return <p style={para}>—</p>;
  const labels = { case: "Case Building", timing: "Timing", structure: "Structure", speech: "Speech Timing" } as const;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip color={r.color}>{r.nama}</Chip>
        <Chip color="var(--au-gold)">{labels[kind]}</Chip>
      </div>
      <h3 style={heading}>{labels[kind]} — {r.nama}</h3>
      {kind === "case" && (
        <ul style={{ ...para, paddingLeft: 16 }}>
          {r.sub.case.map((p, i) => <li key={i} style={{ marginBottom: 6 }}>{p}</li>)}
        </ul>
      )}
      {kind === "timing" && (
        <div>
          {(r.sub.timing.length ? r.sub.timing : SPEECH_TIMING_DEFAULT.blocks).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "8px 10px", borderLeft: `2px solid ${r.color}`, marginBottom: 6, background: `${r.color}08` }}>
              <span style={{ ...muted, color: r.color, minWidth: 88 }}>{b.t}</span>
              <span style={para}>{b.what}</span>
            </div>
          ))}
        </div>
      )}
      {kind === "structure" && (
        <div style={{
          border: `1px solid ${r.color}66`,
          background: `linear-gradient(135deg, ${r.color}12, transparent)`,
          padding: "14px 16px", borderRadius: 6, boxShadow: `inset 0 0 18px ${r.color}33, 0 0 26px ${r.color}22`,
        }}>
          {r.sub.structure.map((p, i) => (
            <div key={i} style={{ ...para, marginBottom: 8, paddingLeft: 14, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, top: 6, width: 6, height: 6, borderRadius: "50%", background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
              {p}
            </div>
          ))}
        </div>
      )}
      {kind === "speech" && (
        <div>
          <p style={{ ...para, marginBottom: 10 }}>{SPEECH_TIMING_DEFAULT.desc}</p>
          {SPEECH_TIMING_DEFAULT.blocks.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "8px 10px", borderLeft: "2px solid var(--au-cyan)", marginBottom: 6, background: "rgba(0,255,200,0.05)" }}>
              <span style={{ ...muted, color: "var(--au-cyan)", minWidth: 88 }}>{b.t}</span>
              <span style={para}>{b.what}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatterDomainPanel({ refId }: { refId: string }) {
  const d = MATTER[refId];
  if (!d) return null;
  return (
    <div>
      <div style={{ ...muted, color: "var(--au-cyan)" }}>{d.icon} {d.label}</div>
      <p style={{ ...para, marginTop: 12 }}>{d.desc}</p>
      <h3 style={heading}>{d.babs.length} Bab</h3>
      {d.babs.map((b) => (
        <div key={b.id} style={{ borderLeft: "2px solid var(--au-cyan)", paddingLeft: 14, marginBottom: 14 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--au-text)", fontWeight: 600 }}>
            {b.num}. {b.title}
          </div>
          {b.meta && <div style={{ ...muted, fontSize: 9, marginTop: 3 }}>{b.meta}</div>}
          <div style={{ ...muted, fontSize: 9, marginTop: 5, color: "var(--au-muted)" }}>{b.subbabs.length} sub-bab</div>
        </div>
      ))}
    </div>
  );
}

function MatterBabPanel({ refId }: { refId: string }) {
  const [dk, babId] = refId.split("/");
  const d = MATTER[dk]; if (!d) return null;
  const b = d.babs.find((x) => x.id === babId); if (!b) return null;
  return (
    <div>
      <div style={{ ...muted, color: "var(--au-cyan)" }}>{d.icon} {d.label} · BAB {b.num}</div>
      {b.meta && <div style={{ ...muted, fontSize: 9, marginTop: 6 }}>{b.meta}</div>}
      <h3 style={heading}>Sub-bab</h3>
      {b.subbabs.map((sb) => (
        <div key={sb.id} style={{ background: "rgba(0,255,200,0.04)", border: "1px solid rgba(0,255,200,0.15)", padding: "10px 14px", marginBottom: 10, borderRadius: 4 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--au-text)", fontWeight: 600 }}>{sb.num} {sb.title}</div>
          {sb.badge && <Chip color="var(--au-gold)">{sb.badge}</Chip>}
        </div>
      ))}
    </div>
  );
}

function MatterSubBabPanel({ refId }: { refId: string }) {
  const [dk, babId, subId] = refId.split("/");
  const d = MATTER[dk]; if (!d) return null;
  const b = d.babs.find((x) => x.id === babId); if (!b) return null;
  const sb = b.subbabs.find((x) => x.id === subId); if (!sb) return null;
  return (
    <div>
      <div style={{ ...muted, color: "var(--au-cyan)" }}>{d.icon} {d.label} · {b.title}</div>
      {sb.badge && <div style={{ marginTop: 8 }}><Chip color="var(--au-gold)">{sb.badge}</Chip></div>}
      {sb.penjelasan && (
        <>
          <h3 style={heading}>Penjelasan</h3>
          {sb.penjelasan.map((p, i) => <p key={i} style={{ ...para, marginBottom: 8 }}>{p}</p>)}
        </>
      )}
      {sb.matter && (
        <>
          <h3 style={heading}>Matter</h3>
          {sb.matter.map((m, i) => (
            <div key={i} style={{ marginBottom: 10, borderLeft: "2px solid var(--au-cyan)", paddingLeft: 12 }}>
              <div style={{ ...muted, color: "var(--au-cyan)", fontSize: 9 }}>{m.label}</div>
              <p style={{ ...para, marginTop: 4 }}>{m.text}</p>
            </div>
          ))}
        </>
      )}
      {sb.contoh && (sb.contoh.pro || sb.contoh.kon) && (
        <>
          <h3 style={heading}>Contoh</h3>
          {sb.contoh.pro && (
            <div style={{ background: "rgba(255,107,107,0.04)", border: "1px solid rgba(255,107,107,0.2)", padding: "10px 14px", marginBottom: 8, borderRadius: 4 }}>
              <div style={{ ...muted, color: "var(--au-agg)", fontSize: 9 }}>PRO</div>
              <p style={{ ...para, marginTop: 6 }}>{sb.contoh.pro}</p>
            </div>
          )}
          {sb.contoh.kon && (
            <div style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.2)", padding: "10px 14px", borderRadius: 4 }}>
              <div style={{ ...muted, color: "var(--au-blue)", fontSize: 9 }}>KON</div>
              <p style={{ ...para, marginTop: 6 }}>{sb.contoh.kon}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MotionPanel({ refId }: { refId: string }) {
  const m = MOTIONS.find((x) => x.id === refId);
  if (!m) return null;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip color="var(--au-cyan)">{m.cat}</Chip>
        <Chip color="var(--au-purple)">{m.type}</Chip>
        {m.comp && <Chip color="var(--au-gold)">{m.comp}</Chip>}
      </div>
      {m.orig && <div style={{ ...muted, marginTop: 10, fontSize: 9 }}>{m.orig}</div>}
      {m.ctx && <p style={{ ...para, marginTop: 14 }}>{m.ctx}</p>}
      {m.pro && (
        <>
          <h3 style={heading}>Argumen Pro</h3>
          {m.pro.map((p, i) => <p key={i} style={{ ...para, marginBottom: 6, borderLeft: "2px solid var(--au-agg)", paddingLeft: 12 }}>→ {p}</p>)}
        </>
      )}
      {m.kon && (
        <>
          <h3 style={heading}>Argumen Kontra</h3>
          {m.kon.map((p, i) => <p key={i} style={{ ...para, marginBottom: 6, borderLeft: "2px solid var(--au-blue)", paddingLeft: 12 }}>→ {p}</p>)}
        </>
      )}
      {m.ideal && (
        <>
          <h3 style={heading}>Ideal Case</h3>
          <p style={para} dangerouslySetInnerHTML={{ __html: m.ideal }} />
        </>
      )}
      {m.research && (
        <>
          <h3 style={heading}>Research</h3>
          <p style={para} dangerouslySetInnerHTML={{ __html: m.research }} />
        </>
      )}
      {m.terms && m.terms.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={muted}>Istilah</div>
          <div style={{ marginTop: 8 }}>{m.terms.map((t) => <Chip key={t} color="var(--au-blue)">{t}</Chip>)}</div>
        </div>
      )}
    </div>
  );
}

function JenisPanel({ refId }: { refId: string }) {
  const j = JENIS_MOSI.find((x) => x.id === refId);
  if (!j) return null;
  return (
    <div>
      <div style={{ ...muted, color: j.warna }}>{j.icon} {j.prefix}</div>
      <p style={{ ...para, marginTop: 12 }}>{j.definisi}</p>
      <div style={{ background: "rgba(0,214,143,0.05)", border: "1px solid rgba(0,214,143,0.2)", padding: "10px 14px", marginTop: 12, borderRadius: 4 }}>
        <span style={{ color: "var(--au-cyan)", fontSize: 12 }}>⚡ Kunci: </span>
        <span style={para}>{j.penting}</span>
      </div>
      <h3 style={heading}>Tim Pro / Gov</h3>
      {j.pro.map((p, i) => <p key={i} style={{ ...para, marginBottom: 4 }}>→ {p}</p>)}
      <h3 style={heading}>Tim Kontra / Opp</h3>
      {j.kon.map((p, i) => <p key={i} style={{ ...para, marginBottom: 4 }}>→ {p}</p>)}
      {j.contoh && j.contoh.length > 0 && (
        <>
          <h3 style={heading}>Contoh Mosi</h3>
          {j.contoh.map((c, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${j.warna}`, paddingLeft: 12, marginBottom: 10 }}>
              <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--au-text)", fontWeight: 600 }}>"{c.mosi}"</div>
              <div style={{ ...muted, marginTop: 4 }}>{c.konteks}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function VocabPanel({ refId }: { refId: string }) {
  const v = VOCAB[parseInt(refId, 10)];
  if (!v) return null;
  return (
    <div>
      <Chip color="var(--au-blue)">{v.cat}</Chip>
      <h3 style={{ ...heading, marginTop: 14 }}>Definisi</h3>
      <p style={para}>{v.def}</p>
      {v.detail && (<><h3 style={heading}>Detail</h3><p style={para}>{v.detail}</p></>)}
      {v.ex && (<><h3 style={heading}>Contoh</h3><p style={{ ...para, fontStyle: "italic", color: "var(--au-cyan)" }}>{v.ex}</p></>)}
    </div>
  );
}

function SectionPanel({ cluster, refId }: { cluster: string; refId: string }) {
  let item: { nama: string; desc: string } | undefined;
  if (cluster === "practice") item = PRACTICE_MODES.find((p) => p.id === refId);
  else if (cluster === "circuit") item = CIRCUIT.find((p) => p.id === refId);
  else if (cluster === "assistant") item = ASSISTANT_PROMPTS.find((p) => p.id === refId);
  else if (cluster === "editor") item = EDITOR_NODES.find((p) => p.id === refId);
  else if (cluster === "meta") item = META_NODES.find((p) => p.id === refId);
  if (!item) return <p style={para}>Tidak ada konten.</p>;
  return (
    <div>
      <p style={para}>{item.desc}</p>
      <div style={{ marginTop: 18, padding: "12px 14px", background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 4 }}>
        <div style={muted}>Status</div>
        <p style={{ ...para, marginTop: 6, fontSize: 12 }}>Modul ini akan diisi di iterasi selanjutnya — strukturnya sudah tertaut di star map.</p>
      </div>
    </div>
  );
}

function findSchool(refId: string) {
  return [...COMPETITORS, ...ACTIVE_MEMBERS].find((s) => s.id === refId);
}
function findTeam(refId: string) {
  const [sid, tid] = refId.split("/");
  const school = [...COMPETITORS, ...ACTIVE_MEMBERS].find((s) => s.id === sid);
  return { school, team: school?.teams.find((t) => t.id === tid) };
}
function findSpeaker(refId: string) {
  for (const s of [...COMPETITORS, ...ACTIVE_MEMBERS]) {
    for (const t of s.teams) {
      const sp = t.speakers.find((x) => x.id === refId);
      if (sp) return { school: s, team: t, speaker: sp };
    }
  }
  return null;
}

function SchoolPanel({ refId }: { refId: string }) {
  const s = findSchool(refId);
  if (!s) return null;
  return (
    <div>
      {s.tag === "halaldebate-chaos" && <Chip color="#a855f7">HALALDEBATE · CHAOS</Chip>}
      {s.home && <Chip color="#00ffc8">HOME · SMANDASH</Chip>}
      <h3 style={heading}>{s.teams.length} Tim</h3>
      {s.teams.map((t) => (
        <div key={t.id} style={{ borderLeft: "2px solid #fb7185", paddingLeft: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--au-text)", fontWeight: 600 }}>{t.label}</div>
          {t.speakers.map((sp) => (
            <div key={sp.id} style={{ ...muted, fontSize: 10, color: "var(--au-muted)", marginTop: 4 }}>
              {sp.role.toUpperCase()} · {sp.fullname || sp.nama}{sp.crown ? "  👑" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TeamPanel({ refId }: { refId: string }) {
  const { school, team } = findTeam(refId);
  if (!school || !team) return null;
  return (
    <div>
      <Chip color="#fb7185">{school.short}</Chip>
      <h3 style={heading}>Pembicara</h3>
      {team.speakers.map((sp) => (
        <div key={sp.id} style={{ marginBottom: 10, borderLeft: "2px solid #a78bfa", paddingLeft: 12 }}>
          <div style={{ ...muted, color: "#a78bfa", fontSize: 9 }}>{sp.role.toUpperCase()}</div>
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--au-text)", fontWeight: 600 }}>{sp.fullname || sp.nama}{sp.crown ? "  👑" : ""}</div>
        </div>
      ))}
    </div>
  );
}

function SpeakerPanel({ refId }: { refId: string }) {
  const r = findSpeaker(refId);
  if (!r) return null;
  const { school, team, speaker } = r;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Chip color="#fb7185">{school.short}</Chip>
        <Chip color="#a78bfa">{team.label}</Chip>
        <Chip color="#fde047">{speaker.role.toUpperCase()}</Chip>
        {speaker.crown === "best-speaker" && <Chip color="#fde047">👑 BEST SPEAKER</Chip>}
      </div>
      <h3 style={heading}>{speaker.fullname || speaker.nama}</h3>
      {speaker.replyOf && (
        <div style={{ marginTop: 6 }}>
          <Chip color="#fde047">REPLY SPEAKER (dari {speaker.replyOf.toUpperCase()})</Chip>
        </div>
      )}
      <p style={para}>
        {speaker.role === "p1" ? "First Speaker — definisi, framing, dan case opening." :
         speaker.role === "p2" ? "Second Speaker — rebut + extension." :
         "Third Speaker — closing speech, weighing, crystallize."}
      </p>
      {speaker.replyOf && (
        <p style={{ ...para, marginTop: 8, color: "#fde047" }}>+ Reply Speech 4:20 — sintesis dan narasi penutup dari sisi tim.</p>
      )}
    </div>
  );
}

function BracketPanel({ refId }: { refId: string }) {
  const [evId, brId] = refId.split("/");
  const ev = EVENTS.find((e) => e.id === evId); if (!ev) return null;
  const br = ev.brackets.find((b) => b.id === brId); if (!br) return null;
  return (
    <div>
      <Chip color="#fde047">{ev.nama}</Chip>
      <h3 style={heading}>{br.teams.length} Tim Lolos</h3>
      {br.teams.map((tid) => (
        <div key={tid} style={{ ...muted, fontSize: 10, color: "var(--au-text)", padding: "6px 0", borderBottom: "1px solid rgba(168,85,247,0.1)" }}>{tid.toUpperCase()}</div>
      ))}
    </div>
  );
}

function LetterPanel({ refId }: { refId: string }) {
  const vs = VOCAB.map((v, i) => ({ v, i })).filter(({ v }) => (v.term[0] || "").toUpperCase() === refId);
  return (
    <div>
      <p style={para}>{vs.length} kosakata dimulai dengan <span style={{ color: "#38bdf8", fontWeight: 700 }}>{refId}</span>.</p>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap" }}>
        {vs.map(({ v }) => <Chip key={v.term} color="#7dd3fc">{v.term}</Chip>)}
      </div>
    </div>
  );
}

export function PanelContent({ node }: { node: StarNode }) {
  let body: React.ReactNode = null;
  if (node.kind === "cluster") body = <ClusterPanel node={node} />;
  else if (node.kind === "subhub" && node.cluster === "motion") body = <JenisPanel refId={node.refId!} />;
  else if (node.kind === "subhub" && node.cluster === "event") {
    const ev = EVENTS.find((e) => e.id === node.refId);
    body = ev ? <p style={para}>{ev.desc}</p> : <p style={para}>—</p>;
  }
  else if (node.kind === "style") body = <StylePanel refId={node.refId!} />;
  else if (node.kind === "role") body = <RolePanel refId={node.refId!} />;
  else if (node.kind === "roleskill") body = <RoleSkillPanel refId={node.refId!} />;
  else if (node.kind === "domain") body = <MatterDomainPanel refId={node.refId!} />;
  else if (node.kind === "bab") body = <MatterBabPanel refId={node.refId!} />;
  else if (node.kind === "subbab") body = <MatterSubBabPanel refId={node.refId!} />;
  else if (node.kind === "motion") body = <MotionPanel refId={node.refId!} />;
  else if (node.kind === "jenis") body = <JenisPanel refId={node.refId!} />;
  else if (node.kind === "school") body = <SchoolPanel refId={node.refId!} />;
  else if (node.kind === "team") body = <TeamPanel refId={node.refId!.split("/").slice(0).join("/")} />;
  else if (node.kind === "speaker") body = <SpeakerPanel refId={node.refId!} />;
  else if (node.kind === "bracket") body = <BracketPanel refId={node.refId!} />;
  else if (node.kind === "letter") body = <LetterPanel refId={node.refId!} />;
  else if (node.kind === "vocab") body = <VocabPanel refId={node.refId!} />;
  else if (node.kind === "section") body = <SectionPanel cluster={node.cluster} refId={node.refId!} />;
  else body = <p style={para}>—</p>;

  return (
    <>
      {body}
      <NeighborList id={node.id} />
    </>
  );
}