#!/usr/bin/env node
// Parse BATCH-01/02/03 .txt files and APPEND new motion entries to
// src/data/raw/motions.json (skipping ids that already exist).
import fs from "node:fs";
import path from "node:path";

const SOURCES = [
  "/mnt/user-uploads/BATCH-01-Ekonomi-Politik-Hukum-Filsafat.txt",
  "/mnt/user-uploads/BATCH-02-Sosial-Sains-HubunganInternasional.txt",
  "/mnt/user-uploads/BATCH-03-Psikologi-Pendidikan-Feminisme-Antropologi-FilsafatMosi-Kesehatan-Lingkungan-Agama.txt",
];

const TARGET = "src/data/raw/motions.json";
const existing = JSON.parse(fs.readFileSync(TARGET, "utf8"));
const existingIds = new Set(existing.map((m) => m.id));

function parseBatch(text) {
  const lines = text.split(/\r?\n/);
  const motions = [];
  let cur = null;
  let mode = null; // "pro" | "kon" | "ctx" | "ideal_pro" | "ideal_opp" | "research" | null
  const flush = () => {
    if (cur && cur.id && cur.title) {
      motions.push(cur);
    }
    cur = null; mode = null;
  };
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const mHead = line.match(/^\[(m\d+)\]\s*(.+)$/);
    if (mHead) {
      flush();
      cur = {
        id: mHead[1],
        title: mHead[2].trim(),
        orig: "",
        cat: "",
        type: "",
        ctx: "",
        pro: [],
        kon: [],
        terms: [],
        ideal: "",
        research: "",
      };
      mode = null;
      continue;
    }
    if (!cur) continue;
    const lower = line.trim();
    if (lower.startsWith("orig:")) { cur.orig = lower.slice(5).trim(); mode = null; continue; }
    const catType = lower.match(/^cat:\s*([\w-]+)\s*\|\s*type:\s*([\w-]+)/i);
    if (catType) { cur.cat = catType[1]; cur.type = catType[2]; mode = null; continue; }
    if (lower.startsWith("ctx:")) { cur.ctx = lower.slice(4).trim(); mode = "ctx"; continue; }
    if (/^PRO:?$/i.test(lower)) { mode = "pro"; continue; }
    if (/^KON:?$/i.test(lower)) { mode = "kon"; continue; }
    if (lower.startsWith("TERMS:")) {
      cur.terms = lower.slice(6).split(",").map((s) => s.trim()).filter(Boolean);
      mode = null; continue;
    }
    if (/^IDEAL\s*\(PRO\):/i.test(lower)) {
      cur.ideal = (cur.ideal ? cur.ideal + "<br/><br/>" : "") + "<b>PRO:</b> " + lower.replace(/^IDEAL\s*\(PRO\):\s*/i, "").trim();
      mode = "ideal_pro"; continue;
    }
    if (/^IDEAL\s*\(OPP\):/i.test(lower)) {
      cur.ideal = (cur.ideal ? cur.ideal + "<br/><br/>" : "") + "<b>OPP:</b> " + lower.replace(/^IDEAL\s*\(OPP\):\s*/i, "").trim();
      mode = "ideal_opp"; continue;
    }
    if (lower.startsWith("RESEARCH:")) {
      cur.research = lower.slice(9).trim();
      mode = "research"; continue;
    }
    // continuation lines / list items
    if (mode === "pro" && line.startsWith("-")) { cur.pro.push(line.replace(/^-\s*/, "").trim()); continue; }
    if (mode === "kon" && line.startsWith("-")) { cur.kon.push(line.replace(/^-\s*/, "").trim()); continue; }
    if (mode === "ctx" && lower) { cur.ctx += " " + lower; continue; }
    if (mode === "ideal_pro" && lower) { cur.ideal += " " + lower; continue; }
    if (mode === "ideal_opp" && lower) { cur.ideal += " " + lower; continue; }
    if (mode === "research" && lower) { cur.research += " " + lower; continue; }
  }
  flush();
  return motions;
}

let added = 0, skipped = 0;
const all = [...existing];
for (const src of SOURCES) {
  if (!fs.existsSync(src)) { console.warn("missing:", src); continue; }
  const txt = fs.readFileSync(src, "utf8");
  const parsed = parseBatch(txt);
  for (const m of parsed) {
    if (existingIds.has(m.id)) { skipped++; continue; }
    // clean empty fields
    if (!m.orig) delete m.orig;
    if (!m.ctx) delete m.ctx;
    if (!m.ideal) delete m.ideal;
    if (!m.research) delete m.research;
    if (!m.terms?.length) delete m.terms;
    if (!m.pro?.length) delete m.pro;
    if (!m.kon?.length) delete m.kon;
    if (!m.type) m.type = "pandangan";
    if (!m.cat) m.cat = "sosial";
    all.push(m);
    existingIds.add(m.id);
    added++;
  }
}

// Sort by id (m001, m002...)
all.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
fs.writeFileSync(TARGET, JSON.stringify(all, null, 2) + "\n");
console.log(`imported ${added} motions (${skipped} duplicates skipped). Total: ${all.length}`);
