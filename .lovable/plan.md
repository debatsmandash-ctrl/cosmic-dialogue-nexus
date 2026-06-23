## Goal

1. Ganti black hole jadi gaya **Interstellar Gargantua** (bukan "bola + cakram CD") — disc-nya melengkung di atas dan bawah event horizon karena lensing gravitasi, photon ring tipis tajam, lighting sekitar warm orange yang membungkus horizon.
2. Sebar semua node informasi **merata ke seluruh volume galaxy** dengan **jarak antar level seragam = 30 unit** (root→section = section→subsection = subsection→leaf), pakai **fibonacci sphere per level**.
3. Upgrade cakram galaxy: dust lane gelap realistis + bulge→disc gradient + spiral arms lebih jelas + tilt/parallax dust.

---

## 1. Black hole — Gargantua look (`CoreBlackHole.tsx` rewrite)

**Hapus**: layout cakram datar 2-layer + torus photon ring + dual fresnel sphere rim. Penampilan "CD" datang dari ring datar di equator.

**Ganti dengan**:
- **Event horizon**: sphere hitam kecil (radius 1.2), tetap.
- **Curved accretion disc dengan lensing**: satu mesh ring tipis di plane equator dengan shader yang me-render disc dua kali via fragment trick — bagian belakang disc dibengkokkan ke atas/bawah lewat photon-deflection approximation. Pendekatan praktis: render disc sebagai geometry, lalu duplikasi mesh kedua di plane yang sama tapi shader-nya menggambar "top arc" dan "bottom arc" melengkung di atas horizon menggunakan parametric mapping `(r, θ) → screen` dengan offset Y proporsional `1/r`. Ini meniru efek lensing Gargantua tanpa raymarching penuh.
- **Photon ring**: torus sangat tipis (tube 0.02, radius 1.45) putih-kekuningan, additive, sebagai garis lensing tajam yang membungkus horizon.
- **Top/bottom lensing arcs**: 2 ring tambahan di atas (+Y) dan bawah (−Y) horizon — meniru sisi-jauh disc yang "terangkat" ke atas dan bawah view kamera. Diorientasikan menghadap kamera (billboard tipis) dengan kelengkungan vertex shader.
- **Doppler beaming**: sisi mendekati kamera 3-4× lebih terang (sudah ada, intensifkan).
- **Glow sekitar**: sprite radial warm orange (#ff8830 → transparent) di belakang horizon untuk lighting envelopment.
- **Hapus**: outer einstein blue rim, 2nd lensing arc faint biru — terlalu "ring planet".

Palet: inner `#fff4d6` → mid `#ffa850` → outer `#b03010`. Photon ring `#fff0c8`. Glow `#ff7028`.

## 2. Uniform spacing layout (`src/lib/graph/build.ts` rewrite)

Ganti circular orbit cluster + jitter sekarang dengan **per-level fibonacci sphere**:

```
LEVEL_RADIUS = 30 (configurable)
level 0 (root)        → posisi origin
level 1 (sections)    → fibonacci sphere radius = 30, N points
level 2 (subsections) → tiap parent jadi anchor; child ditempatkan
                        di fibonacci-sphere lokal radius 30 di sekitar parent
level 3+              → recurse, tiap parent jadi pusat shell baru radius 30
```

Fibonacci sphere formula (golden angle):
```
φ = π * (3 - √5)
for i in 0..n-1:
  y = 1 - (i/(n-1)) * 2          // -1..1
  r = √(1 - y²)
  θ = φ * i
  pos = (cos(θ)*r, y, sin(θ)*r) * RADIUS
```

**Disc flattening**: NONE — user pilih "Fibonacci sphere per level", jadi nodes mengisi volume bola merata, bukan dipipihkan. Galaxy disc tetap volumetric dari star particles, tapi node graph itu sendiri spherical.

**Collision avoid**: kalau child shell milik 2 parent berdekatan saling tumpang, jitter rotasi tiap shell pakai PRNG seeded oleh parent.id sehingga deterministik. Tidak ada penyesuaian jarak — jarak tetap 30.

**Edge length**: otomatis seragam 30 karena tiap child di sphere radius 30 dari parent-nya.

**Hapus**: `roles`/`event` orbit ring, `rJ/thJ/yJ` jitter, disc-flattening pass.

## 3. Galaxy disc upgrades (`GalaxyVolume.tsx`, `NebulaClouds.tsx`, `GalaxyGlow.tsx`)

- **Dust lane gelap** (`GalaxyVolume.tsx`): kembalikan `genDustLanes` tapi pakai **multiplicative blending** dengan warna coklat-gelap `(0.08, 0.05, 0.03)`, density ~12k, ditempatkan tepat **di dalam** arm (phase offset −0.18) sebagai silhouette. Beda dari kosmik dust di `NebulaClouds` — yang ini sangat tipis (slab y ±1) dan langsung di plane disc.
- **Bulge → disc gradient** (`GalaxyGlow.tsx`): tambah radial sprite warm `#ffd890 → #ff8040 → transparent` dengan falloff `exp(-r²/σ²)`, σ besar (~80) supaya transisi halus dari bulge terang ke arm gelap. Hapus banding stripe yang masih ada.
- **Spiral arms lebih jelas** (`GalaxyVolume.tsx`): tightness `b = 0.22 → 0.26`, transverse spread `4 + r*0.08 → 3 + r*0.05` (lengan lebih ramping/tegas), naikkan brightness HII regions 1.3×, naikkan thin-disc star count 55k → 70k desktop.
- **Tilt + parallax dust** (`NebulaClouds.tsx`): tilt galaxy +12° (sudah ~6°+4° → naikkan ke 14°), tambah 1 layer dust depan kamera tipis (Z+150 dari pusat) supaya ada parallax saat orbit.

## 4. Settings (`store.ts`, `SettingsPanel.tsx`)

- Tambah slider `levelSpacing` (15–60, default 30) untuk tune jarak antar level live.
- Edge `showAllLinks` tetap.

---

## Technical notes

- Curved disc Gargantua: pakai 1 ring geometry, shader fragment hitung `worldY` offset berdasar angle relatif ke kamera + radius — bagian disc di "belakang" horizon dipindah ke fragment dengan UV-remap (`uv.y` pada θ tertentu di-shift). Ini approximation, bukan ray-traced lensing — tapi visually sangat mendekati Gargantua karena bloom post-process akan menutupi seam.
- Fallback: kalau approximation seam terlalu kentara, render 2 ring terpisah (front-half flat, back-half melengkung billboard ke atas) → 100% guaranteed look.
- Fibonacci layout deterministik (no PRNG di posisi pusat shell), hanya rotasi shell seeded oleh `parent.id` hash supaya child cluster tidak collide.
- Edge graph tetap pakai sistem `HoverEdges` / `showAllLinks` existing — panjang edge ~30 visually konsisten.

## Files touched

- Rewrite: `src/components/universe/CoreBlackHole.tsx`, `src/lib/graph/build.ts`
- Edit: `src/components/universe/GalaxyVolume.tsx`, `src/components/universe/GalaxyGlow.tsx`, `src/components/universe/NebulaClouds.tsx`, `src/components/universe/Universe.tsx` (tilt + camera distance match new layout radius), `src/lib/store.ts`, `src/components/shell/SettingsPanel.tsx`
