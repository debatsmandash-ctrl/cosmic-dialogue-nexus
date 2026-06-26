
## 1. 3D — Satu Bola Besar (One-Ball Shell)

Saat ini cluster tersebar di Fibonacci sphere (radius ~80) dan tiap cluster bikin sub-shell sendiri → terlihat seperti banyak bola kecil. Target baru: **satu bola tunggal** di mana setiap section jadi **patch kulit** pada bola tersebut.

- `src/lib/graph/build.ts`:
  - Hapus jarak antar cluster (`dist 72-86`).
  - Semua node (cluster + child) diletakkan pada **satu sphere radius R ≈ 55** menggunakan Fibonacci sphere global.
  - Tiap cluster mendapat **patch angular** (cone region) di permukaan; cluster center = arah patch, child node tersebar di dalam cone (half-angle ~22°) dengan noise radial tipis ±2 unit (kulit tidak rapat).
  - Subhub & leaf juga di kulit yang sama → "big bang shell".
- `Universe.tsx`: kamera default sedikit lebih jauh (radius ~140) agar bola terlihat utuh; auto-rotate halus.
- `MilkyWaySky.tsx`: tetap nebula; tambah fog ultra-distance agar sisi jauh bola sedikit redup tapi tetap terlihat (sesuai permintaan sebelumnya).

## 2. Settings Panel — Upgrade Penuh

`SettingsPanel.tsx` di-redesign jadi tabbed: **Rover · Tema · Density · A11y/Perf · Audio**.

- **Rover (kamera presets)**: Top-down, Orbit Auto (multi-angle), Fly-through Tour (animate camera around shell), Free-cam, Reset. Implementasi via ref ke `OrbitControls` + tween (lerp posisi target).
- **Tema/Palette**: 4 preset universe — Nebula Biru (default), Aurora Hijau, Sunset Magenta, Monokrom. Mengubah CSS vars + warna cluster base.
- **Density 3D**: slider radius bola (40-90), ketebalan kulit (0-6), jumlah background star (500-5000), intensitas nebula (sudah ada).
- **2D**: toggle "Langit Real" — pakai layout konstelasi natural (posisi node bebas mengikuti pseudo-random seeded sky map, tidak diubah). Aurora & comet jadi opsional.
- **A11y/Perf**: font scaler (90-130%), kontras tinggi (sudah ada), reduce motion granular (rotate/parallax/twinkle), FPS target 30/60/120/uncapped.
- Settings persist via `useSettings` (sudah Zustand persist).

## 3. Main Menu / Landing Polish

Komentar user: "main menu masih polos". Tambah di home (`routes/index.tsx` overlay loader/intro):
- Hero title besar "SMANDASH UNIVERSE" Bebas Neue + tagline DM Sans.
- 4 entry-pill animasi: Jelajahi Universe · Daftar Mosi · Matter · Kamus.
- Background: live preview universe blur + nebula glow.
- Mini-stat: jumlah mosi, domain, vocab.

## 4. Diego Simeone — Banner Foto Jelas

`SimeoneEgg.tsx` jadi **banner 320×180** di header panel HaramDebate:
- Posisi: full-width di atas konten panel (bukan pojok).
- Image cover, border neon pink 2px, caption "EL CHOLO · PARK THE BUS" Space Mono.
- Hover: subtle zoom 1.04 + tooltip "Defensive masterclass approved".
- Tetap muncul hanya di section HaramDebate.

## 5. Konten — Ekspansi Matter & Import Motion

### 5a. Import 3 batch motion baru
Parse `BATCH-01/02/03*.txt` (m061-m087 sudah ada; tambahkan m088-m096 sosial/sains/HI dan m129+ feminisme/antropologi/dst) lewat script Node `scripts/import-batches.mjs` → append ke `src/data/raw/motions.json`. Total target ~150 motion. Bahasa Indonesia, istilah teknis (predatory lending, regulatory capture) dipertahankan miring.

### 5b. Matter — format bento magazine
`MatterSubBab` type diperluas:
```ts
{
  id, num, title, badge?,
  intro: string,            // paragraf pembuka
  sections: Array<{
    heading: string,
    body: string,           // 2-4 paragraf
    callout?: { type: 'insight'|'risk'|'example', text: string },
    quote?: { text: string, source?: string },
    bullets?: string[],
  }>,
  matter: { label, text }[],
  contoh: { pro, kon },
  furtherReading?: string[],
}
```
- Parse semua isi `.txt` user → expand setiap sub-bab jadi 1-3 halaman (target 600-1500 kata) dengan struktur intro + 4-6 section + 2 callout + 1 quote + bullets.
- Lengkapi domain yang error/hilang (cek `matter.json` saat ini, isi gap dari `debatabase.pdf` & batch txt).
- Semua Bahasa Indonesia baku, istilah debat (POI, framing, characterization) tetap.

### 5c. UI Matter — Bento Magazine
`PanelContent.tsx` tab "Matter" pakai layout bento-grid:
- Hero card besar (title + badge + intro, gradient sesuai domain).
- Grid 12-col responsive: section body (col-span 6-8), callout berwarna (col-span 4), quote besar serif italic (col-span 12), bullets card (col-span 4), contoh PRO/KON dua kolom.
- Sticky mini-TOC kiri (anchor per section).
- Progress bar baca atas.
- Animasi reveal `whileInView` framer-motion stagger.
- Drop cap huruf pertama intro.

## 6. Build Safety (Netlify / Vercel / GitHub-style)

- Pastikan tidak ada server-only import bocor ke client (sudah aman lewat TanStack pattern).
- Static SSG: cek semua route loader bebas dari `requireSupabaseAuth` (project ini belum pakai auth).
- Hindari `process.env` di module-scope client.
- Image asset besar tetap via Lovable Assets CDN — referensikan `.url`.
- Jalankan `bun run build` setelah patch besar; fix typecheck error (likely di `MatterSubBab` migration karena field baru — beri fallback opsional).

## 7. Urutan Eksekusi (1 pass)

1. Update `types.ts` (Matter sections schema, opsional).
2. Script `scripts/expand-matter.mjs` + `scripts/import-batches.mjs` → tulis `matter.json` & `motions.json` baru (bahasa Indonesia, konten penuh).
3. Refactor `build.ts` → one-ball shell.
4. Refactor `SettingsPanel.tsx` (tabbed, rover, theme, density).
5. Refactor `Universe2D.tsx` → mode "Langit Real" opsional.
6. Refactor `SimeoneEgg.tsx` → banner foto besar; integrate di `PanelContent` header HaramDebate.
7. Refactor `PanelContent.tsx` tab Matter → bento magazine.
8. Polish landing (`routes/index.tsx`).
9. `bun run build` + perbaiki error.

## Catatan Teknis

- Cluster patch angular: `cone(centerDir, halfAngle)` random uniform → konversi ke posisi sphere; child sedikit lebih dekat ke center patch (Gaussian).
- Rover tour: state machine 4 waypoints, ease-in-out 6s per leg.
- Theme switch: ganti `--cluster-*` CSS variables + remap warna node by `clusterKey`.
- Matter ekspansi: konten ditulis manual berbasis sumber (.txt batch + debatabase.pdf) — tidak generated boilerplate; target 1-3 halaman/sub-bab.

## Pertanyaan minor (tidak blocking)

- Apakah font matter (bento) tetap Bebas Neue/DM Sans, atau ganti ke Instrument Serif untuk feel editorial? → default: pertahankan Bebas/DM, tambah Instrument Serif khusus quote.
