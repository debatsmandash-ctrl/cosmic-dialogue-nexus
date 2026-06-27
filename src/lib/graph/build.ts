import {
  MOTIONS, JENIS_MOSI, VOCAB, MATTER,
  STYLES, ROLES, ROLES_AP, ROLES_BP, PRACTICE_MODES, CIRCUIT, ASSISTANT_PROMPTS, META_NODES, EDITOR_NODES,
  COMPETITORS, ACTIVE_MEMBERS, EVENTS, paletteColor,
} from "@/data";
import type { StarNode, StarEdge, ClusterKey } from "@/data/types";
import { loadOverrides } from "@/lib/editor/overrides";

// ─── Deterministic PRNG ───
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260614);

type V3 = [number, number, number];
const normalize = (v: V3): V3 => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/L, v[1]/L, v[2]/L]; };
const scale = (v: V3, s: number): V3 => [v[0]*s, v[1]*s, v[2]*s];
const add = (a: V3, b: V3): V3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const sub = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const lerp = (a: V3, b: V3, t: number): V3 => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
const dist = (a: V3, b: V3): number => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);

// ─── SHELL LAYOUT — semua node berada di SATU bola (kulit) ───
// User request: "semuanya jadi 1 bola yang menyebar — section jadi kulit bola itu".
// SHELL_R = radius bola utama. Semua cluster/subhub/leaf diproyeksikan ke shell
// dengan noise radial tipis supaya tidak "rapat seperti dinding tegel".
export const SHELL_R = 62;
const SHELL_NOISE = 2.2; // ±radial offset (unit)

interface ClusterMeta { key: ClusterKey; label: string; color: string; dist: number; }
const CLUSTERS: ClusterMeta[] = [
  { key: "matter",        label: "MATTER",       color: "#00ffc8", dist: SHELL_R },
  { key: "motion",        label: "MOTION BANK",  color: "#ff8b3d", dist: SHELL_R },
  { key: "kamus",         label: "KAMUS",        color: "#38bdf8", dist: SHELL_R },
  { key: "competitor",    label: "COMPETITOR",   color: "#fb7185", dist: SHELL_R },
  { key: "active_member", label: "SMANDASH",     color: "#00ffc8", dist: SHELL_R },
  { key: "event",         label: "EVENT",        color: "#fde047", dist: SHELL_R },
  { key: "roles",         label: "ROLES",        color: "#ff6b6b", dist: SHELL_R },
  { key: "styles",        label: "STYLES",       color: "#f0c040", dist: SHELL_R },
  { key: "practice",      label: "PRACTICE",     color: "#ff9f43", dist: SHELL_R },
  { key: "circuit",       label: "CIRCUIT",      color: "#7b5ea7", dist: SHELL_R },
  { key: "assistant",     label: "ASSISTANT",    color: "#00d4aa", dist: SHELL_R },
  { key: "editor",        label: "EDITOR",       color: "#94a3b8", dist: SHELL_R },
  { key: "meta",          label: "META",         color: "#e8f4ff", dist: SHELL_R },
];

// Project arbitrary point onto the shell (with optional small radial jitter).
function projectToShell(p: V3, jitter = SHELL_NOISE): V3 {
  const n = normalize(p);
  const r = SHELL_R + (rand() - 0.5) * 2 * jitter;
  return scale(n, r);
}

function fibDirections(n: number, jitter = 0.0): V3[] {
  const out: V3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = phi * i;
    out.push(normalize([
      Math.cos(th) * r + (rand() - 0.5) * jitter,
      y + (rand() - 0.5) * jitter,
      Math.sin(th) * r + (rand() - 0.5) * jitter,
    ]));
  }
  return out;
}

