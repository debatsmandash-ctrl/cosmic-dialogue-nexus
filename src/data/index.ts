import motionsRaw from "./raw/motions.json";
import jenisRaw from "./raw/jenis-mosi.json";
import vocabRaw from "./raw/vocab.json";
import matterRaw from "./raw/matter.json";
import competitorsRaw from "./raw/competitors.json";
import activeMemberRaw from "./raw/active-member.json";
import eventRaw from "./raw/event.json";
import rolesRaw from "./raw/roles.json";
import type { Motion, JenisMosi, Vocab, MatterData } from "./types";

export const MOTIONS = motionsRaw as unknown as Motion[];
export const JENIS_MOSI = jenisRaw as unknown as JenisMosi[];
export const VOCAB = vocabRaw as unknown as Vocab[];
const FILOSOFIS_CINTA: MatterData = {
  "filosofis_cinta": {
    icon: "💞",
    label: "Filosofis & Cinta",
    desc: "Framework debat filosofis (meta-makna, moralitas, free will) dan filosofi cinta (pilihan vs perasaan, fungsi sosial vs individual). Disusun untuk mosi value/principle, LDI 2025.",
    babs: [
      { id: "fc-setup", num: 1, title: "Set-Up & Diagnosa Mosi", meta: "Burden · Meta · 5 Pertanyaan",
        subbabs: [
          { id: "fc-setup-1", num: "1.1", title: "Diagnosa Mosi (5 Pertanyaan)", badge: "Wajib",
            penjelasan: ["Tanya 5 hal segera setelah mosi keluar: Aktor (Negara/Individu/Korporasi/Gerakan), Tindakan, Stakeholder, Konteks, Trade-off."],
            matter: [{ label: "Aktor", text: "Negara → debat legitimasi & kontrak sosial. Individu → otonomi & moralitas personal. Korporasi → tanggung jawab profit vs etika." }] },
          { id: "fc-setup-2", num: "1.2", title: "Trade-Off & Limiting Principle",
            penjelasan: ["Identifikasi trade-off inti: Keamanan vs Kebebasan, Keadilan vs Kesejahteraan, Hak Individu vs Kolektif.",
              "Setiap principle Gov butuh limiting principle agar tidak absurd (THW ban alcohol → kenapa tidak gula? jawab: akut + adiktif)."] },
          { id: "fc-setup-3", num: "1.3", title: "Karakterisasi",
            penjelasan: ["Karakterisasi pelaku/korban menentukan paradigma keadilan. Pelaku = 'agen rasional jahat' (retributif) atau 'produk sistem rusak' (restoratif)?"] },
        ]
      },
      { id: "fc-paradigm", num: 2, title: "Paradigm Mosi Filosofis", meta: "Logical coherence > utilitarian",
        subbabs: [
          { id: "fc-paradigm-1", num: "2.1", title: "Worldview Coherence", badge: "Inti",
            penjelasan: ["Pada mosi filosofis tugas Anda bukan membuktikan 'baik/buruk' (utilitarian) tapi worldview lawan logically coherent atau tidak.",
              "Targetkan 3 jenis kegagalan: Kontradiksi Internal, Absurditas Moral, Nihilisme."],
            matter: [{ label: "Contoh serang", text: "'Lawan bilang makna itu subyektif tapi menuntut keadilan obyektif. Tidak koheren.'" }] },
        ]
      },
      { id: "fc-meta-makna", num: 3, title: "Clash: Meta-Makna",
        subbabs: [
          { id: "fc-meta-makna-a", num: "3.1", title: "Sisi A — Makna Obyektif (Ditemukan)",
            penjelasan: ["Makna/moralitas ada 'di luar sana' sebagai fakta fundamental — diletakkan Tuhan, Rasio, atau Logos.",
              "Makna subyektif itu rapuh; bisa dihancurkan kapan saja. Makna sejati harus binding & independen dari perasaan."],
            contoh: { pro: "Bela agama, tradisi, atau duty. Tanpa makna obyektif tidak ada dasar untuk mengkritik apapun." } },
          { id: "fc-meta-makna-b", num: "3.2", title: "Sisi B — Makna Subyektif (Diciptakan / Eksistensialisme)",
            penjelasan: ["Eksistensi mendahului esensi (Sartre). Dunia netral; manusia tanggung jawab penuh menciptakan makna lewat pilihan.",
              "Makna obyektif = resep tirani: memaksa individu tunduk pada dogma."],
            contoh: { kon: "Rayakan 'meaninglessness' sebagai kebebasan radikal. Menulis cerita sendiri lebih bermartabat dari menerima naskah." } },
        ]
      },
      { id: "fc-meta-moral", num: 4, title: "Clash: Meta-Moralitas (Tuhan & Moralitas)",
        subbabs: [
          { id: "fc-meta-moral-a", num: "4.1", title: "Sisi A — Moralitas Transenden",
            penjelasan: ["Moralitas truly binding hanya bila berakar pada Tuhan / rasio murni (Kant). Tanpa standar obyektif, 'moralitas' = opini mayoritas atau kekuasaan."],
            contoh: { pro: "Jerman 1940: tanpa standar di atas opini mayoritas, kita tidak bisa bilang Nazi 'salah secara obyektif'." } },
          { id: "fc-meta-moral-b", num: "4.2", title: "Sisi B — Moralitas Sekuler / Kontraktual",
            penjelasan: ["Moralitas penemuan manusia (Hobbes, evolusi). Aturan dikembangkan agar bisa hidup bersama tanpa saling membunuh.",
              "Cukup rasional: 'saya tidak ingin hidup di dunia di mana Anda boleh membunuh saya' = pragmatisme rasional."],
            contoh: { kon: "Moralitas sekuler adaptif, bisa dinegosiasikan, fokus kesejahteraan manusia di sini & sekarang." } },
        ]
      },
      { id: "fc-freewill", num: 5, title: "Clash: Free Will vs Determinisme",
        subbabs: [
          { id: "fc-fw-a", num: "5.1", title: "Sisi A — Free Will Nyata",
            penjelasan: ["Manusia agen moral; bebas memilih → bertanggung jawab. Hukum, keadilan, cinta semua berdiri di atas asumsi free will.",
              "Jika lawan benar (determinisme), tidak ada yang 'bersalah' / 'berjasa'. Konsep keadilan hancur."] },
          { id: "fc-fw-b", num: "5.2", title: "Sisi B — Determinisme",
            penjelasan: ["Pilihan = hasil akhir tak terhindarkan dari gen, didikan, kimia otak. 'Free will' = fiksi arogan untuk victim-blaming.",
              "Konsekuensi: geser sistem dari retribusi → rehabilitasi & perubahan struktural."] },
        ]
      },
      { id: "fc-cinta-sifat", num: 6, title: "Meta Sifat Cinta",
        subbabs: [
          { id: "fc-cinta-pilihan", num: "6.1", title: "Cinta = Pilihan (a verb)",
            penjelasan: ["Perasaan/spark bukan cinta; itu data. Cinta = komitmen, tindakan, keputusan sadar dedikasi pada kesejahteraan orang lain.",
              "Jika cinta hanya perasaan → rapuh & amoral; framework ini bilang cinta sejati dimulai setelah perasaan hilang."],
            contoh: { pro: "Bela mosi seperti 'THW abolish no-fault divorce' — perasaan hilang bukan justifikasi sah melanggar komitmen." } },
          { id: "fc-cinta-perasaan", num: "6.2", title: "Cinta = Perasaan (a noun, emergent)",
            penjelasan: ["Cinta otentik adalah emosi yang muncul; memaksa orang bertahan tanpa perasaan = mengkhianati diri.",
              "Pernikahan tanpa cinta = pelanggaran martabat. Otonomi emosional > kontrak."] },
        ]
      },
      { id: "fc-cinta-fungsi", num: 7, title: "Meta Fungsi Cinta",
        subbabs: [
          { id: "fc-cf-indiv", num: "7.1", title: "Individual vs Struktural",
            penjelasan: ["A: Cinta untuk pemenuhan individu — soal pasangan terbaik bagi diri.",
              "B: Cinta punya fungsi sosial besar — menjaga nilai masyarakat, melestarikan keturunan, membangun komunitas."],
            contoh: { pro: "Cocok untuk mosi: self-love, paksaan adat, pernikahan dini." } },
          { id: "fc-cf-bebas", num: "7.2", title: "Membebaskan vs Menjebak",
            penjelasan: ["A (menjebak): 'Cinta sejati' historis dipakai biar perempuan korbankan karir & nurut suami atas nama cinta.",
              "B (membebaskan): Cinta = kekuatan perlawanan; lawan aturan rasis, lawan komodifikasi materi."] },
        ]
      },
      { id: "fc-dilema", num: 8, title: "Dilema Filosofis Cinta",
        subbabs: [
          { id: "fc-dilema-1", num: "8.1", title: "1 Dosis Obat — Anak vs 5 Asing",
            penjelasan: ["A (Adil): semua nyawa sama, 5 > 1. Pilih 5 asing.",
              "B (Partial): kewajiban moral khusus pada orang yang kita cintai. Pilih anak.",
              "Debat: apakah moralitas universal atau berlapis (special obligations)?"] },
        ]
      },
    ]
  }
};
export const MATTER: MatterData = { ...(matterRaw as unknown as MatterData), ...FILOSOFIS_CINTA };

