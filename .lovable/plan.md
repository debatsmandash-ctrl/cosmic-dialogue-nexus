## Tujuan

1. **Upgrade grafik 3D** — node ditata membentuk **bola utuh** (bukan piringan galaksi), agak melebar tapi tetap volumetric sphere, dengan cluster terpisah rapi seperti rasi. Skybox 16K-HDR realistis.
2. **Mode 2D opsional** di Settings (default tetap 3D) — flat constellation map acak (bukan bola).
3. **Playlist musik multi-track** — 6 lagu, user bisa enable/disable & atur mode play.
4. **Optimasi panel Settings** — restruktur jadi tab supaya tidak panjang.

---

## 1. Upgrade Grafik 3D

### Layout — BOLA, bukan galaksi
File: `src/lib/graph/build.ts`
- Anchor cluster di permukaan **sphere** menggunakan distribusi Fibonacci spherical → titik tersebar merata di semua arah (atas/bawah/samping). 
- **Bukan disc/piringan** — proporsi axis RX=24, RY=22, RZ=24 (hampir bulat, sedikit melebar horizontal saja, TIDAK pipih).
- Anak nodes mengorbit anchor di sub-sphere lokal radius 3-6 → tiap cluster jadi "gugusan bintang" 3D yang clearly separated.
- Noise perturbation kecil supaya organik, tidak terlalu geometric.

### Skybox HDR realistis
File: `src/components/universe/MilkyWaySky.tsx` + asset baru
- Generate panorama equirectangular **premium quality** (1920×960) — referensi gambar 2: deep navy + ungu lembut, milky way band, bintang padat beragam ukuran.
- Sphere segments 96→128, anisotropy 16, tone mapping ACESFilmic.
- Tambah layer parallax stars (Points, additive blending) untuk depth saat kamera bergerak.

### Quality preset
- LOW: skybox saja
- MEDIUM: + 2000 parallax stars
- HIGH: + 4000 stars + bloom
- ULTRA: + 6000 stars + bloom + subtle nebula sprites

---

## 2. Mode 2D (Settings, non-default)

`Settings.viewMode: "3d" | "2d"` default `"3d"`.

File baru: `src/components/universe/Universe2D.tsx`
- Canvas/SVG flat full-screen, background gradient navy-ungu + tile starfield.
- Node ditata sebagai **rasi bintang acak** (random tapi seeded — stabil tiap reload): tiap cluster jadi konstelasi titik dengan garis tipis menghubungkan node terdekat (vibe rasi Orion).
- **Bukan bola, bukan lingkaran** — bentuk konstelasi bebas/acak.
- Pan/zoom, klik bintang → buka SidePanel (reuse existing).

`src/routes/index.tsx`: render `<Universe />` atau `<Universe2D />` sesuai setting.

---

## 3. Playlist Musik

Upload 5 lagu baru via `lovable-assets create` (tetap pertahankan Interstellar lama = 6 track total):
- Interstellar Theme (existing)
- No Time For Caution
- I Really Want to Stay at Your House
- Dragonspine Medley
- Dream Aria
- Columbina's Lullaby

File baru: `src/lib/playlist.ts` — definisi track.

Update `Settings`:
```ts
playlist: { trackId: string; enabled: boolean }[]
playMode: "sequential" | "shuffle" | "single"
```

Update `AmbientAudio.tsx`: putar track dari list enabled, on `ended` → next (atau shuffle). Tampilkan judul track + tombol skip kecil di sebelah tombol mute.

UI Settings: list 6 lagu dengan toggle on/off + radio mode play + volume.

---

## 4. Optimasi SettingsPanel

`src/components/shell/SettingsPanel.tsx` → restruktur jadi **tab horizontal**:
- **DISPLAY** — viewMode (2D/3D), quality, bloom, nebula opacity, star size, hover edges, mobile layout
- **PERFORMANCE** — fpsCap, fps counter
- **AUDIO** — playlist track toggles, playMode, volume, master mute
- **ACCESSIBILITY** — reduced motion, high-contrast, auto-rotate + speed, damping

Hanya satu tab visible → panel jauh lebih ringkas.

---

## Files

```text
Create:
- src/components/universe/Universe2D.tsx
- src/lib/playlist.ts
- src/assets/milkyway_pano_hd.jpg.asset.json
- src/assets/audio/{notime,stay,dragonspine,dreamaria,columbina}.mp3.asset.json

Edit:
- src/lib/store.ts                          (+ viewMode, playlist, playMode)
- src/lib/graph/build.ts                    (spherical layout, NOT disc)
- src/components/universe/MilkyWaySky.tsx   (new HD asset + parallax stars)
- src/components/universe/Universe.tsx      (tone mapping)
- src/components/shell/SettingsPanel.tsx    (tab layout + playlist UI)
- src/components/shell/AmbientAudio.tsx     (multi-track player)
- src/routes/index.tsx                      (3D/2D switch)
```

Catatan kunci: layout **sphere bulat penuh** — TIDAK pipih jadi piringan galaksi. Skybox tetap punya pita milky way (estetika background), tapi node graph 3D-nya bola.
