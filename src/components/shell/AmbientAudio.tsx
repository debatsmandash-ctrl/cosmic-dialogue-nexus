import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "@/lib/store";
import { TRACKS, DEFAULT_ENABLED_TRACKS } from "@/lib/playlist";

export function AmbientAudio() {
  const audioMuted = useSettings((s) => s.audioMuted);
  const audioVolume = useSettings((s) => s.audioVolume);
  const enabledTracks = useSettings((s) => s.enabledTracks);
  const playMode = useSettings((s) => s.playMode);
  const update = useSettings((s) => s.update);
  const ref = useRef<HTMLAudioElement | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  // Active playlist (filter berdasarkan enabledTracks; default semua aktif)
  const active = useMemo(() => {
    const map = { ...DEFAULT_ENABLED_TRACKS, ...enabledTracks };
    const list = TRACKS.filter((t) => map[t.id] !== false);
    return list.length ? list : TRACKS;
  }, [enabledTracks]);

  const current = active[trackIdx % active.length];

  const pickNext = () => {
    if (active.length <= 1) return 0;
    if (playMode === "shuffle") {
      let n = trackIdx;
      while (n === trackIdx) n = Math.floor(Math.random() * active.length);
      return n;
    }
    return (trackIdx + 1) % active.length;
  };

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    a.volume = audioVolume;
    a.muted = audioMuted;
    if (!audioMuted) {
      a.play().catch(() => { /* will retry on next gesture */ });
    }
  }, [audioMuted, audioVolume, current?.url]);

  // First-gesture auto-unmute: kalau user belum pernah mute manual, mulai play setelah klik pertama
  useEffect(() => {
    const onFirst = () => {
      const a = ref.current;
      if (!a) return;
      a.play().catch(() => {});
      const persisted = localStorage.getItem("smandash-settings-v2");
      const everToggled = persisted && persisted.includes("\"audioMuted\":false");
      if (!everToggled) {
        update({ audioMuted: false });
      }
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, [update]);

  return (
    <>
      <audio
        ref={ref}
        src={current?.url}
        preload="auto"
        onEnded={() => setTrackIdx(pickNext())}
      />
      <div
        style={{
          position: "fixed", bottom: 18, right: 18, zIndex: 25,
          display: "flex", alignItems: "center", gap: 6,
        }}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        {showInfo && current && !audioMuted && (
          <div style={{
            fontFamily: "DM Sans", fontSize: 11, color: "#cbd5e1",
            background: "rgba(11,18,32,0.85)", padding: "6px 10px",
            border: "1px solid rgba(168,85,247,0.3)", borderRadius: 6,
            backdropFilter: "blur(8px)", whiteSpace: "nowrap",
            maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis",
          }}>
            <span style={{ color: "#00ffc8" }}>♪</span> {current.title}
            <span style={{ color: "#5a6f8a", marginLeft: 6 }}>· {current.artist}</span>
          </div>
        )}
        {!audioMuted && active.length > 1 && (
          <button
            onClick={() => setTrackIdx(pickNext())}
            aria-label="Lagu berikutnya"
            title="Skip / lagu berikutnya"
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: "rgba(11,18,32,0.85)",
              border: "1px solid rgba(0,255,200,0.4)",
              color: "#00ffc8", cursor: "pointer", fontSize: 12,
              backdropFilter: "blur(10px)",
            }}
          >⏭</button>
        )}
        <button
          onClick={() => update({ audioMuted: !audioMuted })}
        aria-label={audioMuted ? "Unmute musik" : "Mute musik"}
        title={audioMuted ? "Putar musik" : "Bisukan musik"}
        style={{
          width: 40, height: 40, borderRadius: 999,
          background: "rgba(11,18,32,0.85)",
          border: `1px solid ${audioMuted ? "rgba(168,85,247,0.35)" : "rgba(0,255,200,0.55)"}`,
          color: audioMuted ? "#a855f7" : "#00ffc8",
          cursor: "pointer", fontSize: 16,
          boxShadow: audioMuted ? "none" : "0 0 18px rgba(0,255,200,0.35)",
          backdropFilter: "blur(10px)",
        }}
        >
          {audioMuted ? "♪̸" : "♪"}
        </button>
      </div>
    </>
  );
}