export interface Speaker { id: string; nama: string; fullname?: string; role: "p1"|"p2"|"p3"; replyOf?: "p1"|"p2"|"p3"; crown?: "best-speaker" }
export interface Team { id: string; label: string; speakers: Speaker[] }
export interface School { id: string; nama: string; short: string; tag?: string; home?: boolean; teams: Team[] }
export const COMPETITORS = (competitorsRaw as any).schools as School[];
export const ACTIVE_MEMBERS = (activeMemberRaw as any).schools as School[];

export interface EventBracket { id: string; nama: string; teams: string[] }
export interface EventData {
  id: string; nama: string; desc: string;
  brackets: EventBracket[];
  prestasi: {
    j1: { team: string; label: string };
    j2: { team: string; label: string };
    j3: { team: string; label: string };
    best_speakers: { speaker: string; label: string }[];
  };
}
export const EVENTS = (eventRaw as any).events as EventData[];

/** Palette warna per kluster supaya tidak monoton. Sub-hub tetap pakai warna identitasnya. */
export const CLUSTER_PALETTES: Record<string, string[]> = {
  styles:        ["#00ffc8", "#a855f7", "#38bdf8", "#f0c040", "#ff2d8a", "#9333ea"],
  roles:         ["#ff6b6b", "#ff9f43", "#00ffc8", "#38bdf8", "#a855f7", "#f0c040"],
  matter:        ["#00ffc8", "#5bf0c8", "#9ff0d8", "#22d3ee", "#34d399", "#a7f3d0"],
  motion:        ["#a855f7", "#c084fc", "#d8b4fe", "#ff8ad6", "#ff5cf0", "#7b5ea7"],
  kamus:         ["#38bdf8", "#7dd3fc", "#bae6fd", "#22d3ee", "#06b6d4", "#67e8f9"],
  jenis:         ["#c084fc", "#a855f7", "#8b5cf6", "#ff8ad6", "#ec4899"],
  competitor:    ["#fb7185", "#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#fb923c"],
  active_member: ["#00ffc8", "#5bf0c8", "#f0c040"],
  event:         ["#fde047", "#facc15", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee"],
  practice:      ["#ff9f43", "#fbbf24", "#fb923c"],
  circuit:       ["#a78bfa", "#7b5ea7", "#8b5cf6"],
  assistant:     ["#00d4aa", "#00ffc8", "#34d399"],
  editor:        ["#94a3b8", "#cbd5e1"],
  meta:          ["#e8f4ff", "#94a3b8"],
};

/** Deterministic palette pick by id-hash. */
export function paletteColor(cluster: string, seedId: string): string {
  const pal = CLUSTER_PALETTES[cluster] || ["#a855f7"];
  let h = 0;
  for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) >>> 0;
  return pal[h % pal.length];
}

