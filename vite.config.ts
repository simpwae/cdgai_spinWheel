import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Questions Generator Plugin
// Runs on every `npm run dev` / `npm run build`.
// Reads 12 CSV files from public/questions/ → writes src/data/questions.ts
// 100 questions max per department. No database. No manual import needed.
// ─────────────────────────────────────────────────────────────────────────────

const DEPT_MAP: [string, string][] = [
  ["Civil_Engineering_MCQs_200.csv", "Civil"],
  ["Mechanical_MCQs_200.csv", "Mechanical"],
  ["Electrical_Engineering_MCQs_200.csv", "Electrical"],
  ["Architecuture_Mcqs - Architecture.csv", "Architecture"],
  ["pharmacy_200_mcqs.csv", "Pharmacy"],
  ["BioScience-Re - Bioscience MCQs.csv", "Bioscience"],
  ["Allied Heath Sciences Question Bank (1).csv", "Allied Health Sciences"],
  ["nursing_200_mcqs.csv", "Nursing"],
  ["Management_Sciences_MCQs_200.csv", "Management of Science"],
  ["BSH_MCQs.csv", "Basic Science & Humanities"],
  ["Computer_Science_MCQs_200.csv", "Computer Sciences"],
  ["Software eng_200_mcqs.csv", "Software Engineering"],
];

const CATEGORIES = ["Question Bank", "IQ Games", "Career Questions"];
const DEPTS = DEPT_MAP.map(([, d]) => d);
const PER_CATEGORY = 10; // 10 questions per category per dept (30 total per dept)

function splitLine(line: string): string[] {
  const result: string[] = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      result.push(cur);
      cur = "";
    } else cur += ch;
  }
  result.push(cur);
  return result;
}

function toCat(raw: string): string | null {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("iq")) return "IQ Games";
  if (s.includes("career")) return "Career Questions";
  if (s.includes("question") || s.includes("bank")) return "Question Bank";
  return null;
}

function colOf(hdrs: string[], ...names: string[]): number {
  for (const n of names) {
    const i = hdrs.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
}

function generateQuestions(root: string): void {
  const csvDir = join(root, "public", "questions");
  const outDir = join(root, "src", "data");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  type Q = {
    text: string;
    opts: [string, string, string, string];
    ans: number;
  };
  const data: Record<string, Record<string, Q[]>> = {};
  for (const dept of DEPTS)
    data[dept] = {
      "Question Bank": [],
      "IQ Games": [],
      "Career Questions": [],
    };

  for (const [file, dept] of DEPT_MAP) {
    let raw: string;
    try {
      raw = readFileSync(join(csvDir, file), "utf-8");
    } catch {
      console.warn(`[questions-plugin] WARNING: Missing ${file}`);
      continue;
    }

    const lines = raw.replace(/\r\n?/g, "\n").split("\n");
    const hdrs = splitLine(lines[0]).map((h) =>
      h
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    );

    const zeroBased = hdrs.some((h) => /^option[_\s]*0$/.test(h));
    const ti = colOf(hdrs, "text", "question", "q", "stem");
    const o1i = zeroBased
      ? colOf(hdrs, "option0", "option_0", "option 0")
      : colOf(hdrs, "option1", "option_1", "option 1");
    const o2i = zeroBased
      ? colOf(hdrs, "option1", "option_1", "option 1")
      : colOf(hdrs, "option2", "option_2", "option 2");
    const o3i = zeroBased
      ? colOf(hdrs, "option2", "option_2", "option 2")
      : colOf(hdrs, "option3", "option_3", "option 3");
    const o4i = zeroBased
      ? colOf(hdrs, "option3", "option_3", "option 3")
      : colOf(hdrs, "option4", "option_4", "option 4");
    const ci = colOf(hdrs, "category", "question category", "segment", "type");
    const ai = colOf(
      hdrs,
      "correct_answer_index",
      "correct answer index",
      "answer",
      "correct",
      "key",
    );

    let count = 0;
    const maxPerDept = PER_CATEGORY * CATEGORIES.length;
    for (let i = 1; i < lines.length && count < maxPerDept; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      const c = splitLine(ln);
      const text = c[ti]?.trim() ?? "";
      const o1 = c[o1i]?.trim() ?? "";
      const o2 = c[o2i]?.trim() ?? "";
      const o3 = c[o3i]?.trim() ?? "";
      const o4 = c[o4i]?.trim() ?? "";
      const ans = parseInt(c[ai] ?? "", 10);
      if (!text || !o1 || !o2 || !o3 || !o4 || isNaN(ans) || ans < 0 || ans > 3)
        continue;
      // Force-assign by position: 0-9 → Question Bank, 10-19 → IQ Games, 20-29 → Career Questions
      const catIndex = Math.floor(count / PER_CATEGORY);
      const cat = CATEGORIES[catIndex];
      data[dept][cat].push({ text, opts: [o1, o2, o3, o4], ans });
      count++;
    }
    console.log(
      `[questions-plugin]  ${dept.padEnd(30)} ${count} (${CATEGORIES.map((c) => `${c}: ${data[dept][c].length}`).join(", ")})`,
    );
  }

  const out: string[] = [
    "// AUTO-GENERATED by vite.config.ts — do not edit manually.",
    "// Rebuilt on every `npm run dev` / `npm run build`.",
    "",
    "export interface StaticQuestion {",
    "  text: string;",
    "  options: [string, string, string, string];",
    "  correctAnswerIndex: number;",
    "}",
    "",
    "export const QUESTIONS_BY_DEPT: Record<string, Record<string, StaticQuestion[]>> = {",
  ];

  for (const dept of DEPTS) {
    out.push(`  ${JSON.stringify(dept)}: {`);
    for (const cat of CATEGORIES) {
      const qs = data[dept][cat];
      if (qs.length === 0) {
        out.push(`    ${JSON.stringify(cat)}: [],`);
      } else {
        out.push(`    ${JSON.stringify(cat)}: [`);
        qs.forEach((q, i) => {
          const trail = i < qs.length - 1 ? "," : "";
          out.push(
            `      { text: ${JSON.stringify(q.text)}, options: [${q.opts.map((o) => JSON.stringify(o)).join(", ")}], correctAnswerIndex: ${q.ans} }${trail}`,
          );
        });
        out.push("    ],");
      }
    }
    out.push("  },");
  }
  out.push("};");
  out.push("");

  writeFileSync(join(outDir, "questions.ts"), out.join("\n"), "utf-8");
  console.log("[questions-plugin] src/data/questions.ts ready");
}

function questionsPlugin(): Plugin {
  return {
    name: "questions-generator",
    buildStart() {
      generateQuestions(process.cwd());
    },
  };
}

export default defineConfig({
  plugins: [questionsPlugin(), react()],
});
