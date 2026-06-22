
# Galaksi Bima Sakti 3D Volumetrik — Debate Universe sebagai Black Hole

Tujuan: bukan ilustrasi flat top-down, tapi **galaksi 3D bervolume** mirip foto/sim Milky Way asli — ada bulge bulat menonjol di pusat, disc tipis tapi tetap punya **ketebalan vertikal** dan **halo bola** di sekelilingnya, dust lanes 3D, dan SMBH (Sgr A*) di pusat. Konten, hover, klik, edges, label, panel — semua tetap.

## Referensi visual (Milky Way nyata)

- **Bulge**: bola pipih besar di pusat (rasio ~1.6:1.6:1.0), warna amber/cream, sangat padat bintang.
- **Thin disc**: ~3% tebal radius, lengan spiral logaritmik 4 buah (Perseus, Sagittarius, Scutum-Centaurus, Norma), warna biru-putih dgn cluster O/B muda di tepi lengan.
- **Thick disc**: 2-3x lebih tebal dari thin disc, populasi bintang lebih tua (kuning-oranye), densitas lebih rendah.
- **Stellar halo**: bola besar sangat sparse, globular clusters tersebar.
- **Dust lanes**: pita gelap 3D di sepanjang lengan, terlihat sbg siluet kalau dilihat dari sisi (edge-on).
- **Sgr A***: SMBH 4 juta massa matahari di pusat, dgn accretion disc kecil.

## 1. Re-layout cluster mengikuti struktur 3D galaksi (`src/lib/graph/build.ts`)

Setiap cluster ditempatkan di komponen galaksi yg sesuai dgn karakternya:

- **Bulge (pusat, dekat root)**:
  - META, ASSISTANT, EDITOR — dekat root, posisi gaussian 3D radius 12-22, tebal ~y±10 (bulat menonjol, bukan pipih).
- **Thin disc — sepanjang lengan spiral**:
  - 4 lengan: `r(θ) = a·exp(b·θ)`, b=0.22, offset 90°. Cluster utama dipasang di tulang punggung lengan, jarak radial 28-95.
  - **Lengan 1**: MATTER (sains/teori, anggap "Sagittarius arm") — r=35
  - **Lengan 2**: MOTION BANK + JENIS_MOSI — r=55
  - **Lengan 3**: ROLES + STYLES — r=42
  - **Lengan 4**: COMPETITOR + EVENT — r=70
  - Tebal disc: `y = gaussian(0, 2.5)` → tipis tapi punya volume nyata.
  - Lebar transversal lengan: gaussian σ=8, naik dgn r.
- **Thick disc** (lebih tebal, lebih sparse):
  - ACTIVE_MEMBER (SMANDASH) + KAMUS — y±6, jarak radial 25-45, tidak terikat lengan.
- **Halo bola**:
  - PRACTICE, CIRCUIT — sebagai "globular cluster" di luar disc, posisi acak di bola radius 70-110, y bebas.

Leaf-leaf di tiap cluster:
- Cluster di disc → leaf juga mengikuti slab tipis cluster-nya (y squash 0.3), menyebar di pita lengan.
- Cluster di bulge → leaf gaussian 3D bulat penuh.
- Cluster di halo → leaf bola penuh kecil.

Spacing relax pass tetap → tidak nabrak.

## 2. SMBH pusat sbg root (`src/components/universe/CoreBlackHole.tsx` baru)

Bervolume, bukan sprite flat:

- **Event horizon**: sphere hitam radius ~3.5, depthWrite true (benar2 menutup apa pun di belakangnya = efek gravitasi).
- **Photon ring 3D**: torus tipis (bukan ring flat) radius 4.2, tube 0.15, emissive amber `#ffb070` + bloom.
- **Accretion disc 3D**: ring geometry rIn 4.5 rOut 14 dgn ketebalan vertikal subtle (extruded/dua layer offset y±0.3), custom shader: noise FBM turbulent, warna amber-cream → magenta → biru, rotasi diferensial.
- **Doppler beaming**: shader nge-boost brightness di sisi yg mendekati kamera.
- **Bipolar jet** (opsional, halus): 2 cone geometry ±y, panjang 30, alpha tipis 0.2, additive.
- **Lensing halo**: sprite ring tipis di belakang horizon dgn warp shader.
- Tilt disc ~12°. Klik = select root.

## 3. Komponen disc bervolume (`src/components/universe/GalaxyVolume.tsx` baru)

Mengganti `StarField`/`StarClusters` di `Universe.tsx` dgn lapisan 3D yg mengikuti densitas galaksi nyata:

