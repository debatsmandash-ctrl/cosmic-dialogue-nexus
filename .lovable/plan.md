## Tujuan
Lengkapi pass besar: 2D Universe dirombak ala Genshin (multi-vibe, multi-shape, dapat dipersonalisasi), perbaiki kelemahan 3D (z-index tag, volume, multi-hover, partikel, garis antar-cluster, pulse), dan rebuild main lobby jadi Cinematic Intro + opsional HUD Command Deck.

---

## A. Mode 2D — Genshin Sky Engine

Rombak total `src/components/universe/Universe2D.tsx` jadi 3 layer komposit + system rasi yang bisa dipersonalisasi.

**A1. Latar (Sky Backdrop) — pilihan di Settings**
- `sky2DTheme: "mondstadt" | "snezhnaya" | "liyue" | "constellation_pure"`
- `mondstadt`: gradient biru-tua → ungu-dalam, milky way band (canvas noise + gaussian blur), siluet pohon besar SVG, kunang-kunang kuning (particles), siluet gunung bawah. Reference foto 1.
- `snezhnaya`: aurora hijau-ungu bergerak (animated gradient + perlin), butiran salju turun, gunung tajam putih-biru, langit hitam-pekat di atas.
- `liyue`: gradient merah-emas di horizon, awan tinta sapuan kuas (SVG path), lampion floating, naga siluet di kejauhan (SVG), bintang emas.
- `constellation_pure`: tanpa landscape — ruang gelap + cincin orbit perak (referensi foto 3), cocok untuk fokus navigasi.

Semua dirender via `<canvas>` + SVG overlay agar tetap ringan. Toggle `realSky2D` jadi master switch: ON = matikan aurora hias & comet, hanya bintang + milky way realistis tanpa landscape.

**A2. Bentuk Rasi (Star Shape Engine) — pilihan di Settings**
- `constellationShape: "figurative" | "free_lines" | "orbit_rings" | "hybrid"`
- `figurative`: tiap cluster punya pola rasi khas (MATTER = ikon buku, MOTION = panah, KAMUS = lentera, dst.). Definisi pola di `src/lib/sky/constellations.ts` sebagai array koordinat normalized + edges.
- `free_lines`: bintang acak tapi seed-stable per cluster; garis menghubungkan node sesuai graph edges, warna = warna cluster.
- `orbit_rings`: cluster diletakkan di 3-4 cincin konsentris (referensi foto 3 Genshin chart). Hub di cincin, leaf melingkar di sekitar hub.
- `hybrid`: hub di cincin, leaf membentuk mini-rasi figuratif.

Bintang diwarnai sesuai warna cluster (cyan/orange/magenta/dll) supaya mudah dibedakan. Ukuran bintang scaled by node weight; bintang utama (hub) punya 4-point sparkle glow.

**A3. Color-coded Stars**
- Setiap node bintang dapat tint dari `cluster.color` + halo radial. Bintang biasa putih krem hanya jika `realSky2D` aktif.

**A4. Tag/label di 2D**
- Render lewat HTML overlay absolute di atas canvas, `z-index` < sidebar/topbar (`z-index: 5`; navigasi di `z: 30+`). Clip ke area canvas via `overflow:hidden` parent.

---

## B. Mode 3D — Polish & Density

**B1. Tag tidak menembus UI**
- Bungkus `Html` (drei) label dengan kondisi `occlude` + tambahkan z-index pool `< 20` agar di bawah Sidebar (`z: 30`) dan SettingsPanel (`z: 50`). Tambah `pointer-events: none` saat di belakang shell.

**B2. Volume, bukan sekadar permukaan**
- Update `build.ts`: tambah `SHELL_THICK = 8`. Leaf dapat radial jitter ±SHELL_THICK; hub tetap di SHELL_R. Hasil: shell jadi cangkang tebal, garis edge tidak saling tabrak.
- Edges digambar dengan curve halus (quadratic bezier via three-line2) mengikuti permukaan agar tidak memotong.

**B3. Multi-hover toggle (opt-in)**
- Setting baru `showAllHovers: boolean` (default false). Saat ON, semua node menampilkan label ringkas + edges aktif sekaligus, dengan opacity rendah; node yang dihover tetap full opacity.

**B4. Tambahan visual (sesuai pilihan user)**
- Partikel mikro/dust drifting di dalam shell (Points + custom shader, ~600 partikel, slow drift, opacity 0.15-0.4).
- Constellation lines antar-cluster: garis tipis hub→hub berwarna gradient antar dua cluster (toggle `interClusterLinks`).
- Pulse glow pada hover: scale 1→1.3 loop 1.4s + ring orbit tipis di sekitar node aktif.

