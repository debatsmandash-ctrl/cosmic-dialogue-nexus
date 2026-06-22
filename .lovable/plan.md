## Tujuan
Naikkan realisme dari ~5% ke level referensi (panorama Milky Way + top-down spiral). Node tetap berfungsi sama, hanya posisinya menjadi **cincin orbit longgar** mengikuti cakram, kamera **free-orbit cinematic**, render **bore-up max**.

## 1. Layout node — cincin orbit (`src/lib/graph/build.ts`)
- Tiap cluster hub diberi `orbitRadius` (jarak dari pusat) berbeda per kategori, contoh: roles=55, motions=95, vocab=140, members=180, competitors=220, event=260.
- Hub disebar merata di sudut θ pada cincinnya (golden-angle agar tidak overlap).
- Leaf node mengelilingi hub-nya dalam **arc kecil di cincin yang sama** (bukan bola), sehingga membentuk pita memutar pusat.
- Ketebalan vertikal: `y = gauss(0, 2 + r*0.012)` — tipis di tengah, sedikit melebar di pinggir (volume tetap ada, kesan ramping).
- Pusat = CoreBlackHole tetap di (0,0,0). Tidak ada perubahan data/edge/hover.

## 2. Disc bintang realistis (`GalaxyVolume.tsx` — rewrite)
Target ~150k partikel dengan 7 layer:
- **Bulge bar** ~10k — bentuk bar memanjang (ratio 1.0:0.45:0.35, rotasi 25°) seperti referensi #3.
- **Spiral arms** ~55k — 2 lengan utama + 2 lengan minor, log-spiral `b=0.25`, jitter halus + clumping (Perlin) supaya tidak mulus sintetis.
- **HII regions** ~6k — gumpalan pink-merah (H-alpha) sepanjang lengan, persis referensi #3 (titik-titik merah muda).
- **Thin disc background** ~35k — distribusi merata di cakram, warm.
- **Thick disc** ~15k — kuning-oranye, sebaran vertikal lebih lebar.
- **Halo + globular clusters** ~10k + 14 cluster — sparse, di luar bidang.
- **Dust lanes** ~20k — partikel gelap multiply-blend dengan curl-noise mengikuti lengan, plus **edge-on dust band** silhouette mengikuti pita gelap di referensi #1.

Tiap partikel: warna by spectral class (O/B biru, A/F putih, G/K kuning, K/M oranye-merah), size attenuation, soft-disc shader dengan **diffraction spike** ringan pada bintang besar (4-point cross) untuk highlight.

## 3. Volumetric glow disc (`GalaxyGlow.tsx` baru)
Sprite disc transparan radial gradient (krem→biru→fade) di plane galaksi, **2 layer** beda skala + rotasi differensial, memberi efek "kabut bintang" terus-menerus seperti glow halus di ref #3. Tambah **bulge glow** bola gradient krem di pusat.

## 4. Nebula clouds (`NebulaClouds.tsx` baru)
12–16 billboard sprite shader FBM (H-alpha pink + OIII teal) ditempatkan di sepanjang lengan. Selalu hadap kamera, additive blend, soft alpha.

## 5. Skybox upgrade (`MilkyWaySky.tsx`)
- Ganti `milkyway_pano.jpg` dengan **upload #1** (resolusi lebih tinggi, kontras lebih baik) via `lovable-assets create`.
- Tilt skybox dipisah dari galaksi internal → terasa "kita di dalam disc" sementara model 3D mengambang di tengah.
- Tambah subtle parallax 2-layer: panorama jauh + lapisan bintang tipis lebih dekat dengan rotasi sedikit beda.

## 6. Black hole realistis & kecil (`CoreBlackHole.tsx`)
- **Tanpa bipolar jet** (dihapus) sesuai permintaan.
- Event horizon mengecil: radius `1.4` (dari 3.6). Bola hitam pekat dengan **gravitational lensing rim** sangat tipis (Fresnel shader, biru-putih) meniru foto EHT M87/Sgr-A.
- **Photon ring** torus tipis radius `1.55`, warna `#ffd9a0` toneMapped=false.
- **Accretion disc** dipersempit (inner 1.7, outer 5.5), shader dipertahankan dengan tweak warna lebih realistis (orange-merah inner → kuning → fade), tilt 18°, **Doppler beaming** dipertahankan (sisi mendekat lebih terang).
- Label "DEBATE UNIVERSE" tetap, distanceFactor disesuaikan supaya proporsional dengan BH kecil.

## 7. Lighting & post-processing (`Universe.tsx`)
- Tambah `@react-three/postprocessing` (jika belum): **Bloom** (intensity 1.8, threshold 0.15, mipmap blur), **GodRays** dari bulge (bukan BH), **Vignette**, **SMAA**, **ChromaticAberration** sangat tipis, **DepthOfField** focus di node terdekat.
- ACES tone mapping, exposure 1.25, `dpr=[1.5, 2]`, `powerPreference: "high-performance"`, `antialias: true`, `logarithmicDepthBuffer: true`.
- 3 point light cinematic: krem hangat dari bulge, biru dingin dari sisi luar, rim ungu dari atas.

## 8. Animasi cinematic
- Galaxy group rotasi `0.006 rad/s` (lebih lambat, terasa epic).
- **Differential rotation** pada disc shader: partikel dekat pusat lebih cepat (Kepler-ish).
- Dust lane rotasi terpisah ±0.002.
- Camera default `(160, 90, 220)`, OrbitControls bebas (sudah ada), idle drift halus 8° auto-orbit.

## 9. Loader & progress
Karena partikel 150k + texture besar, tambah progress % di `Loader.tsx` (baca `useProgress` dari drei).

## File yang berubah
**Baru**: `src/components/universe/GalaxyGlow.tsx`, `src/components/universe/NebulaClouds.tsx`, `src/assets/milkyway_v2.jpg.asset.json`
**Edit**: `src/lib/graph/build.ts`, `src/components/universe/GalaxyVolume.tsx` (rewrite), `src/components/universe/MilkyWaySky.tsx`, `src/components/universe/Universe.tsx`, `src/components/universe/CoreBlackHole.tsx` (kecil + tanpa jet), `src/components/shell/Loader.tsx`
**Install**: `@react-three/postprocessing` jika belum ada
**Tidak diubah**: data, edges, hover, SidePanel, mobile shell, role labels.

## Catatan
- Ref #3 (top-down spiral) tidak ditempel sebagai tekstur disc (akan terlihat 2D pipih). Estetikanya dicapai lewat partikel + glow + HII regions + dust lanes yang meniru komposisinya.
- Ref #1 dipakai sebagai skybox panorama HD.
- Mobile tetap auto-fallback ke partikel rendah lewat `useDeviceProfile`.