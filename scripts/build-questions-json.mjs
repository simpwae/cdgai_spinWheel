/**
 * build-questions-json.mjs
 *
 * Reads all 12 department CSVs from public/questions/ and writes
 * src/data/questions.ts — a static TypeScript map:
 *   QUESTIONS_BY_DEPT[department][category] = Question[]
 *
 * Run once: node scripts/build-questions-json.mjs
 * Output is committed to the repo so no runtime DB access is needed.
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_DIR = join(ROOT, "public", "questions");
const OUT_FILE = join(ROOT, "src", "data", "questions.ts");

// Canonical department names — must match FACULTY_DEPARTMENTS in AppContext.tsx exactly
const DEPARTMENTS = [
  "Civil",
  "Mechanical",
  "Electrical",
  "Architecture",
  "Pharmacy",
  "Bioscience",
  "Allied Health Sciences",
  "Nursing",
  "Management of Science",
  "Basic Science & Humanities",
  "Computer Sciences",
  "Software Engineering",
];

// Which CSV file maps to which department
const FILE_TO_DEPT = {
  "Civil_Engineering_MCQs_200.csv": "Civil",
  "Mechanical_MCQs_200.csv": "Mechanical",
  "Electrical_Engineering_MCQs_200.csv": "Electrical",
  "Architecuture_Mcqs - Architecture.csv": "Architecture",
  "pharmacy_200_mcqs.csv": "Pharmacy",
  "BioScience-Re - Bioscience MCQs.csv": "Bioscience",
  "Allied Heath Sciences Question Bank (1).csv": "Allied Health Sciences",
  "nursing_200_mcqs.csv": "Nursing",
  "Management_Sciences_MCQs_200.csv": "Management of Science",
  "BSH_MCQs.csv": "Basic Science & Humanities",
  "Computer_Science_MCQs_200.csv": "Computer Sciences",
  "Software eng_200_mcqs.csv": "Software Engineering",
};

const CATEGORIES = ["Question Bank", "IQ Games", "Career Questions"];

// Normalise a category string to one of the three canonical values
function normalizeCategory(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes("iq")) return "IQ Games";
  if (s.includes("career")) return "Career Questions";
  if (s.includes("question") || s.includes("bank")) return "Question Bank";
  return null;
}

// Parse a CSV string into an array of objects (handles quoted commas)
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCSVLine(lines[0]).map((h) =>
    h
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Build the structure
// result[dept][category] = array of question objects
const result = {};
for (const dept of DEPARTMENTS) {
  result[dept] = {};
  for (const cat of CATEGORIES) {
    result[dept][cat] = [];
  }
}

let totalRows = 0;
let skippedRows = 0;

for (const [fileName, dept] of Object.entries(FILE_TO_DEPT)) {
  const filePath = join(CSV_DIR, fileName);
  let text;
  try {
    text = readFileSync(filePath, "utf-8");
  } catch {
    console.error(`❌  File not found: ${fileName}`);
    continue;
  }

  const rows = parseCSV(text);
  console.log(`📄  ${fileName} → ${dept} (${rows.length} rows)`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Map flexible header names to canonical keys
    const text_ =
      row.text || row.question || row["question text"] || row.q || "";
    const opt1 =
      row.option1 ||
      row["option_1"] ||
      row["option 1"] ||
      row.option0 ||
      row["option 0"] ||
      row["option_0"] ||
      "";
    const opt2 =
      row.option2 || row["option_2"] || row["option 2"] || row.option1 || "";
    const opt3 =
      row.option3 || row["option_3"] || row["option 3"] || row.option2 || "";
    const opt4 =
      row.option4 || row["option_4"] || row["option 4"] || row.option3 || "";
    const answerRaw =
      row.correct_answer_index ||
      row["correct answer index"] ||
      row.answer ||
      row.correct ||
      "";
    const categoryRaw =
      row.category || row["question category"] || row.segment || "";

    const category = normalizeCategory(categoryRaw);
    if (!category) {
      skippedRows++;
      continue;
    }

    const q1 = opt1.trim();
    const q2 = opt2.trim();
    const q3 = opt3.trim();
    const q4 = opt4.trim();
    const questionText = text_.trim();

    if (!questionText || !q1 || !q2 || !q3 || !q4) {
      skippedRows++;
      continue;
    }

    const answerIdx = parseInt(answerRaw, 10);
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      skippedRows++;
      continue;
    }

    result[dept][category].push({
      text: questionText,
      options: [q1, q2, q3, q4],
      correctAnswerIndex: answerIdx,
    });
    totalRows++;
  }
}

// Generate TypeScript file
const lines = [
  "// AUTO-GENERATED by scripts/build-questions-json.mjs — do not edit manually.",
  "// Re-run the script if CSVs change: node scripts/build-questions-json.mjs",
  "",
  "export interface StaticQuestion {",
  "  text: string;",
  "  options: [string, string, string, string];",
  "  correctAnswerIndex: number;",
  "}",
  "",
  "export type QuestionsByDept = Record<string, Record<string, StaticQuestion[]>>;",
  "",
  "export const QUESTIONS_BY_DEPT: QuestionsByDept = {",
];

for (const dept of DEPARTMENTS) {
  lines.push(`  ${JSON.stringify(dept)}: {`);
  for (const cat of CATEGORIES) {
    const qs = result[dept][cat];
    if (qs.length === 0) {
      lines.push(`    ${JSON.stringify(cat)}: [],`);
    } else {
      lines.push(`    ${JSON.stringify(cat)}: [`);
      for (const q of qs) {
        lines.push(`      {`);
        lines.push(`        text: ${JSON.stringify(q.text)},`);
        lines.push(
          `        options: [${q.options.map((o) => JSON.stringify(o)).join(", ")}],`,
        );
        lines.push(`        correctAnswerIndex: ${q.correctAnswerIndex},`);
        lines.push(`      },`);
      }
      lines.push(`    ],`);
    }
  }
  lines.push(`  },`);
}

lines.push("};");
lines.push("");

// Summary comment at top showing counts
const summaryLines = ["// Question counts by department:"];
for (const dept of DEPARTMENTS) {
  const counts = CATEGORIES.map((c) => `${c}: ${result[dept][c].length}`).join(
    ", ",
  );
  summaryLines.push(`//   ${dept}: ${counts}`);
}
summaryLines.push(`// Total: ${totalRows} questions, ${skippedRows} skipped`);
summaryLines.push("");

const finalOutput =
  lines[0] +
  "\n" +
  lines[1] +
  "\n" +
  summaryLines.join("\n") +
  "\n" +
  lines.slice(2).join("\n");

writeFileSync(OUT_FILE, finalOutput, "utf-8");

console.log(`\n✅  Written to src/data/questions.ts`);
console.log(`   Total questions: ${totalRows}`);
console.log(`   Skipped rows:    ${skippedRows}`);
for (const dept of DEPARTMENTS) {
  const total = CATEGORIES.reduce((sum, c) => sum + result[dept][c].length, 0);
  console.log(`   ${dept.padEnd(30)} ${total}`);
}