- **Bulge particles**: 6.000 titik, distribusi `r ∝ exp(-r/r0)` (Hernquist profile), ratio 1.6:1.6:1.0 → benar2 bulat menonjol. Warna O/K kuning-amber.
- **Thin disc particles**: 18.000 titik, mengikuti densitas 4 lengan spiral (offset radial dari tulang punggung lengan: gaussian transverse), `y = gaussian(0, scaleHeight=2)` dgn `scaleHeight` 2 di pusat naik ke 5 di tepi (flare). Warna campur biru O/B (35%, lebih banyak di tepi lengan), putih A/F (30%), kuning G/K (25%), merah M (10%).
- **Thick disc particles**: 5.000 titik, `y = gaussian(0, 8)`, lebih sparse, populasi kuning-oranye.
- **Stellar halo particles**: 4.000 titik, bola besar (r 100-280), gaussian falloff radial, sangat redup, kuning pucat.
- **Globular clusters**: 8 blob padat (~250 titik each) di posisi acak di halo bola.
- **Dust lanes**: lapisan tambahan 8.000 partikel **gelap** (warna `#0a0604`, additive **subtract** atau alpha multiply) yg ditempatkan di **sela-sela** lengan spiral di slab tipis y±1 → menciptakan siluet pita gelap 3D yg terlihat dari segala sudut.
- **Nebula clouds bervolume**: 12 sprite billboard besar (auto-face camera) ukuran 40-120, warna terkurasi (H-alpha pink, OIII cyan), opacity 0.2, ditempatkan di sepanjang lengan. Sprite tetap, tapi ditempatkan di posisi 3D yg tersebar di slab → terasa volumetrik saat kamera bergerak.

Semua particles: custom `THREE.Points` + ShaderMaterial, size-attenuated, soft circle alpha, per-vertex color & temperature.

## 4. Bintang besar foreground bervolume

~60 bintang besar sbg **sphere mesh kecil** (bukan sprite) dgn emissive material + halo sprite — supaya saat kamera dekat terasa 3D, bukan datar.

## 5. Skybox & rim-light (`MilkyWaySky.tsx`)

- Pano milky way yg sudah ada **di-dim jadi 0.45 opacity** → jadi backdrop jauh, biar volume disc di scene yg dominan.
- 3 pointLight rim tetap (amber core, biru sisi, ungu samping atas) → memberi shading 3D pada node-node sphere supaya tidak terlihat flat.

## 6. Kualitas render & 4K HDR (Universe.tsx Canvas)

- `gl={{ antialias: true, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.2, outputColorSpace: SRGBColorSpace }}`
- `dpr={[1.5, 2]}` desktop.
- EffectComposer: Bloom (intensity 1.5, threshold 0.22, mipmapBlur, radius 0.85), SMAA, Vignette halus, ChromaticAberration tipis (existing).
- Optional: GodRays dari core blackhole (desktop tier hanya).

## 7. Animasi smooth & differential rotation

- **Whole galaxy group** rotasi y sangat pelan (`dt * 0.010` rad/s) → 1 putaran ~10 menit, supaya node ikut bergerak konsisten dgn dust & particles (edges tetap presisi).
- **Differential rotation** hanya di **dust shader & accretion disc** via uniform time (inner cepat, outer lambat) — visual saja, tidak menggeser node.
- Bulge bisa rotasi sedikit lebih cepat (effect parallax internal).
- Camera default: posisi `(120, 70, 180)` look at root → user lihat galaksi dari sudut 25° atas, bulge menonjol & lengan spiral kelihatan.
- Idle auto-orbit tetap (sudah ada).

## 8. File summary

**Baru:**
- `src/components/universe/CoreBlackHole.tsx` — SMBH 3D + accretion disc + photon ring + jets
- `src/components/universe/GalaxyVolume.tsx` — bulge/thin disc/thick disc/halo/dust particles, semua 3D
- `src/components/universe/NebulaClouds.tsx` — billboard sprite nebula H-alpha/OIII

**Diubah:**
- `src/lib/graph/build.ts` — re-layout: bulge/thin disc/thick disc/halo assignment per cluster, leaf mengikuti slab
- `src/components/universe/Universe.tsx` — wire CoreBlackHole, GalaxyVolume, NebulaClouds, ganti StarField/StarClusters, tone mapping, bloom tuning, group rotation, camera default
- `src/components/universe/MilkyWaySky.tsx` — turunkan opacity jadi backdrop

**Tidak diubah:** semua data, edges logic, hover/select, panel info, mobile shell, settings, HoverEdges.

## Catatan teknis

- Total partikel: 6k+18k+5k+4k+2k+8k ≈ 43k → masih 60fps di PC modern (1 draw call per Points layer, custom shader ringan).
- Dust lanes pakai **alpha-darken** trick: render setelah disc stars dgn `blending: NormalBlending`, `color: #0a0604`, `opacity: 0.6` → benar2 menggelapkan bintang di belakangnya = siluet pita gelap.
- Mobile: GalaxyVolume punya tier ringan (partikel 1/3, no dust lanes, no nebula) via `useDeviceProfile`.
- Spiral layout deterministik (seed sudah ada).
- Black hole tetap clickable → select(root).

## Risiko

- Particle density tinggi di bulge bisa "menelan" cluster di pusat → mitigasi: kurangi density particle di radius < cluster terdekat (carve-out sphere).
- Dust lanes terlalu gelap bisa menutupi node leaf → opacity 0.6, dan dust slab y±1 sangat tipis sehingga node di y>2 tidak terganggu.