// Static curriculum / sections not in JSON
export const STYLES = [
  {
    id: "halal",
    nama: "HALAL",
    icon: "✓",
    color: "#00ffc8",
    tag: "Standar Asia / WSDC",
    side: "halal",
    desc: "Format default kompetisi. Bersih, terstruktur, fokus weighing. Default semua speaker.",
    detail: "Ikuti struktur kausalistik, gunakan POI normal, weighing eksplisit, signposting bersih. Aman untuk debat formal.",
  },
  {
    id: "chaos",
    nama: "CHAOS",
    icon: "⚡",
    color: "#a855f7",
    tag: "Disruptive / Aggressive",
    side: "halal",
    desc: "Pecah ritme lawan dengan framing tak terduga, kontradiksi internal, dan POI berlapis.",
    detail: "Cocok ketika lawan punya case yang rapi tapi rigid. Risiko: chaos di tim sendiri kalau eksekusi miskoordinasi.",
  },
  {
    id: "simeone",
    nama: "SIMEONE",
    icon: "🛡",
    color: "#38bdf8",
    tag: "Defensive / Reactive",
    side: "haram",
    desc: "Park the bus. Sedikit serangan, banyak defense, menang via dropped + weighing minimalis.",
    detail: "Tahan satu axioma utama, biarkan lawan over-extend. Tutup dengan crystallize defensive yang clean.",
  },
  {
    id: "konstan",
    nama: "KONSTAN",
    icon: "○",
    color: "#f0c040",
    tag: "Principle / Anchored",
    side: "halal",
    desc: "Satu prinsip moral berat dijatuhkan dari awal — semua argumen tertaut ke principle itu.",
    detail: "Bagus untuk mosi penyesalan, moral, dan filosofis. Risiko: principle yang lemah = case ambruk.",
  },
  {
    id: "haramdebate",
    nama: "HARAMDEBATE",
    icon: "☠",
    color: "#ff2d8a",
    tag: "Forbidden / High-Risk",
    side: "haram",
    desc: "Playbook agresif: force deadlock, exploit weighing, frame ulang clash agar lawan kehilangan ground.",
    detail: "Manfaatkan deadlock dan clash kosong: bangun weighing terlebih dahulu, baru jatuhkan argumen. Risiko tinggi — kalau juri tidak nangkep weighing, kasusnya dianggap kosong.",
  },
  {
    id: "tembok",
    nama: "TEMBOK KONSTANTINOPEL",
    icon: "🧱",
    color: "#9333ea",
    tag: "Wall / Unbreakable Defense",
    side: "haram",
    desc: "Bangun tembok argumen yang mustahil ditembus: stacked defensive layers, framing pre-empt, weighing dari awal speech.",
    detail: "Dipakai saat tim Opp lemah dan butuh bertahan total. Layer: definisi tight → exclusion clauses → defensive weighing → preempt counter-models. Risiko: kalau tembok jebol di satu titik, seluruh case runtuh.",
  },
] as const;