**B5. Atmosfer tetap gelap tapi ramai**
- Naikkan default `backgroundStars` ke 2500, tambah lapisan nebula tipis (additive plane jauh di belakang), bloom intensity default 0.55. Quality preset `medium` tetap nyaman di laptop.

---

## C. Main Lobby — Cinematic Intro + HUD Command Deck

Rebuild `src/components/shell/Loader.tsx` + tambah `src/components/shell/Landing.tsx`.

**C1. Cinematic Intro (default)**
- Full-screen black → vignette nebula fade in.
- Judul besar (Bebas Neue 96-120px): "DEBATE COACH TOOLKIT" + subtitle Space Mono kecil "STAR UNIVERSE · v0.9".
- Kutipan debat berputar (4-5 quotes Bahasa Indonesia, fade-cycle 4s).
- Tombol pusat: `ENTER UNIVERSE` (neon outline cyan, hover glow).
- Saat ditekan: kamera 3D fly-in dari jarak 400 → 200 unit, judul fade out, shell muncul.
- Background: shell 3D sudah dirender di belakang dengan opacity rendah + autorotate lambat, terlihat samar di balik vignette.

**C2. HUD Command Deck overlay (opsional, toggle di Settings)**
- Setelah masuk universe, sebuah HUD strip di bawah layar (collapsible) menampilkan: jumlah Matter / Motion / Kamus / Roles, "Last opened", quick-launch ke 4 cluster favorit.
- Panel kanan-atas kecil: mini orbit map (lihat B6 di bawah).

**C3. Setting baru "Lobby Style"**
- `lobbyStyle: "cinematic" | "hud" | "minimal"`. `minimal` = perilaku lama.

---

## D. Settings Panel — Tab baru "Sky" & opsi tambahan

Tab baru di antara `Display` dan `Rover`: **SKY** — berisi:
- `View Mode 2D` → Sky Theme (4 chip dengan thumbnail kecil)
- Constellation Shape (4 chip)
- `Real Sky` toggle (master switch)
- `Star color mode`: cluster-tinted / pure-white / rainbow
- `Constellation lines opacity` slider

Tab `Density` ditambah:
- `Shell thickness` slider (0-12)
- `Inter-cluster links` toggle
- `Micro-dust particles` toggle + density slider
- `Show all hovers` toggle
- `Pulse glow on hover` toggle

Tab baru **LOBBY** kecil:
- Pilih lobby style (cinematic / hud / minimal)
- Toggle HUD strip
- Toggle mini-map

---

## E. File yang akan disentuh

```text
src/lib/store.ts                          + field setting baru
src/lib/sky/constellations.ts             NEW (pola rasi figuratif)
src/lib/sky/skyThemes.ts                  NEW (definisi 4 sky theme)
src/components/universe/Universe2D.tsx    rombak total
src/components/universe/sky/              NEW folder
  ├─ MondstadtSky.tsx
  ├─ SnezhnayaSky.tsx
  ├─ LiyueSky.tsx
  ├─ ConstellationPureSky.tsx
  └─ StarField2D.tsx
src/components/universe/Universe.tsx      tambah dust, inter-cluster, pulse, multi-hover, z-index
src/components/universe/MicroDust.tsx     NEW
src/components/universe/InterClusterLinks.tsx NEW
src/lib/graph/build.ts                    SHELL_THICK + radial jitter leaf
src/components/shell/SettingsPanel.tsx    tab SKY + LOBBY + opsi density baru
src/components/shell/Loader.tsx           cinematic intro
src/components/shell/Landing.tsx          NEW (HUD command deck)
src/components/shell/HudStrip.tsx         NEW
src/components/shell/MiniMap.tsx          NEW
src/routes/index.tsx                      wire lobbyStyle
src/styles.css                            z-index tokens, sky utility classes
```

---

## F. Urutan eksekusi

1. Settings store + tab Sky/Lobby/Density baru (foundation).
2. 3D quick wins: z-index fix, shell volume, multi-hover, pulse, dust, inter-cluster links.
3. 2D Sky Engine: 4 backdrop + 4 shape mode + color-coded stars.
4. Cinematic loader + HUD Command Deck + mini-map.
5. QA: build hijau, test di mobile, verifikasi tidak ada overlap UI.

---

## G. Catatan teknis

- Semua aset Genshin-style dibuat via SVG path + canvas procedural — TIDAK mengimport gambar bercopyright. Foto referensi user hanya panduan vibe.
- Render berat (aurora, naga, milky way band) dijalankan via `requestAnimationFrame` dengan throttle berdasarkan `quality` preset.
- Build-safe untuk Netlify/Vercel: semua komponen pure client, tidak ada server-only import.