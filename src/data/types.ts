export type DomainKey =
  | "ekonomi" | "politik" | "hukum" | "filsafat" | "sosial" | "sains"
  | "hi" | "psikologi" | "pendidikan" | "feminisme" | "antropologi"
  | "filsafat_mosi" | "kesehatan" | "lingkungan" | "agama" | "custom";

export interface MatterSubBab {
  id: string;
  num: string;
  title: string;
  badge?: string;
  penjelasan?: string[];
  matter?: { label: string; text: string }[];
  contoh?: { pro?: string; kon?: string };
}
export interface MatterBab {
  id: string;
  num: number;
  title: string;
  meta?: string;
  subbabs: MatterSubBab[];
}
export interface MatterDomain {
  icon: string;
  label: string;
  desc: string;
  babs: MatterBab[];
}
export type MatterData = Record<string, MatterDomain>;

export interface Motion {
  id: string;
  title: string;
  orig?: string;
  cat: string;
  type: string;
  ctx?: string;
  pro?: string[];
  kon?: string[];
  terms?: string[];
  ideal?: string;
  research?: string;
  comp?: string;
}

export interface JenisMosi {
  id: string;
  icon: string;
  nama: string;
  prefix: string;
  warna: string;
  definisi: string;
  penting: string;
  pro: string[];
  kon: string[];
  contoh?: { mosi: string; konteks: string }[];
}

export interface Vocab {
  term: string;
  cat: string;
  def: string;
  detail?: string;
  ex?: string;
  en?: string;
  domain?: string | null;
}

// Graph types
export type ClusterKey =
  | "root" | "styles" | "roles" | "matter" | "motion" | "jenis"
  | "kamus" | "practice" | "circuit" | "assistant" | "editor" | "meta"
  | "competitor" | "active_member" | "event";

export type NodeKind =
  | "root" | "cluster" | "subhub" | "domain" | "bab" | "subbab"
  | "role" | "roleskill" | "style" | "motion" | "jenis" | "vocab" | "section"
  | "school" | "team" | "speaker" | "bracket" | "letter";

export interface StarNode {
  id: string;
  label: string;
  kind: NodeKind;
  cluster: ClusterKey;
  /** color hex */
  color: string;
  /** visual size 0..1 */
  size: number;
  /** 3D position assigned by layout */
  pos: [number, number, number];
  /** optional payload reference */
  refId?: string;
  /** optional visual tags (mis. "halaldebate-chaos") */
  tag?: string;
  /** mahkota visual: best-speaker / juara-1 / juara-2 / juara-3 */
  crown?: "best-speaker" | "j1" | "j2" | "j3";
  /** 0..1 — semakin penting semakin terang & pulsing (default 0.4) */
  importance?: number;
  /** pulse effect (mis. headline competitor) */
  pulse?: boolean;
}

export interface StarEdge {
  a: string;
  b: string;
  strength: "strong" | "weak";
  /** edge color hex (defaults derived) */
  color?: string;
  /** tree = main constellation, link = hover-only contextual link */
  kind?: "tree" | "link";
}