export const ROLES = [
  { id: "pm", nama: "Prime Minister", short: "PM", side: "gov", color: "#ff6b6b", role: "P1 GOV", time: "7:20",
    inti: "Definisi, framing, struktur case Gov. Pasang 3 argumen utama dengan kausalistik bersih." },
  { id: "lo", nama: "Leader of Opposition", short: "LO", side: "opp", color: "#38bdf8", role: "P1 OPP", time: "7:20",
    inti: "Rebut PM, pasang opp case, definisi clash. Tidak boleh hanya defensive — wajib opp world." },
  { id: "dpm", nama: "Deputy Prime Minister", short: "DPM", side: "gov", color: "#ff9f43", role: "P2 GOV", time: "7:20",
    inti: "Rebut LO total, extension Gov (dimensi baru), rebuild case PM." },
  { id: "dlo", nama: "Deputy Leader of Opposition", short: "DLO", side: "opp", color: "#a855f7", role: "P2 OPP", time: "7:20",
    inti: "Rebut DPM, flip extension, opp extension baru, setup OW." },
  { id: "gw", nama: "Government Whip", short: "GW", side: "gov", color: "#00ffc8", role: "P3 GOV", time: "7:20",
    inti: "Tidak ada argumen baru. Loop closing dropped → comparative weighing 3 dimensi → crystallize." },
  { id: "ow", nama: "Opposition Whip", short: "OW", side: "opp", color: "#f0c040", role: "P3 OPP", time: "7:20",
    inti: "Rebut GW crystallize, opp weighing 3 dimensi, crystallize opp memorable." },
  { id: "gr", nama: "Government Reply", short: "GR", side: "gov", color: "#ff6b6b", role: "Reply GOV", time: "4:20",
    inti: "\"Juri Gov\" — kisahkan kenapa Gov menang dari perspektif juri. Bukan recycle speech." },
  { id: "or", nama: "Opposition Reply", short: "OR", side: "opp", color: "#38bdf8", role: "Reply OPP", time: "4:20",
    inti: "Mirror GR. Predict & preempt narasi GR, beri juri reason untuk vote Opp." },
] as const;

export const PRACTICE_MODES = [
  { id: "drill", nama: "Drill Mode", desc: "Latih satu role berulang dengan mosi pilihan motion bank." },
  { id: "scrim", nama: "Scrimmage", desc: "Full 8-speaker simulation, timer aktif, judging form di akhir." },
  { id: "rebut", nama: "Rebuttal Lab", desc: "Drill rebut 60 detik vs kasus AI generated." },
  { id: "crystallize", nama: "Crystallize Lab", desc: "Drill GW/OW/Reply: 1 kalimat penutup yang memorable." },
];