// Sample `count` directions inside a spherical cap of half-angle `halfAngle`
// centered on `centerDir`. Uniform area distribution on the cap.
function samplePatchDirs(centerDir: V3, halfAngle: number, count: number): V3[] {
  const cd = normalize(centerDir);
  // build orthonormal basis (cd, u, v)
  const tmp: V3 = Math.abs(cd[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize([
    cd[1]*tmp[2] - cd[2]*tmp[1],
    cd[2]*tmp[0] - cd[0]*tmp[2],
    cd[0]*tmp[1] - cd[1]*tmp[0],
  ]);
  const v: V3 = [
    cd[1]*u[2] - cd[2]*u[1],
    cd[2]*u[0] - cd[0]*u[2],
    cd[0]*u[1] - cd[1]*u[0],
  ];
  const cosA = Math.cos(halfAngle);
  const out: V3[] = [];
  // golden-angle azimuth + uniform-area cosθ for even spread on the cap
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const k = count === 1 ? 0.5 : (i + 0.5) / count;
    const cosTh = 1 - k * (1 - cosA); // ∈ [cosA, 1]
    const sinTh = Math.sqrt(Math.max(0, 1 - cosTh * cosTh));
    const az = phi * i + rand() * 0.6; // slight jitter
    const x = sinTh * Math.cos(az);
    const y = sinTh * Math.sin(az);
    out.push(normalize([
      cd[0]*cosTh + u[0]*x + v[0]*y,
      cd[1]*cosTh + u[1]*x + v[1]*y,
      cd[2]*cosTh + u[2]*x + v[2]*y,
    ]));
  }
  return out;
}

// patch sizing — scale with sqrt(count) so dense clusters get a wider patch.
function patchHalfAngle(count: number, base = 0.10, k = 0.045, max = 0.55): number {
  return Math.min(max, base + Math.sqrt(Math.max(1, count)) * k);
}

// placeCloud: place `count` nodes on the SHELL in a patch around the direction
// hinted by `center`. The legacy `radius`/`minSep` args are repurposed:
// - `radius` scales the patch width (larger radius = wider patch, more spread)
// - `minSep` is ignored (shell layout handles separation via patch sizing).
function placeCloud(center: V3, radius: number, count: number, _minSep?: number): V3[] {
  if (count === 0) return [];
  // scale patch by both count and the caller's old "radius" so callers that
  // requested wider clouds still get wider patches.
  const widthScale = Math.max(0.4, Math.min(1.8, radius / 12));
  const half = patchHalfAngle(count, 0.10, 0.045 * widthScale, 0.55);
  const dirs = samplePatchDirs(normalize(center), half, count);
  return dirs.map((d) => scale(d, SHELL_R + (rand() - 0.5) * 2 * SHELL_NOISE));
}

// placeBranch: kids of a leaf — tight cluster directly around the leaf's own
// position on the shell. We ignore `hubCenter`/`distMin`/`distMax`: kids share
// the shell with the parent. Half-angle is tighter so leaf-children stay near.
function placeBranch(center: V3, _hubCenter: V3, count: number, distMin: number, distMax: number): V3[] {
  if (count === 0) return [];
  // tighter spread; respect old distance hint by mapping it to half-angle.
  const avg = (distMin + distMax) * 0.5;
  const half = patchHalfAngle(count, 0.045, 0.018 + avg * 0.0025, 0.22);
  const dirs = samplePatchDirs(normalize(center), half, count);
  return dirs.map((d) => scale(d, SHELL_R + (rand() - 0.5) * 2 * SHELL_NOISE));
}


export interface Graph {
  nodes: StarNode[];
  edges: StarEdge[];
  byId: Map<string, StarNode>;
  byCluster: Map<ClusterKey, StarNode[]>;
  neighbors: Map<string, string[]>;
}

let cached: Graph | null = null;
export function invalidateGraphCache() { cached = null; }

export function buildGraph(): Graph {
  if (cached) return cached;
  const overrides = loadOverrides();

  const nodes: StarNode[] = [];
  const edges: StarEdge[] = [];

  // ─── Cluster center auto-spread on fibonacci sphere ───
  const clusterDirs = fibDirections(CLUSTERS.length, 0.08);
  const clusterCenter: Record<string, V3> = {};
  const colorOf: Record<string, string> = {};

  // Root
  nodes.push({ id: "root", label: "DEBATE UNIVERSE", kind: "root", cluster: "root", color: "#ffffff", size: 1.4, pos: [0, 0, 0] });

  CLUSTERS.forEach((c, i) => {
    // All clusters on the same SHELL radius — single ball.
    const center = scale(clusterDirs[i], SHELL_R);
    clusterCenter[c.key] = center;
    colorOf[c.key] = c.color;
    nodes.push({ id: `cluster:${c.key}`, label: c.label, kind: "cluster", cluster: c.key, color: c.color, size: 0.7, pos: center });
    edges.push({ a: "root", b: `cluster:${c.key}`, strength: "strong", color: c.color });
  });


  // ─── STYLES (cluster → HALAL / HARAM sub-hubs → style nodes) ───
  {
    const center = clusterCenter.styles;
    const radial = normalize(center);
    const tmp: V3 = Math.abs(radial[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const perp = normalize([
      radial[1]*tmp[2] - radial[2]*tmp[1],
      radial[2]*tmp[0] - radial[0]*tmp[2],
      radial[0]*tmp[1] - radial[1]*tmp[0],
    ]);
    const offset = 16;
    const halalCenter = add(center, scale(perp, -offset));
    const haramCenter = add(center, scale(perp,  offset));

    nodes.push({ id: "subhub:styles:halal", label: "HALALDEBATE", kind: "subhub", cluster: "styles", color: "#00ffc8", size: 0.36, pos: halalCenter });
    nodes.push({ id: "subhub:styles:haram", label: "HARAMDEBATE", kind: "subhub", cluster: "styles", color: "#ff2d8a", size: 0.36, pos: haramCenter });
    edges.push({ a: "cluster:styles", b: "subhub:styles:halal", strength: "strong", color: "#00ffc8" });
    edges.push({ a: "cluster:styles", b: "subhub:styles:haram", strength: "strong", color: "#ff2d8a" });

    const halalStyles = STYLES.filter((s) => (s as any).side === "halal");
    const haramStyles = STYLES.filter((s) => (s as any).side === "haram");
    const hp = placeCloud(halalCenter, 9, halalStyles.length, 4);
    const rp = placeCloud(haramCenter, 9, haramStyles.length, 4);
    halalStyles.forEach((s, i) => {
      const id = `style:${s.id}`;
      nodes.push({ id, label: s.nama, kind: "style", cluster: "styles", color: s.color, size: 0.24, pos: hp[i], refId: s.id });
      edges.push({ a: "subhub:styles:halal", b: id, strength: "strong", color: s.color });
    });
    haramStyles.forEach((s, i) => {
      const id = `style:${s.id}`;
      nodes.push({ id, label: s.nama, kind: "style", cluster: "styles", color: s.color, size: 0.24, pos: rp[i], refId: s.id });
      edges.push({ a: "subhub:styles:haram", b: id, strength: "strong", color: s.color });
    });
  }

  // ─── ROLES (cluster → AP / BP sub-hubs → side-hubs → role nodes → sub-skill leaves) ───
  {
    const center = clusterCenter.roles;
    const radial = normalize(center);
    const tmp: V3 = Math.abs(radial[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const perp = normalize([
      radial[1]*tmp[2] - radial[2]*tmp[1],
      radial[2]*tmp[0] - radial[0]*tmp[2],
      radial[0]*tmp[1] - radial[1]*tmp[0],
    ]);

    // AP & BP sub-hubs (kiri & kanan dari cluster center)
    const apCenter = add(center, scale(perp, -22));
    const bpCenter = add(center, scale(perp,  22));

    nodes.push({ id: "subhub:roles:ap", label: "ASIAN PARLIAMENTARY", kind: "subhub", cluster: "roles", color: "#ff8b3d", size: 0.5, pos: apCenter, importance: 0.85 });
    nodes.push({ id: "subhub:roles:bp", label: "BRITISH PARLIAMENTARY", kind: "subhub", cluster: "roles", color: "#a78bfa", size: 0.5, pos: bpCenter, importance: 0.85 });
    edges.push({ a: "cluster:roles", b: "subhub:roles:ap", strength: "strong", color: "#ff8b3d" });
    edges.push({ a: "cluster:roles", b: "subhub:roles:bp", strength: "strong", color: "#a78bfa" });

    const SKILL_COLORS: Record<string, string> = {
      case: "#ff6b6b", timing: "#fde047", structure: "#38bdf8", speech: "#00ffc8",
    };
    const SKILL_LABELS: Record<string, string> = {
      case: "Case Building", timing: "Timing", structure: "Structure", speech: "Speech Timing",
    };

    function spawnRoleSkills(roleId: string, roleCenter: V3, parentCenter: V3) {
      const kinds = ["case", "timing", "structure", "speech"] as const;
      const positions = placeBranch(roleCenter, parentCenter, kinds.length, 3.0, 5.2);
      kinds.forEach((k, i) => {
        const id = `${roleId}:${k}`;
        nodes.push({
          id, label: SKILL_LABELS[k], kind: "roleskill", cluster: "roles",
          color: SKILL_COLORS[k], size: 0.085, pos: positions[i],
          refId: `${roleId}|${k}`, importance: 0.35,
        });
        edges.push({ a: roleId, b: id, strength: "weak", color: SKILL_COLORS[k] });
      });
    }

    // ─── ASIAN PARLIAMENTARY: GOV / OPP mini-hub → 4 role tiap sisi ───
    {
      const apRadial = normalize(sub(apCenter, center));
      const apTmp: V3 = Math.abs(apRadial[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const apPerp = normalize([
        apRadial[1]*apTmp[2] - apRadial[2]*apTmp[1],
        apRadial[2]*apTmp[0] - apRadial[0]*apTmp[2],
        apRadial[0]*apTmp[1] - apRadial[1]*apTmp[0],
      ]);
      const govCenter = add(apCenter, scale(apPerp, -10));
      const oppCenter = add(apCenter, scale(apPerp,  10));
      nodes.push({ id: "subhub:roles:ap:gov", label: "AP · GOV", kind: "subhub", cluster: "roles", color: "#ff6b6b", size: 0.34, pos: govCenter });
      nodes.push({ id: "subhub:roles:ap:opp", label: "AP · OPP", kind: "subhub", cluster: "roles", color: "#38bdf8", size: 0.34, pos: oppCenter });
      edges.push({ a: "subhub:roles:ap", b: "subhub:roles:ap:gov", strength: "strong", color: "#ff6b6b" });
      edges.push({ a: "subhub:roles:ap", b: "subhub:roles:ap:opp", strength: "strong", color: "#38bdf8" });

      const apGov = ROLES_AP.filter((r: any) => r.side === "gov");
      const apOpp = ROLES_AP.filter((r: any) => r.side === "opp");
      const govPos = placeCloud(govCenter, 8, apGov.length, 4.0);
      const oppPos = placeCloud(oppCenter, 8, apOpp.length, 4.0);

      apGov.forEach((r, i) => {
        const id = `role:ap:${r.id}`;
        nodes.push({ id, label: r.nama, kind: "role", cluster: "roles", color: r.color, size: 0.22, pos: govPos[i], refId: `ap:${r.id}`, importance: 0.6 });
        edges.push({ a: "subhub:roles:ap:gov", b: id, strength: "strong", color: r.color });
        spawnRoleSkills(id, govPos[i], govCenter);
      });
      apOpp.forEach((r, i) => {
        const id = `role:ap:${r.id}`;
        nodes.push({ id, label: r.nama, kind: "role", cluster: "roles", color: r.color, size: 0.22, pos: oppPos[i], refId: `ap:${r.id}`, importance: 0.6 });
        edges.push({ a: "subhub:roles:ap:opp", b: id, strength: "strong", color: r.color });
        spawnRoleSkills(id, oppPos[i], oppCenter);
      });

      // weak cross-pairs (legacy)
      for (const [a, b] of [["pm","lo"],["dpm","dlo"],["gw","ow"],["gr","or"]]) {
        edges.push({ a: `role:ap:${a}`, b: `role:ap:${b}`, strength: "weak", color: "#ffffff" });
      }
    }

    // ─── BRITISH PARLIAMENTARY: 4 team hubs (OG/OO/CG/CO) → 2 roles each ───
    {
      const bpDirs = fibDirections(ROLES_BP.length, 0.25);
      ROLES_BP.forEach((team, ti) => {
        const teamCenter = add(bpCenter, scale(bpDirs[ti], 11));
        const teamHubId = `subhub:roles:bp:${team.key}`;
        nodes.push({ id: teamHubId, label: team.label, kind: "subhub", cluster: "roles", color: team.color, size: 0.3, pos: teamCenter });
        edges.push({ a: "subhub:roles:bp", b: teamHubId, strength: "strong", color: team.color });

        const rolePos = placeBranch(teamCenter, bpCenter, team.roles.length, 4.5, 7.0);
        team.roles.forEach((r, ri) => {
          const id = `role:bp:${team.key}:${r.id}`;
          nodes.push({ id, label: r.nama, kind: "role", cluster: "roles", color: r.color, size: 0.18, pos: rolePos[ri], refId: `bp:${team.key}:${r.id}`, importance: 0.55 });
          edges.push({ a: teamHubId, b: id, strength: "strong", color: r.color });
          spawnRoleSkills(id, rolePos[ri], teamCenter);
        });
      });
    }
  }


  // ─── MATTER (cluster → domains → babs → subbabs) ───
  const matterDomainIds: Record<string, string> = {};
  const matterDomainPos: Record<string, V3> = {};
  {
    const center = clusterCenter.matter;
    const keys = Object.keys(MATTER);
    const positions = placeCloud(center, 22, keys.length, 10);
    // Palette berbeda per domain matter (sub-hub)
    const matterDomainColors: Record<string, string> = {
      ekonomi: "#34d399", politik: "#f472b6", hukum: "#fbbf24", filsafat: "#c084fc",
      sosial: "#22d3ee", sains: "#60a5fa", hi: "#fb7185", psikologi: "#a78bfa",
      pendidikan: "#facc15", feminisme: "#ff8ad6", antropologi: "#fdba74",
      filsafat_mosi: "#a855f7", kesehatan: "#5eead4", lingkungan: "#86efac",
      agama: "#fde047", custom: "#94a3b8", filosofis_cinta: "#ff8ad6",
    };
    keys.forEach((dk, i) => {
      const d = MATTER[dk];
      const dId = `matter:${dk}`;
      const dColor = matterDomainColors[dk] || paletteColor("matter", dk);
      // shade turunannya
      const babColor = dColor;
      const subColor = dColor;
      matterDomainIds[dk] = dId;
      matterDomainPos[dk] = positions[i];
      nodes.push({ id: dId, label: d.label.toUpperCase(), kind: "domain", cluster: "matter", color: dColor, size: 0.32, pos: positions[i], refId: dk, importance: 0.7 });
      edges.push({ a: "cluster:matter", b: dId, strength: "strong", color: dColor });

      const babRadius = Math.max(10, 6 + Math.log2(d.babs.length + 1) * 3.6);
      const babPos = placeCloud(positions[i], babRadius, d.babs.length, 5.0);
      d.babs.forEach((bab, j) => {
        const bId = `matter:${dk}:${bab.id}`;
        nodes.push({ id: bId, label: bab.title, kind: "bab", cluster: "matter", color: babColor, size: 0.14, pos: babPos[j], refId: `${dk}/${bab.id}`, importance: 0.5 });
        edges.push({ a: dId, b: bId, strength: "strong", color: dColor });

        if (bab.subbabs?.length) {
          const subPos = placeBranch(babPos[j], positions[i], bab.subbabs.length, 2.8, 5.6);
          bab.subbabs.forEach((sb, k) => {
            const sId = `matter:${dk}:${bab.id}:${sb.id}`;
            nodes.push({ id: sId, label: sb.title, kind: "subbab", cluster: "matter", color: subColor, size: 0.07, pos: subPos[k], refId: `${dk}/${bab.id}/${sb.id}`, importance: 0.3 });
            edges.push({ a: bId, b: sId, strength: "weak", color: subColor });
          });
        }
      });
    });
  }

  // ─── JENIS MOSI ───
  const jenisIdMap: Record<string, string> = {};
  const jenisPos: Record<string, V3> = {};

  // ─── MOTIONS (placed near matter domain) ───
  const motionCatToDomain: Record<string, string | undefined> = {
    ekonomi: "ekonomi", politik: "politik", sosial: "sosial", hukum: "hukum",
    filosofi: "filsafat", "hubungan-internasional": "hi", pendidikan: "pendidikan",
    lingkungan: "lingkungan", agama: "agama", teknologi: "sains",
    indonesia: "politik",
  };
  const typeToJenisId: Record<string, string | undefined> = {
    kebijakan: "jm1", pandangan: "jm2", aktor: "jm3",
    penyesalan: "jm4", prediksi: "jm5", dukungan: "jm6",
    memilih: "jm7", harapan: "jm2",
  };
  {
    const motionCenter = clusterCenter.motion;
    // 1) Sub-hub per Jenis Mosi sebagai cabang Motion Bank — lebih rapat
    const jenisPositions = placeCloud(motionCenter, 22, JENIS_MOSI.length, 9);
    const JENIS_NEON = ["#ff3d8b", "#ff8b3d", "#ffd53d", "#ff5fb3", "#ffb13d", "#ffe066", "#ff6b6b"];
    JENIS_MOSI.forEach((j, i) => {
      const id = `jenis:${j.id}`;
      jenisIdMap[j.id] = id;
      jenisPos[j.id] = jenisPositions[i];
      const c = JENIS_NEON[i % JENIS_NEON.length];
      nodes.push({ id, label: j.nama, kind: "subhub", cluster: "motion", color: c, size: 0.36, pos: jenisPositions[i], refId: j.id, importance: 0.7 });
      edges.push({ a: "cluster:motion", b: id, strength: "strong", color: c });
    });
    // 2) Group motions by jenis (m.type)
    const byJenis: Record<string, typeof MOTIONS> = {};
    MOTIONS.forEach((m) => {
      const jid = typeToJenisId[m.type] || "jm1";
      (byJenis[jid] ||= []).push(m);
    });
    // Palet warm-neon untuk bintang motion (tidak pernah hitam/gelap)
    const MOTION_NEON = ["#ff3d8b", "#ff8b3d", "#ffd53d", "#ff3df5", "#ffb13d", "#ff5fb3", "#ffe066"];
    let motionColorIdx = 0;
    for (const jid of Object.keys(byJenis)) {
      const arr = byJenis[jid];
      const subHubPos = jenisPos[jid] ?? motionCenter;
      const subColor = JENIS_MOSI.find((x) => x.id === jid)?.warna || "#ff8b3d";
      const branchRadius = Math.max(7, Math.min(20, 5 + Math.log2(arr.length + 1) * 2.8));
      const pos = placeBranch(subHubPos, motionCenter, arr.length, branchRadius * 0.45, branchRadius * 1.15);
      arr.forEach((m, i) => {
        const id = `motion:${m.id}`;
        // Bintang mosi SELALU warm-neon — deterministik per id
        const useColor = MOTION_NEON[(motionColorIdx++) % MOTION_NEON.length];
        nodes.push({ id, label: m.title, kind: "motion", cluster: "motion", color: useColor, size: 0.085, pos: pos[i], refId: m.id, importance: 0.35 });
        edges.push({ a: `jenis:${jid}`, b: id, strength: "weak", color: useColor });
        const domainKey = motionCatToDomain[m.cat];
        if (domainKey && matterDomainIds[domainKey]) {
          edges.push({ a: id, b: matterDomainIds[domainKey], strength: "weak", color: "#ff8b3d", kind: "link" });
        }
      });
    }
  }

  // ─── KAMUS — kluster tetap berdiri sendiri; tautan ke matter via hover-only ───
  const vocabCatToDomain: Record<string, string | undefined> = {
    // legacy cats
    ekonomi: "ekonomi", sosial: "sosial", hukum: "hukum",
    filosofi: "filsafat", "hubungan-internasional": "hi", "pendidikan-term": "pendidikan",
    // baru dari HTML kamus
    filsafat: "filsafat", psikologi: "psikologi", sosiol: "sosial",
    retorika: "filsafat", logika: "filsafat", debat: "filsafat",
  };
  const vocabIdByTerm: Record<string, string> = {};
  {
    const kamusCenter = clusterCenter.kamus;
    // Group by huruf awal A–Z (non-alpha → "#")
    const byLetter: Record<string, { v: typeof VOCAB[number]; idx: number }[]> = {};
    VOCAB.forEach((v, idx) => {
      const L = (v.term[0] || "#").toUpperCase();
      const key = /[A-Z]/.test(L) ? L : "#";
      (byLetter[key] ||= []).push({ v, idx });
    });
    const letters = Object.keys(byLetter).sort();
    const letterDirs = fibDirections(letters.length, 0.15);
    // Palette unik per huruf — beda warna per cabang kamus
    const kamusPalette = ["#38bdf8","#7dd3fc","#22d3ee","#06b6d4","#67e8f9","#a78bfa","#c084fc","#34d399","#5eead4","#fbbf24","#fb7185","#f472b6","#fdba74","#facc15","#86efac","#60a5fa","#ff8ad6","#ff5cf0","#a855f7","#8b5cf6","#fb923c","#94a3b8","#e8f4ff","#ffffff","#22c55e","#ef4444"];
    letters.forEach((L, li) => {
      const arr = byLetter[L];
      const letterCenter = add(kamusCenter, scale(letterDirs[li], 18));
      const letterId = `kamus:letter:${L}`;
      const letterColor = kamusPalette[li % kamusPalette.length];
      nodes.push({ id: letterId, label: L, kind: "letter", cluster: "kamus", color: letterColor, size: 0.22, pos: letterCenter, refId: L, importance: 0.55 });
      edges.push({ a: "cluster:kamus", b: letterId, strength: "strong", color: letterColor });
      const subRadius = Math.max(5, Math.min(14, 4 + Math.log2(arr.length + 1) * 2.2));
      const pos = placeBranch(letterCenter, kamusCenter, arr.length, subRadius * 0.45, subRadius * 1.15);
      arr.forEach(({ v, idx }, i) => {
        const id = `vocab:${idx}`;
        vocabIdByTerm[v.term.toLowerCase()] = id;
        // semua vocab di huruf ini pakai shade warna letter (jitter ringan)
        nodes.push({ id, label: v.term, kind: "vocab", cluster: "kamus", color: letterColor, size: 0.07, pos: pos[i], refId: String(idx), importance: 0.3 });
        edges.push({ a: letterId, b: id, strength: "weak", color: letterColor });
        const domainKey = (v as any).domain || vocabCatToDomain[v.cat];
        if (domainKey && matterDomainIds[domainKey]) {
          edges.push({ a: id, b: matterDomainIds[domainKey], strength: "weak", color: letterColor, kind: "link" });
        }
      });
    });
    // hover-only link motion.terms ↔ vocab
    MOTIONS.forEach((m) => {
      if (!m.terms) return;
      for (const t of m.terms) {
        const vid = vocabIdByTerm[t.toLowerCase()];
        if (vid) edges.push({ a: `motion:${m.id}`, b: vid, strength: "weak", color: "#38bdf8", kind: "link" });
      }
    });
    // hover-only link motion.title (lowercase) ↔ vocab term (>=5 huruf)
    MOTIONS.forEach((m) => {
      const title = m.title.toLowerCase();
      for (const term of Object.keys(vocabIdByTerm)) {
        if (term.length >= 5 && title.includes(term)) {
          edges.push({ a: `motion:${m.id}`, b: vocabIdByTerm[term], strength: "weak", color: "#7dd3fc", kind: "link" });
        }
      }
    });
  }

  // ─── COMPETITOR & ACTIVE MEMBER (sekolah → tim → speaker) ───
  const speakerIdMap: Record<string, string> = {};
  const teamIdMap: Record<string, string> = {};
  const roleSideMap: Record<string, [string, string]> = {
    p1: ["role:ap:pm", "role:ap:lo"],
    p2: ["role:ap:dpm", "role:ap:dlo"],
    p3: ["role:ap:gw", "role:ap:ow"],
  };
  function buildSchoolTree(cluster: ClusterKey, schools: typeof COMPETITORS, center: V3, baseRadius: number) {
    const schoolPositions = placeCloud(center, baseRadius, schools.length, baseRadius * 0.34);
    schools.forEach((s, si) => {
      const schoolPos = schoolPositions[si];
      const isChaos = s.tag === "halaldebate-chaos";
      // Coach roster = bukan speaker debat — jangan kasih peran AP/BP.
      const isCoach = /coach/i.test(s.id);
      const schoolColor = isChaos ? "#a855f7" : paletteColor(cluster, s.id);
      const schoolNodeId = `${cluster}:school:${s.id}`;
      const schoolImp = isChaos ? 0.85 : 0.6;
      nodes.push({ id: schoolNodeId, label: s.short, kind: "school", cluster, color: schoolColor, size: 0.28, pos: schoolPos, refId: s.id, tag: s.tag, importance: schoolImp });
      edges.push({ a: `cluster:${cluster}`, b: schoolNodeId, strength: "strong", color: schoolColor });
      if (isChaos) edges.push({ a: schoolNodeId, b: "style:chaos", strength: "weak", color: "#a855f7", kind: "link" });
      const teamCount = s.teams.length;
      const teamPositions = teamCount === 1 ? [schoolPos] : placeBranch(schoolPos, center, teamCount, 5.5, 9.5);
      s.teams.forEach((t, ti) => {
        const teamPos = teamPositions[ti];
        const teamNodeId = `${cluster}:team:${t.id}`;
        const teamColor = isChaos ? "#c084fc" : paletteColor(`${cluster}:${s.id}`, t.id);
        if (teamCount > 1) {
          teamIdMap[t.id] = teamNodeId;
          nodes.push({ id: teamNodeId, label: `${s.short} · ${t.label}`, kind: "team", cluster, color: teamColor, size: 0.16, pos: teamPos, refId: `${s.id}/${t.id}`, tag: s.tag, importance: 0.5 });
          edges.push({ a: schoolNodeId, b: teamNodeId, strength: "strong", color: teamColor });
        } else {
          teamIdMap[t.id] = schoolNodeId;
        }
        const parentId = teamCount > 1 ? teamNodeId : schoolNodeId;
        const parentPos = teamCount > 1 ? teamPos : schoolPos;
        const speakerPositions = placeBranch(parentPos, center, t.speakers.length, 3.8, 7.2);
        t.speakers.forEach((sp, spi) => {
          const spNodeId = `${cluster}:speaker:${sp.id}`;
          speakerIdMap[sp.id] = spNodeId;
          const spColor = isChaos ? "#a855f7" : paletteColor(`${cluster}:${s.id}:${t.id}`, sp.id);
          const teamTag = teamCount > 1 ? ` (${t.label})` : "";
          const spImp = sp.crown === "best-speaker" ? 0.85 : 0.4;
          const label = isCoach
            ? `${sp.nama}${teamTag}`
            : `${sp.nama} · ${sp.role.toUpperCase()}${(sp as any).replyOf ? "·REPLY" : ""}${teamTag}`;
          nodes.push({ id: spNodeId, label, kind: "speaker", cluster, color: spColor, size: 0.09, pos: speakerPositions[spi], refId: sp.id, tag: s.tag, crown: sp.crown, importance: spImp });
          edges.push({ a: parentId, b: spNodeId, strength: "weak", color: spColor });
          if (!isCoach) {
            const pair = roleSideMap[sp.role];
            if (pair) {
              edges.push({ a: spNodeId, b: pair[0], strength: "weak", color: "#ff6b6b", kind: "link" });
              edges.push({ a: spNodeId, b: pair[1], strength: "weak", color: "#38bdf8", kind: "link" });
            }
            if ((sp as any).replyOf) {
              edges.push({ a: spNodeId, b: "role:ap:gr", strength: "weak", color: "#fde047", kind: "link" });
              edges.push({ a: spNodeId, b: "role:ap:or", strength: "weak", color: "#fde047", kind: "link" });
            }
          }
          if (sp.crown === "best-speaker" && isChaos) {
            edges.push({ a: spNodeId, b: "style:chaos", strength: "weak", color: "#a855f7", kind: "link" });
          }
        });
      });
    });
  }
  // Competitor: cluster→sekolah lebih DEKAT (12) sesuai request user.
  buildSchoolTree("competitor", COMPETITORS, clusterCenter.competitor, 12);
  buildSchoolTree("active_member", ACTIVE_MEMBERS, clusterCenter.active_member, 22);

  // ─── WANGY (MAN IC Siak) — bintang merah headline, paling terang ───
  {
    const wangyNode = nodes.find(n => n.id === "competitor:speaker:manic-t1-p3");
    if (wangyNode) {
      wangyNode.color = "#ff2030";
      wangyNode.size = 0.16;
      wangyNode.importance = 1.0;
      wangyNode.pulse = true;
      wangyNode.label = `★ Wangy · P3 · MAN IC Siak`;
    }
  }

  // ─── EVENT ───
  {
    const eventCenter = clusterCenter.event;
    const evDirs = fibDirections(EVENTS.length, 0.1);
    // Pusat event dipisah lebih jauh + repulsion ringan agar bracket
    // antar-event tidak hampir bertabrakan, tapi tetap berdekatan.
    const evCenters: V3[] = EVENTS.map((_, ei) => add(eventCenter, scale(evDirs[ei], 22)));
    const evMinSep = 26;
    for (let iter = 0; iter < 4; iter++) {
      for (let i = 0; i < evCenters.length; i++) {
        for (let j = i + 1; j < evCenters.length; j++) {
          const dd = dist(evCenters[i], evCenters[j]);
          if (dd < evMinSep && dd > 1e-4) {
            const push = (evMinSep - dd) * 0.5;
            const dir = scale(normalize(sub(evCenters[j], evCenters[i])), push);
            evCenters[i] = sub(evCenters[i], dir);
            evCenters[j] = add(evCenters[j], dir);
          }
        }
      }
    }
    EVENTS.forEach((ev, ei) => {
      const evCenter = evCenters[ei];
      const evNodeId = `event:${ev.id}`;
      nodes.push({ id: evNodeId, label: ev.nama, kind: "subhub", cluster: "event", color: "#fde047", size: 0.42, pos: evCenter, refId: ev.id });
      edges.push({ a: "cluster:event", b: evNodeId, strength: "strong", color: "#fde047" });
      const bracketDirs = fibDirections(ev.brackets.length, 0.35);
      ev.brackets.forEach((br, bi) => {
        const brCenter = add(evCenter, scale(bracketDirs[bi], 13));
        const brId = `event:${ev.id}:${br.id}`;
        const brColor = br.id === "final" ? "#fbbf24" : br.id === "semi" ? "#a78bfa" : "#22d3ee";
        nodes.push({ id: brId, label: br.nama, kind: "bracket", cluster: "event", color: brColor, size: 0.24, pos: brCenter, refId: `${ev.id}/${br.id}` });
        edges.push({ a: evNodeId, b: brId, strength: "strong", color: brColor });
        br.teams.forEach((teamRawId) => {
          const realTeamId = teamIdMap[teamRawId];
          if (!realTeamId) return;
          edges.push({ a: brId, b: realTeamId, strength: "weak", color: brColor, kind: "link" });
          if (br.id === "final") {
            const realNode = nodes.find(n => n.id === realTeamId);
            if (realNode) {
              if (ev.prestasi.j1.team === teamRawId) realNode.crown = "j1";
              else if (ev.prestasi.j2.team === teamRawId) realNode.crown = "j2";
              else if (ev.prestasi.j3.team === teamRawId) realNode.crown = "j3";
            }
          }
        });
      });
      ev.prestasi.best_speakers.forEach((bs) => {
        const spNode = nodes.find(n => n.refId === bs.speaker && n.kind === "speaker");
        if (spNode) {
          spNode.crown = "best-speaker";
          const finalId = `event:${ev.id}:final`;
          if (nodes.find(n => n.id === finalId)) edges.push({ a: finalId, b: spNode.id, strength: "weak", color: "#fde047", kind: "link" });
        }
      });
    });
  }

  // ─── Simple 2-level clusters ───
  const simpleClusters: { key: ClusterKey; items: readonly { id: string; nama: string }[]; color: string; size: number; radius: number; kind: "section" | "style" }[] = [
    { key: "practice",  items: PRACTICE_MODES,    color: "#ff9f43", size: 0.16, radius: 11, kind: "section" },
    { key: "circuit",   items: CIRCUIT,           color: "#a78bfa", size: 0.15, radius: 11, kind: "section" },
    { key: "assistant", items: ASSISTANT_PROMPTS, color: "#00d4aa", size: 0.15, radius: 10, kind: "section" },
    { key: "editor",    items: EDITOR_NODES,      color: "#94a3b8", size: 0.13, radius: 9,  kind: "section" },
    { key: "meta",      items: META_NODES,        color: "#e8f4ff", size: 0.13, radius: 9,  kind: "section" },
  ];
  for (const sc of simpleClusters) {
    const center = clusterCenter[sc.key as string];
    const pos = placeCloud(center, Math.max(6, sc.radius * 0.7), sc.items.length, 2.6);
    sc.items.forEach((it, i) => {
      const id = `${sc.key}:${it.id}`;
      nodes.push({ id, label: it.nama, kind: sc.kind, cluster: sc.key, color: sc.color, size: sc.size, pos: pos[i], refId: it.id });
      edges.push({ a: `cluster:${sc.key}`, b: id, strength: sc.key === "editor" || sc.key === "meta" ? "weak" : "strong", color: sc.color });
    });
  }

  // ─── SHELL re-projection: hub di kulit; leaf boleh punya ketebalan radial ───
  // shellThickness diambil dari setting saat runtime via globalThis (default 7).
  // Hub (root/cluster/subhub/domain) tetap di SHELL_R; leaf disebar ±thickness.
  {
    const thick = Math.max(0, Math.min(14,
      (typeof globalThis !== "undefined" && (globalThis as any).__SHELL_THICK__) ?? 7
    ));
    const isHub = (k: string) =>
      k === "root" || k === "cluster" || k === "subhub" || k === "domain" || k === "school";
    for (const n of nodes) {
      if (n.id === "root") continue;
      const r = Math.hypot(n.pos[0], n.pos[1], n.pos[2]);
      if (r < 1e-3) continue;
      const seed = n.id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000;
      const u = (seed / 1000) - 0.5; // -0.5..0.5
      const leafJitter = isHub(n.kind) ? SHELL_NOISE : SHELL_NOISE + thick;
      const target = SHELL_R + u * 2 * leafJitter;
      const k = target / r;
      n.pos = [n.pos[0] * k, n.pos[1] * k, n.pos[2] * k];
    }
  }


  // ─── Cross-cluster collision push (tangensial, tetap di kulit) ───
  {
    const BUFFER = 4.2;
    const movable = nodes.filter((n) => n.kind !== "root" && n.kind !== "cluster" && n.kind !== "subhub");
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < movable.length; i++) {
        for (let j = i + 1; j < movable.length; j++) {
          const a = movable[i], b = movable[j];
          if (a.cluster === b.cluster) continue;
          const dx = a.pos[0]-b.pos[0], dy = a.pos[1]-b.pos[1], dz = a.pos[2]-b.pos[2];
          const d = Math.hypot(dx, dy, dz);
          if (d < BUFFER && d > 1e-3) {
            const push = (BUFFER - d) * 0.5;
            const nx = dx/d, ny = dy/d, nz = dz/d;
            a.pos = [a.pos[0]+nx*push, a.pos[1]+ny*push, a.pos[2]+nz*push];
            b.pos = [b.pos[0]-nx*push, b.pos[1]-ny*push, b.pos[2]-nz*push];
            // re-project to shell
            const ra = Math.hypot(a.pos[0], a.pos[1], a.pos[2]);
            const rb = Math.hypot(b.pos[0], b.pos[1], b.pos[2]);
            // re-project but preserve original radius (so cangkang tetap tebal).
            if (ra > 1e-3) { const k = (Math.hypot(a.pos[0], a.pos[1], a.pos[2]) === 0 ? SHELL_R : ra) / Math.hypot(a.pos[0], a.pos[1], a.pos[2]); a.pos = [a.pos[0]*k, a.pos[1]*k, a.pos[2]*k]; }
            if (rb > 1e-3) { const k = (Math.hypot(b.pos[0], b.pos[1], b.pos[2]) === 0 ? SHELL_R : rb) / Math.hypot(b.pos[0], b.pos[1], b.pos[2]); b.pos = [b.pos[0]*k, b.pos[1]*k, b.pos[2]*k]; }

          }
        }
      }
    }
  }


  // ─── Apply overrides (label/desc) ───
  for (const n of nodes) {
    const ov = overrides[n.id];
    if (ov?.label) n.label = ov.label;
  }
  // Filter out deleted nodes & their edges
  const deletedIds = new Set(
    Object.entries(overrides)
      .filter(([, v]) => v?.deleted)
      .map(([k]) => k)
  );
  const finalNodes = nodes.filter((n) => !deletedIds.has(n.id));
  const finalEdges = edges.filter((e) => !deletedIds.has(e.a) && !deletedIds.has(e.b));

  // Indexes
  const byId = new Map(finalNodes.map((n) => [n.id, n]));
  const byCluster = new Map<ClusterKey, StarNode[]>();
  for (const n of finalNodes) {
    const arr = byCluster.get(n.cluster) ?? [];
    arr.push(n);
    byCluster.set(n.cluster, arr);
  }
  const neighbors = new Map<string, string[]>();
  for (const e of finalEdges) {
    if (!neighbors.has(e.a)) neighbors.set(e.a, []);
    if (!neighbors.has(e.b)) neighbors.set(e.b, []);
    neighbors.get(e.a)!.push(e.b);
    neighbors.get(e.b)!.push(e.a);
  }

  cached = { nodes: finalNodes, edges: finalEdges, byId, byCluster, neighbors };
  return cached;
}

export const CLUSTER_META = CLUSTERS;
