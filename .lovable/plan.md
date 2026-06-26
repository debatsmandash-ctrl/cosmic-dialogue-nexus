
# Overhaul: Universe Visuals + Materi Mendalam + UI Information Bar

## 1. 3D Universe — "Shell of the Big Bang"

Ubah layout di `src/lib/graph/build.ts`:
- Cluster ditempatkan di **kulit bola** (Fibonacci sphere, radius tetap ~28) — bukan padat di tengah. Spacing antar cluster diperbesar agar "menyebar pasca big bang".
- Children diorbitkan di **sub-shell tipis** di sekitar parent (offset radial kecil) — menegaskan struktur kulit.
- Noise radial halus (±2 unit) supaya tidak terlalu geometris.

`MilkyWaySky.tsx` + lighting (`Universe.tsx`):
- Ganti pano dengan **referensi gambar 1** (nebula ungu-biru padat) sebagai HDR skybox baru.
- Tambah lapisan **dust nebula** (sprite layered) supaya "ramai natural".
- **Quality=ultra** → hidupkan emissive falloff lebih jauh + rim glow tipis, sehingga node sisi jauh bola tetap kelihatan samar. Quality≤high clamp untuk perf.

## 2. 2D View — "Aurora Night Sky"

Rombak `Universe2D.tsx`:
- Layout: **spread organik** (Poisson-disk) memenuhi viewport, bukan stack. Cluster = rasi bintang, leaves = bintang anggota, dihubungkan garis tipis constellation.
- Bintang putih-natural redup (1-2.5px, soft glow). **Tidak neon**.
- Background gradient langit malam biru-deep + **aurora pita biru-ungu-magenta** (bukan hijau) blur tinggi + perlin drift lambat.
- **1-2 komet dekoratif** trail tipis, respawn random.
- Tetap interaktif (hover/click → panel).

## 3. Content Deepening — Materi Mosi 5-7 Poin + Risk Bars

### Tipe data baru (`src/data/types.ts`)
Tambah ke `Motion`:
```
discussionPoints: { text: string; risk: 1-5; strategy: "safe"|"balanced"|"chaos" }[]
diagrams?: { kind: "comparison"|"flow"|"spectrum"; data: ... }[]
idealCases: { side: "pro"|"opp"; tier: "safe"|"template"|"niche-chaos"; content: string; riskScore: number }[]
```

### Importer
- Import 27 motion baru dari `BATCH-01` (m061-m087), **min 5 max 7 discussion points** per mosi, ranged risk 1-5.
- Migrasi 60 mosi existing: PRO/KON → discussionPoints terstruktur (auto-mapping, risk default 3).
- 2-3 mosi populer dapat **diagram comparison** manual.

## 4. Information Panel — Redesign

Rombak `SidePanel.tsx` + `panels/PanelContent.tsx`:
- **Header sticky** tipografi monumental + chip kategori berwarna.
- **Tabs horizontal**: Overview · Argumen · Ideal Case · Terms · Meta.
- **Argumen tab**: kolom PRO/OPP, **bar horizontal risk-meter** per poin (safe→chaos), dianimasikan saat masuk.
- **Ideal Case tab**: 3 tier cards (Safe / Template / Niche Chaos) dengan badge risiko + animasi.
- Mini-diagram (Recharts) untuk mosi yang punya data diagram.

### Hierarki Matter (sidebar)
Perbaiki `Sidebar.tsx`:
- Indentasi jelas: Domain → Sub-domain (collapsible, chevron) → Leaf (font lebih kecil, dot bullet).
- Sub-domain background subtle berbeda supaya tidak sejajar visual dengan leaf.

## 5. Easter Egg — Diego Simeone (hanya di section HaramDebate)

- Upload gambar Simeone sebagai asset.
- Tampilkan **floating sticker Simeone** hanya di dalam panel/sub-section "HaramDebate" (rotate -8°, opacity 0.85, hover → tooltip "El Cholo approves"). Tidak muncul di domain/cluster lain.

## 6. Audio — 2 Track Baru

Upload via lovable-assets:
- `Ludwig Göransson — Can You Hear The Music (slowed)`
- `Hans Zimmer — Time`

Tambahkan ke `playlist.ts`, default enabled.

## Files

**Edit**: `src/lib/graph/build.ts`, `src/components/universe/MilkyWaySky.tsx`, `src/components/universe/Universe.tsx`, `src/components/universe/Universe2D.tsx`, `src/components/shell/SidePanel.tsx`, `src/components/shell/panels/PanelContent.tsx`, `src/components/shell/Sidebar.tsx`, `src/lib/playlist.ts`, `src/data/raw/motions.json`, `src/data/types.ts`.

**New**: `src/components/universe/AuroraSky.tsx`, `src/components/universe/Comet2D.tsx`, `src/components/panels/RiskBar.tsx`, `src/components/panels/IdealCaseCards.tsx`, `src/components/panels/SimeoneEgg.tsx`, `scripts/import-motions-batch01.mjs`, asset pointers (skybox, Simeone, 2 mp3).

## Open question
Scope cukup besar (visual + 27 motion baru × 5-7 poin + 60 migrasi + redesign panel). Eksekusi penuh dalam 1 run, atau split: **Step A** = visual + audio + Simeone, **Step B** = content + UI panel? Default eksekusi penuh.