export const CIRCUIT = [
  { id: "asian", nama: "Asian Parliamentary", desc: "3v3, 7 menit speaker, 4 menit reply (Asians/SEA)." },
  { id: "bp", nama: "British Parliamentary", desc: "4 tim x 2 speaker, 7 menit, opening/closing dynamics." },
  { id: "wsdc", nama: "WSDC", desc: "World Schools, 3v3, 8 menit, 4 menit reply, evidence light." },
  { id: "ldbi", nama: "LDBI", desc: "Lomba Debat Bahasa Indonesia, format Asian-ish dengan mosi Indonesia." },
  { id: "pkn", nama: "PKN Parlemen", desc: "Mosi pendidikan kewarganegaraan, struktur Asian disederhanakan." },
];

export const ASSISTANT_PROMPTS = [
  { id: "case-builder", nama: "Case Builder", desc: "AI bantu susun 3 argumen + kausalistik dari mosi." },
  { id: "rebut-coach", nama: "Rebut Coach", desc: "Beri argumen lawan → AI suggest 3 angle rebut." },
  { id: "weighing-coach", nama: "Weighing Coach", desc: "Bantu pilih dimensi weighing yang paling kuat." },
  { id: "crystallize-coach", nama: "Crystallize Coach", desc: "Polish 1-kalimat closing yang memorable." },
];

export const META_NODES = [
  { id: "changelog", nama: "Changelog", desc: "Versi 0.8 — Star Universe redesign." },
  { id: "credits", nama: "Credits", desc: "Toolkit oleh ROJAAKS untuk SMANDASH Debate Club." },
  { id: "tips", nama: "Pro Tips", desc: "Mini playbook untuk public speaking dan adjudikasi." },
];

export const EDITOR_NODES = [
  { id: "import-matter", nama: "Import Matter", desc: "Tambah teori / sub-bab baru ke domain matter." },
  { id: "add-motion", nama: "Add Motion", desc: "Tambah mosi custom ke motion bank." },
  { id: "edit-vocab", nama: "Edit Vocab", desc: "Tambah / edit istilah kamus." },
];

// ─── ROLES (Asian + British Parliamentary, dengan sub-skill) ───
export interface RoleSubSkill {
  kind: "case" | "timing" | "structure" | "speech";
  label: string;
  desc?: string;
  lines?: string[];
  blocks?: { t: string; what: string }[];
}
export interface RoleDef {
  id: string;
  nama: string;
  short: string;
  time: string;
  color: string;
  inti: string;
  sub: {
    case: string[];
    timing: { t: string; what: string }[];
    structure: string[];
  };
}
export interface BPTeam {
  key: "og" | "oo" | "cg" | "co";
  label: string;
  color: string;
  roles: RoleDef[];
}

const _rolesRaw = rolesRaw as unknown as {
  speechTimingDefault: { label: string; desc: string; blocks: { t: string; what: string }[] };
  asian: (RoleDef & { side: "gov" | "opp" })[];
  british: Record<"og" | "oo" | "cg" | "co", { label: string; color: string; roles: RoleDef[] }>;
};

export const SPEECH_TIMING_DEFAULT = _rolesRaw.speechTimingDefault;
export const ROLES_AP = _rolesRaw.asian;
export const ROLES_BP: BPTeam[] = (["og", "oo", "cg", "co"] as const).map((k) => ({
  key: k,
  label: _rolesRaw.british[k].label,
  color: _rolesRaw.british[k].color,
  roles: _rolesRaw.british[k].roles,
}));

/** Build a unified lookup: "ap:pm" / "bp:og:pmg" → RoleDef */
export const ROLE_LOOKUP: Record<string, RoleDef & { format: "ap" | "bp"; teamLabel?: string; side?: string }> = {};
for (const r of ROLES_AP) {
  ROLE_LOOKUP[`ap:${r.id}`] = { ...r, format: "ap", side: (r as any).side };
}
for (const team of ROLES_BP) {
  for (const r of team.roles) {
    ROLE_LOOKUP[`bp:${team.key}:${r.id}`] = { ...r, format: "bp", teamLabel: team.label, side: team.key };
  }
}
