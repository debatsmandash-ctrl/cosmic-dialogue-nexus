// Parser to merge new motions from upload into src/data/raw/motions.json
import fs from "node:fs";

const SRC = process.argv[2] || "/mnt/user-uploads/pasted-2026-06-22T03-05-16-113Z.txt";
const OUT = "src/data/raw/motions.json";

const raw = fs.readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);

const motions = [];
let cur = null;
let mode = null; // 'pro' | 'kon' | null

function flush() {
  if (!cur) return;
  // trim arrays
  if (cur.pro?.length === 0) delete cur.pro;
  if (cur.kon?.length === 0) delete cur.kon;
  if (cur.terms?.length === 0) delete cur.terms;
  motions.push(cur);
  cur = null; mode = null;
}

for (let raw of lines) {
  const line = raw.trimEnd();
  const mHead = line.match(/^\[(m\d+)\]\s+(.+)$/);
  if (mHead) {
    flush();
    cur = { id: mHead[1], title: titleCase(mHead[2]), pro: [], kon: [], terms: [] };
    mode = null;
    continue;
  }
  if (!cur) continue;
  let m;
  if ((m = line.match(/^orig:\s*(.+)$/i))) { cur.orig = m[1]; mode = null; continue; }
  if ((m = line.match(/^cat:\s*([^|]+?)\s*\|\s*type:\s*(\S+)/i))) {
    cur.cat = m[1].trim();
    cur.type = m[2].trim();
    mode = null; continue;
  }
  if ((m = line.match(/^ctx:\s*(.+)$/i))) { cur.ctx = m[1]; mode = null; continue; }
  if (/^PRO:\s*$/i.test(line)) { mode = "pro"; continue; }
  if (/^KON:\s*$/i.test(line)) { mode = "kon"; continue; }
  if ((m = line.match(/^TERMS:\s*(.+)$/i))) {
    cur.terms = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    mode = null; continue;
  }
  if ((m = line.match(/^IDEAL\s*\(PRO\):\s*(.+)$/i))) {
    cur._idealPro = m[1]; mode = "idealPro"; continue;
  }
  if ((m = line.match(/^IDEAL\s*\(OPP\):\s*(.+)$/i))) {
    cur._idealOpp = m[1]; mode = "idealOpp"; continue;
  }
  if ((m = line.match(/^RESEARCH:\s*(.+)$/i))) {
    cur.research = m[1]; mode = "research"; continue;
  }
  if (mode === "pro" || mode === "kon") {
    const b = line.match(/^-\s+(.+)$/);
    if (b) cur[mode].push(b[1]);
    else if (line.trim() === "") { /* keep mode */ }
    else mode = null;
    continue;
  }
  if (mode === "idealPro" && line.trim()) { cur._idealPro += " " + line.trim(); continue; }
  if (mode === "idealOpp" && line.trim()) { cur._idealOpp += " " + line.trim(); continue; }
  if (mode === "research" && line.trim()) { cur.research += " " + line.trim(); continue; }
}
flush();

// Compose ideal HTML
for (const m of motions) {
  const parts = [];
  if (m._idealPro) parts.push(`<strong>PRO (Ideal):</strong> ${m._idealPro}`);
  if (m._idealOpp) parts.push(`<strong>OPP (Ideal):</strong> ${m._idealOpp}`);
  if (parts.length) m.ideal = parts.join("<br><br>\n");
  delete m._idealPro; delete m._idealOpp;
}

// Map cat to existing taxonomy
const catMap = {
  ekonomi: "ekonomi", politik: "politik", hukum: "hukum",
  filsafat: "filosofi", sosial: "sosial",
};
for (const m of motions) {
  if (m.cat && catMap[m.cat]) m.cat = catMap[m.cat];
}

function titleCase(s) {
  return s.toLowerCase().split(" ").map((w) =>
    w.length <= 2 && /^(di|ke|dan|atau|ke|of|the|on|in|to|a|an|&)$/i.test(w)
      ? w : w[0]?.toUpperCase() + w.slice(1)
  ).join(" ");
}

// Merge with existing
const existing = JSON.parse(fs.readFileSync(OUT, "utf8"));
const existingIds = new Set(existing.map((x) => x.id));
const merged = [...existing];
let added = 0;
for (const m of motions) {
  if (existingIds.has(m.id)) continue;
  // ensure required fields
  if (!m.pro) m.pro = [];
  if (!m.kon) m.kon = [];
  merged.push(m);
  added++;
}
// Sort by id (m001, m002, ...)
merged.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

fs.writeFileSync(OUT, JSON.stringify(merged, null, 2) + "\n");
console.log(`Parsed ${motions.length} motions, added ${added} new, total ${merged.length}.`);
