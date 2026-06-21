# Rencana Update Debate Universe

## 1. Background: Milky Way realistis (ganti CosmicCrust)

- **Hapus / nonaktifkan** efek nebula pink+magenta+orange di `CosmicCrust.tsx` (sumber utama "gas-gas pink").
- Bangun langit baru `MilkyWaySky.tsx`:
  - **Sphere skybox gelap** (dasar `#03050d` → `#000` di kutub) — bukan hitam total tapi sangat gelap supaya bintang & node tetap kontras.
  - **Disc / piringan galaksi**: shader sphere kedua (BackSide) yang merender **pita Milky Way** memanjang di ekuator. Bahan: FBM noise + ridge untuk dust lane gelap, blend dengan warna *putih kebiruan → krem hangat → emas redup* (mirip foto referensi, tanpa pink/magenta).
  - **Kamera di dalam disc**: orientasi pita = horizon, sehingga melintang di tengah layar persis seperti foto referensi.
  - **Bias gelap**: opacity pita dikurangi (~0.55), tepi luar fade ke gelap, supaya bintang & node tetap fokus.
  - **Lighting halus**: 2–3 PointLight redup berwarna krem & biru di sepanjang core galaksi (bloom-friendly) sebagai aksen, bukan glow penuh.
- StarField tetap, tapi naikkan sedikit kepadatan lapisan jauh agar nyambung dengan pita.

## 2. Jarak cluster lebih seimbang

Di `src/lib/graph/build.ts`:

- Turunkan jarak cluster bermasalah:
  - `active_member` (SMANDASH) `dist: 56 → 38`
  - `competitor` `dist: 54 → 40`
  - (cluster lain disesuaikan tipis biar tidak tumpang tindih)
- Naikkan **sebaran sub-hub → leaf** di kedua cluster supaya bintang anak tidak terlalu nempel ke induk:
  - Radius `placeCloud` untuk teams & speakers SMANDASH/competitor diperbesar ~1.6×.
- Hasil: jarak universe → cluster → sub-cluster → bintang lebih proporsional (cluster mendekat, leaf merenggang).

## 3. Bintang Motion Bank warna neon hangat

- Palet baru (pink-orange-yellow): `#ff3d8b`, `#ff8b3d`, `#ffd53d`, `#ff3df5`.
- Di blok motion (`build.ts` ~line 353), ganti `paletteColor(...)` agar warna selalu di-pick dari palet ini secara deterministik per id; pastikan **tidak pernah hitam** (clamp luminance minimum).
- Sub-hub `jenis-mosi` tetap warnanya sendiri, hanya leaf bintang yang dipaksa warm-neon.

## 4. Roles: pisah AP & BP + sub-skill

### Data
Buat `src/data/raw/roles.json` baru:
```
{
  "asian": [ { id, nama, short, side, time, inti, sub: [ {id, label, kind: "case|timing|structure|speech", desc} ] } x6 + reply ],
  "british": {
    "opening_gov":  [ PM, DPM ],
    "opening_opp":  [ LO, DLO ],
    "closing_gov":  [ MG, GW ],
    "closing_opp":  [ MO, OW ]
  }
}
```
Setiap role punya array `sub` berisi minimal:
- **Strategi Case Building**
- **Timing** (alokasi waktu detail per menit)
- **Structure** (template signpost) — tampil dengan styling khusus saat hover
- **Speech Timing** (universal, default di tiap role)

### Graph (build.ts)
Pecah cluster `roles` jadi 2 sub-hub utama:
- `subhub:roles:ap` ("ASIAN PARLIAMENTARY") — child: GOV/OPP mini-hub → role node → sub-skill leaf (bintang).
- `subhub:roles:bp` ("BRITISH PARLIAMENTARY") — child: OG / OO / CG / CO → 2 role per tim → sub-skill leaf.
- Setiap role node ⇒ 3–4 leaf bintang (case-building, timing, structure, speech-timing) dengan warna lembut berbeda per kind.

### UI
- Di `PanelContent.tsx`, tambah renderer untuk node `kind: "role"` & `"role-skill"`:
  - Role: tampil overview + tabs (Case Building, Timing, Structure, Speech Timing).
  - "Structure" tab: render dengan styling khusus (kartu bertingkat / outline berwarna) saat di-hover.
- Speech Timing dibuat sebagai helper konstan yang diapply ke semua role (DRY).

## 5. Verifikasi

- Jalankan preview, cek:
  - Pita Milky Way melintang horizon, gelap tapi terlihat, tanpa pink nebula.
  - Cluster SMANDASH & Competitor lebih dekat ke pusat; leaf-nya tidak menempel.
  - Tidak ada bintang Motion Bank yang hitam.
  - Cluster Roles punya 2 cabang AP / BP dengan struktur lengkap & sub-skill bisa di-klik.

## Catatan teknis singkat
- File baru: `src/components/universe/MilkyWaySky.tsx`, `src/data/raw/roles.json`.
- File diubah: `Universe.tsx` (swap CosmicCrust → MilkyWaySky), `build.ts` (jarak + motion color + roles graph), `data/index.ts` (export ROLES_AP / ROLES_BP), `PanelContent.tsx` (renderer role + sub-skill).
- Tidak perlu Lovable Cloud untuk update ini — semuanya frontend & data statis.
