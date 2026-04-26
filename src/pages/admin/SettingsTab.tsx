import React, { useState, useRef, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  Upload,
  AlertCircle,
  Save,
  Trash2,
  Plus,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  deleteAllQuestions,
  deleteQuestionsByDepartment,
  deleteNullDepartmentQuestions,
  insertQuestions,
} from "../../services/questions";

interface ParsedQuestion {
  category: string;
  department: string | null;
  text: string;
  options: string[];
  correct_answer_index: number;
}

interface QuestionImportSource {
  file: File;
  departmentHint?: string | null;
  sourceLabel?: string;
}

const BUNDLED_QUESTION_FILES = [
  {
    fileName: "Allied Heath Sciences Question Bank (1).csv",
    department: "Allied Health Sciences",
  },
  {
    fileName: "Architecuture_Mcqs - Architecture.csv",
    department: "Architecture",
  },
  { fileName: "BioScience-Re - Bioscience MCQs.csv", department: "Bioscience" },
  { fileName: "BSH_MCQs.csv", department: "Basic Science & Humanities" },
  { fileName: "Civil_Engineering_MCQs_200.csv", department: "Civil" },
  {
    fileName: "Computer_Science_MCQs_200.csv",
    department: "Computer Sciences",
  },
  { fileName: "Electrical_Engineering_MCQs_200.csv", department: "Electrical" },
  {
    fileName: "Management_Sciences_MCQs_200.csv",
    department: "Management of Science",
  },
  { fileName: "Mechanical_MCQs_200.csv", department: "Mechanical" },
  { fileName: "nursing_200_mcqs.csv", department: "Nursing" },
  { fileName: "pharmacy_200_mcqs.csv", department: "Pharmacy" },
  { fileName: "Software eng_200_mcqs.csv", department: "Software Engineering" },
] as const;

const KNOWN_DEPARTMENTS = [
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
] as const;

const CANONICAL_CATEGORIES = [
  "Question Bank",
  "IQ Games",
  "Career Questions",
] as const;

const DEPT_ALIASES: Record<string, string> = {
  bsh: "Basic Science & Humanities",
  "basic science and humanities": "Basic Science & Humanities",
  "basic sciences and humanities": "Basic Science & Humanities",
  "basic sciences humanities": "Basic Science & Humanities",
  "allied health": "Allied Health Sciences",
  "allied health science": "Allied Health Sciences",
  "allied health sciences": "Allied Health Sciences",
  "allied heath science": "Allied Health Sciences",
  "allied heath sciences": "Allied Health Sciences",
  biosciences: "Bioscience",
  "bio science": "Bioscience",
  "bio sciences": "Bioscience",
  "life sciences": "Bioscience",
  cs: "Computer Sciences",
  "computer science": "Computer Sciences",
  compsci: "Computer Sciences",
  se: "Software Engineering",
  "soft eng": "Software Engineering",
  "software eng": "Software Engineering",
  mgt: "Management of Science",
  "management science": "Management of Science",
  "management sciences": "Management of Science",
  "management of sciences": "Management of Science",
  "mgmt of science": "Management of Science",
  "mgmt science": "Management of Science",
  arch: "Architecture",
  architecuture: "Architecture",
  ce: "Civil",
  "civil engineering": "Civil",
  mech: "Mechanical",
  "mechanical engineering": "Mechanical",
  ee: "Electrical",
  "electrical engineering": "Electrical",
};

const CATEGORY_ALIASES: Record<string, string> = {
  "question bank": "Question Bank",
  questionbank: "Question Bank",
  "questions bank": "Question Bank",
  "iq games": "IQ Games",
  "iq game": "IQ Games",
  "career question": "Career Questions",
  "career questions": "Career Questions",
};

const HEADER_ALIASES: Record<string, string[]> = {
  category: [
    "category",
    "question category",
    "segment",
    "type",
    "question type",
  ],
  department: ["department", "dept", "branch", "major", "school"],
  text: ["text", "question", "question text", "question_text", "q", "stem"],
  option1: [
    "option1",
    "option_1",
    "option 1",
    "a",
    "choice1",
    "choice_1",
    "choice 1",
    "choice a",
    "answer a",
  ],
  option2: [
    "option2",
    "option_2",
    "option 2",
    "b",
    "choice2",
    "choice_2",
    "choice 2",
    "choice b",
    "answer b",
  ],
  option3: [
    "option3",
    "option_3",
    "option 3",
    "c",
    "choice3",
    "choice_3",
    "choice 3",
    "choice c",
    "answer c",
  ],
  option4: [
    "option4",
    "option_4",
    "option 4",
    "d",
    "choice4",
    "choice_4",
    "choice 4",
    "choice d",
    "answer d",
  ],
  correct_answer_index: [
    "correct answer index",
    "correct_answer_index",
    "correct answer",
    "answer",
    "answer index",
    "answer_index",
    "correct",
    "correct index",
    "key",
    "right answer",
    "correct option",
  ],
};

const buildLookupMap = (source: Record<string, string>) => {
  const map = new Map<string, string>();
  Object.entries(source).forEach(([alias, canonical]) => {
    const normalized = alias
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (normalized) {
      map.set(normalized, canonical);
      map.set(normalized.replace(/\s+/g, ""), canonical);
    }
  });
  return map;
};

const HEADER_LOOKUP = (() => {
  const map: Record<string, string> = {};
  Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
      const normalized = alias
        .toLowerCase()
        .replace(/^\uFEFF/, "")
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
      map[normalized] = canonical;
    });
  });
  return map;
})();

const DEPARTMENT_LOOKUP = buildLookupMap({
  ...Object.fromEntries(
    KNOWN_DEPARTMENTS.map((department) => [department, department]),
  ),
  ...DEPT_ALIASES,
});

const CATEGORY_LOOKUP = buildLookupMap({
  ...Object.fromEntries(
    CANONICAL_CATEGORIES.map((category) => [category, category]),
  ),
  ...CATEGORY_ALIASES,
});

const normalizeLookupValue = (value: string) =>
  value
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const collapseLookupValue = (value: string) =>
  normalizeLookupValue(value).replace(/\s+/g, "");

const normalizeDepartment = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = normalizeLookupValue(trimmed);
  const collapsed = collapseLookupValue(trimmed);
  const directMatch =
    DEPARTMENT_LOOKUP.get(normalized) || DEPARTMENT_LOOKUP.get(collapsed);
  if (directMatch) return directMatch;

  for (const department of KNOWN_DEPARTMENTS) {
    const normalizedDepartment = normalizeLookupValue(department);
    const collapsedDepartment = collapseLookupValue(department);
    if (
      normalized.includes(normalizedDepartment) ||
      collapsed.includes(collapsedDepartment)
    ) {
      return department;
    }
  }

  for (const [alias, canonical] of Object.entries(DEPT_ALIASES)) {
    const normalizedAlias = normalizeLookupValue(alias);
    const collapsedAlias = collapseLookupValue(alias);
    if (
      normalizedAlias.length > 3 &&
      (normalized.includes(normalizedAlias) ||
        collapsed.includes(collapsedAlias))
    ) {
      return canonical;
    }
  }

  return null;
};

const normalizeCategory = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = normalizeLookupValue(trimmed);
  const collapsed = collapseLookupValue(trimmed);
  return (
    CATEGORY_LOOKUP.get(normalized) || CATEGORY_LOOKUP.get(collapsed) || null
  );
};

const inferCategoryFromQuestionText = (
  text: string,
  rowIndex: number,
  totalRows: number,
): string => {
  const lowerText = text.toLowerCase();

  if (
    /\bcareer\b/.test(lowerText) ||
    /\b(role|profession|skills?|portfolio|resume|scrum|project manager|software engineer)\b/.test(
      lowerText,
    )
  ) {
    return "Career Questions";
  }

  if (
    /\b(find the next|sequence|analogy|odd one out|how many|what comes next|logical|pattern|rooms\?)\b/.test(
      lowerText,
    )
  ) {
    return "IQ Games";
  }

  if (totalRows >= 180) {
    if (rowIndex < 80) return "Question Bank";
    if (rowIndex < 140) return "IQ Games";
    return "Career Questions";
  }

  return "Question Bank";
};

const normalizeHeaderKey = (rawKey: string) =>
  rawKey
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isZeroBasedOptionHeader = (key: string) =>
  /^(option|choice)\s*0$/.test(key);

const normalizeRow = (
  row: Record<string, unknown>,
  zeroBasedOptions: boolean,
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(row)) {
    const cleanedKey = normalizeHeaderKey(rawKey);

    if (zeroBasedOptions) {
      if (/^(option|choice)\s*0$/.test(cleanedKey)) {
        output.option1 = value;
        continue;
      }
      if (/^(option|choice)\s*1$/.test(cleanedKey)) {
        output.option2 = value;
        continue;
      }
      if (/^(option|choice)\s*2$/.test(cleanedKey)) {
        output.option3 = value;
        continue;
      }
      if (/^(option|choice)\s*3$/.test(cleanedKey)) {
        output.option4 = value;
        continue;
      }
    }

    const canonicalKey =
      HEADER_LOOKUP[cleanedKey] ?? cleanedKey.replace(/\s+/g, "_");
    output[canonicalKey] = value;
  }

  return output;
};

const deptFromFilename = (filename: string): string | null => {
  const base = filename
    .replace(/\.(csv|xlsx|xls)$/i, "")
    .replace(/\(\d+\)$/i, "")
    .replace(/\b(mcqs?|questions?|question bank|q bank|final|re)\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalizeDepartment(base);
};

const toCellText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const parseSingleFile = async (
  file: File,
  departmentHint?: string | null,
): Promise<{ parsed: ParsedQuestion[]; errors: string[] }> => {
  const workbook = /\.csv$/i.test(file.name)
    ? XLSX.read(await file.text(), {
        type: "string",
        raw: true,
        cellFormula: false,
      })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`${file.name}: No sheets found in the file.`);

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  if (rawRows.length === 0)
    throw new Error(`${file.name}: The file contains no data rows.`);

  const firstRawHeaderKeys = Object.keys(rawRows[0]).map(normalizeHeaderKey);
  const zeroBasedOptions = firstRawHeaderKeys.some(isZeroBasedOptionHeader);
  const hasCategoryColumn = firstRawHeaderKeys.includes("category");
  const rows = rawRows.map((row) => normalizeRow(row, zeroBasedOptions));
  const firstRow = rows[0];

  const requiredCols = [
    "text",
    "option1",
    "option2",
    "option3",
    "option4",
    "correct_answer_index",
  ];
  const missingCols = requiredCols.filter((column) => !(column in firstRow));
  if (missingCols.length > 0) {
    throw new Error(
      `${file.name}: Missing required columns: ${missingCols.join(", ")}.\n` +
        `  Headers found in file: ${Object.keys(rawRows[0]).join(", ")}`,
    );
  }

  const errors: string[] = [];
  const parsed: ParsedQuestion[] = [];
  const fallbackDepartment =
    normalizeDepartment(departmentHint || "") || deptFromFilename(file.name);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNum = index + 2;
    const text = toCellText(row.text);
    const rawCategory = toCellText(row.category);
    const category =
      normalizeCategory(rawCategory) ||
      (!hasCategoryColumn
        ? inferCategoryFromQuestionText(text, index, rows.length)
        : null);
    const rawDepartment = toCellText(row.department);
    const department =
      normalizeDepartment(rawDepartment) || fallbackDepartment || null;
    const option1 = toCellText(row.option1);
    const option2 = toCellText(row.option2);
    const option3 = toCellText(row.option3);
    const option4 = toCellText(row.option4);
    const answerIdx = Number(row.correct_answer_index);

    if (!category) {
      errors.push(
        `${file.name} row ${rowNum}: missing or unrecognized category`,
      );
      continue;
    }
    if (!text) {
      errors.push(`${file.name} row ${rowNum}: missing question text`);
      continue;
    }
    if (!option1 || !option2 || !option3 || !option4) {
      errors.push(`${file.name} row ${rowNum}: all 4 options are required`);
      continue;
    }
    if (Number.isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      errors.push(
        `${file.name} row ${rowNum}: correct_answer_index must be 0–3 (got "${row.correct_answer_index}")`,
      );
      continue;
    }
    if (!department && rawDepartment) {
      errors.push(
        `${file.name} row ${rowNum}: could not normalize department "${rawDepartment}"`,
      );
      continue;
    }

    parsed.push({
      category,
      department,
      text,
      options: [option1, option2, option3, option4],
      correct_answer_index: answerIdx,
    });
  }

  return { parsed, errors };
};

export const SettingsTab: React.FC = () => {
  const {
    maxTriesDefault,
    rewardPoints: contextRewardPoints,
    eventName: contextEventName,
    resetSessionData,
    awards,
    addAward,
    removeAward,
    refreshQuestions,
    questions,
    updateMaxTriesDefault,
    updateRewardPoints,
    updateEventName,
  } = useAppContext();
  const [maxTries, setMaxTries] = useState(maxTriesDefault);
  const [rewardPoints, setRewardPoints] = useState(contextRewardPoints);
  const [eventName, setEventName] = useState(contextEventName);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetText, setResetText] = useState("");
  const [savingMaxTries, setSavingMaxTries] = useState(false);
  const [savingRewardPoints, setSavingRewardPoints] = useState(false);
  const [savedMaxTries, setSavedMaxTries] = useState(false);
  const [savedRewardPoints, setSavedRewardPoints] = useState(false);
  const [savingEventName, setSavingEventName] = useState(false);
  const [savedEventName, setSavedEventName] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "parsing" | "importing" | "success" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState("");
  const [importedFileName, setImportedFileName] = useState("");
  const [importedRowCount, setImportedRowCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isBundledImporting, setIsBundledImporting] = useState(false);

  // Question delete state
  const [deletingDept, setDeletingDept] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const handleClearAllQuestions = async () => {
    if (
      !window.confirm(
        "Delete ALL questions from the database? This cannot be undone.",
      )
    )
      return;
    setClearingAll(true);
    try {
      await deleteAllQuestions();
      await refreshQuestions();
      setImportStatus("idle");
      setImportMessage("");
    } catch (err) {
      alert("Failed to clear questions: " + getErrMsg(err));
    }
    setClearingAll(false);
  };

  const handleDeleteDeptQuestions = async (dept: string) => {
    if (!window.confirm(`Delete all questions for "${dept}"?`)) return;
    setDeletingDept(dept);
    try {
      await deleteQuestionsByDepartment(dept);
      await refreshQuestions();
    } catch (err) {
      alert("Failed to delete: " + getErrMsg(err));
    }
    setDeletingDept(null);
  };

  // Awards state
  const [newAwardName, setNewAwardName] = useState("");
  const [newAwardQty, setNewAwardQty] = useState(1);
  const [awardLoading, setAwardLoading] = useState(false);

  const handleReset = () => {
    if (resetText === "RESET") {
      resetSessionData();
      setShowResetConfirm(false);
      setResetText("");
    }
  };

  const handleSaveMaxTries = async () => {
    setSavingMaxTries(true);
    try {
      await updateMaxTriesDefault(maxTries);
      setSavedMaxTries(true);
      setTimeout(() => setSavedMaxTries(false), 2500);
    } catch (err) {
      alert(
        "Failed to save: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
    setSavingMaxTries(false);
  };

  const handleSaveRewardPoints = async () => {
    setSavingRewardPoints(true);
    try {
      await updateRewardPoints(rewardPoints);
      setSavedRewardPoints(true);
      setTimeout(() => setSavedRewardPoints(false), 2500);
    } catch (err) {
      alert(
        "Failed to save: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
    setSavingRewardPoints(false);
  };

  const handleSaveEventName = async () => {
    if (!eventName.trim()) return;
    setSavingEventName(true);
    try {
      await updateEventName(eventName.trim());
      setSavedEventName(true);
      setTimeout(() => setSavedEventName(false), 2500);
    } catch (err) {
      alert(
        "Failed to save: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
    setSavingEventName(false);
  };

  // --- Question Import Logic ---

  const getErrMsg = (err: unknown, fallback = "Unknown error") =>
    err instanceof Error
      ? err.message
      : (err as any)?.message
        ? String((err as any).message)
        : (err as any)?.details
          ? String((err as any).details)
          : fallback;

  const parseFiles = useCallback(
    async (sources: QuestionImportSource[]) => {
      setImportStatus("parsing");
      setImportMessage(
        `Parsing ${sources.length} file${sources.length > 1 ? "s" : ""}…`,
      );
      setImportedFileName(
        sources
          .map((source) => source.sourceLabel ?? source.file.name)
          .join(", "),
      );

      try {
        // Step 1 — parse every file, collecting questions grouped by department
        const byDept = new Map<string | null, ParsedQuestion[]>();
        const allErrors: string[] = [];
        const parseResults: string[] = [];
        let totalParsed = 0;

        for (const source of sources) {
          try {
            const fileDeptHint =
              source.departmentHint || deptFromFilename(source.file.name);
            const { parsed, errors } = await parseSingleFile(
              source.file,
              fileDeptHint,
            );
            allErrors.push(...errors);
            totalParsed += parsed.length;

            for (const q of parsed) {
              if (!byDept.has(q.department)) byDept.set(q.department, []);
              byDept.get(q.department)!.push(q);
            }

            parseResults.push(
              `✓ ${source.sourceLabel ?? source.file.name}: ${parsed.length} questions`,
            );
          } catch (err) {
            allErrors.push(
              getErrMsg(err, `${source.file.name}: unknown error`),
            );
            parseResults.push(
              `✗ ${source.sourceLabel ?? source.file.name}: failed to parse`,
            );
          }
        }

        if (totalParsed === 0) {
          setImportStatus("error");
          setImportMessage(
            `No valid questions found.\n\n${parseResults.join("\n")}` +
              (allErrors.length > 0
                ? `\n\nErrors:\n${allErrors.slice(0, 30).join("\n")}`
                : ""),
          );
          return;
        }

        // Step 2 — for each department, delete existing then insert new questions.
        // Done per-department so a failure in one department does NOT affect others.
        const deptResults: string[] = [];
        let totalImported = 0;
        const importErrors: string[] = [];

        setImportStatus("importing");
        const deptList = [...byDept.keys()];
        setImportMessage(
          `Parsed ${totalParsed} questions across ${deptList.length} department(s). Importing…`,
        );

        for (const [dept, questions] of byDept.entries()) {
          try {
            if (dept) {
              await deleteQuestionsByDepartment(dept);
            } else {
              await deleteNullDepartmentQuestions();
            }
            await insertQuestions(questions);
            totalImported += questions.length;
            deptResults.push(
              `✓ ${dept ?? "General"}: ${questions.length} imported`,
            );
          } catch (err) {
            importErrors.push(`✗ ${dept ?? "General"}: ${getErrMsg(err)}`);
            deptResults.push(`✗ ${dept ?? "General"}: failed`);
          }
        }

        await refreshQuestions();

        setImportedRowCount(totalImported);
        const hasImportErrors = importErrors.length > 0;
        const hasParseErrors = allErrors.length > 0;
        setImportStatus(totalImported === 0 ? "error" : "success");
        setImportMessage(
          `Imported ${totalImported} of ${totalParsed} questions across ${byDept.size} department(s).` +
            (hasParseErrors ? `\n${allErrors.length} row(s) skipped.` : "") +
            `\n\n── Parse results ──\n${parseResults.join("\n")}` +
            `\n\n── Import results ──\n${deptResults.join("\n")}` +
            (hasImportErrors
              ? `\n\nImport errors:\n${importErrors.join("\n")}`
              : ""),
        );
      } catch (err) {
        console.error("Import error:", err);
        setImportStatus("error");
        setImportMessage(`Import failed: ${getErrMsg(err)}`);
      }
    },
    [refreshQuestions],
  );

  const handleBundledImport = useCallback(async () => {
    setIsBundledImporting(true);
    setImportStatus("parsing");
    setImportedFileName(
      BUNDLED_QUESTION_FILES.map((entry) => entry.fileName).join(", "),
    );
    setImportMessage(
      `Loading ${BUNDLED_QUESTION_FILES.length} bundled question files…`,
    );

    try {
      // Wipe ALL questions first so stale abbreviated dept names (CS, CE, BSH)
      // from previous imports are fully removed before fresh data comes in.
      setImportMessage("Clearing old questions from database…");
      await deleteAllQuestions();

      const sources = await Promise.all(
        BUNDLED_QUESTION_FILES.map(async (entry) => {
          const response = await fetch(
            `/questions/${encodeURIComponent(entry.fileName)}`,
          );
          if (!response.ok) {
            throw new Error(
              `${entry.fileName}: failed to load (${response.status})`,
            );
          }

          const blob = await response.blob();
          return {
            file: new File([blob], entry.fileName, {
              type: blob.type || "text/csv",
            }),
            departmentHint: entry.department,
            sourceLabel: entry.fileName,
          } satisfies QuestionImportSource;
        }),
      );

      await parseFiles(sources);
    } catch (err) {
      setImportStatus("error");
      setImportMessage(`Bundled import failed: ${getErrMsg(err)}`);
    } finally {
      setIsBundledImporting(false);
    }
  }, [parseFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) parseFiles(files.map((file) => ({ file })));
    // Reset the input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(csv|xlsx|xls)$/i.test(f.name),
    );
    if (files.length > 0) parseFiles(files.map((file) => ({ file })));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // --- Award handlers ---

  const handleAddAward = async () => {
    if (!newAwardName.trim() || newAwardQty < 1) return;
    setAwardLoading(true);
    try {
      await addAward(newAwardName.trim(), newAwardQty);
      setNewAwardName("");
      setNewAwardQty(1);
    } catch (err) {
      console.error("Failed to add award:", err);
    }
    setAwardLoading(false);
  };

  const handleDeleteAward = async (id: string, name: string) => {
    if (!window.confirm(`Delete award "${name}"? This cannot be undone.`))
      return;
    try {
      await removeAward(id);
    } catch (err) {
      console.error("Failed to delete award:", err);
      alert(
        "Failed to delete award: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Participation Rules */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">
            Participation Rules
          </h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between max-w-md">
            <div>
              <label
                htmlFor="max-tries"
                className="block text-sm font-bold text-gray-700"
              >
                Max tries per student
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Default number of spins allowed.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="max-tries"
                type="number"
                min={1}
                max={20}
                value={maxTries}
                onChange={(e) => setMaxTries(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold text-gray-900"
              />

              <button
                aria-label="Save max tries"
                title="Save"
                onClick={handleSaveMaxTries}
                disabled={savingMaxTries}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${savedMaxTries ? "text-green-600 bg-green-50" : "text-cdgai-accent hover:bg-blue-50"}`}
              >
                {savedMaxTries ? (
                  <CheckCircle size={20} />
                ) : savingMaxTries ? (
                  <div className="w-5 h-5 border-2 border-cdgai-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={20} />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <label
                htmlFor="reward-points"
                className="block text-sm font-bold text-gray-700"
              >
                Segment 2 Reward Points
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Points awarded for "3 Followers + Freebee".
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="reward-points"
                type="number"
                min={0}
                value={rewardPoints}
                onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-center font-bold text-gray-900"
              />

              <button
                aria-label="Save reward points"
                title="Save"
                onClick={handleSaveRewardPoints}
                disabled={savingRewardPoints}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${savedRewardPoints ? "text-green-600 bg-green-50" : "text-cdgai-accent hover:bg-blue-50"}`}
              >
                {savedRewardPoints ? (
                  <CheckCircle size={20} />
                ) : savingRewardPoints ? (
                  <div className="w-5 h-5 border-2 border-cdgai-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Question Bank */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900">Question Bank</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cdgai-accent/10 text-cdgai-accent text-xs font-bold rounded-full uppercase tracking-wider">
                {questions.length} total questions
              </span>
              {questions.length > 0 && (
                <button
                  onClick={handleClearAllQuestions}
                  disabled={clearingAll}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 uppercase tracking-wider"
                >
                  <Trash2 size={12} />
                  <span>{clearingAll ? "Clearing…" : "Clear All"}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-500 self-center mr-1">
              Sample CSVs:
            </span>
            {KNOWN_DEPARTMENTS.map((dept) => (
              <a
                key={dept}
                href={`/sample-questions/${dept}.csv`}
                download
                className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-cdgai-accent/10 text-xs font-bold text-cdgai-accent hover:bg-cdgai-accent/20 transition-colors"
              >
                <Download size={12} />
                <span>{dept}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Per-department breakdown */}
          {questions.length > 0 &&
            (() => {
              const countByDept: Record<string, number> = {};
              questions.forEach((q) => {
                const d = q.department || "General";
                countByDept[d] = (countByDept[d] || 0) + 1;
              });
              return (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Questions per Department
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {KNOWN_DEPARTMENTS.map((dept) => {
                      const count = countByDept[dept] || 0;
                      return (
                        <div
                          key={dept}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${count > 0 ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                        >
                          <span
                            className={`font-medium truncate mr-1 ${count > 0 ? "text-gray-800" : "text-gray-400"}`}
                          >
                            {dept}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span
                              className={`font-bold ${count > 0 ? "text-green-700" : "text-gray-400"}`}
                            >
                              {count}
                            </span>
                            {count > 0 && (
                              <button
                                onClick={() => handleDeleteDeptQuestions(dept)}
                                disabled={deletingDept === dept}
                                className="p-0.5 text-red-400 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                                title={`Delete all ${dept} questions`}
                              >
                                {deletingDept === dept ? (
                                  <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleBundledImport}
              disabled={
                isBundledImporting ||
                importStatus === "parsing" ||
                importStatus === "importing"
              }
              className="inline-flex items-center justify-center space-x-2 rounded-lg bg-cdgai-accent px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={16} />
              <span>
                {isBundledImporting
                  ? "Importing Bundled Files…"
                  : `Import Bundled Questions (${BUNDLED_QUESTION_FILES.length})`}
              </span>
            </button>
            <p className="text-xs text-gray-500 self-center">
              Loads every CSV from{" "}
              <span className="font-semibold">public/questions</span> into the
              database using the same validation path as manual uploads.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer group ${isDragging ? "border-cdgai-accent bg-blue-50" : "border-gray-300 hover:bg-gray-50"}`}
          >
            <div className="w-12 h-12 bg-blue-50 text-cdgai-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              .csv or .xlsx files &mdash; select multiple files at once
            </p>
          </div>

          {/* Import Status */}
          {importStatus !== "idle" && (
            <div
              className={`mt-4 p-4 rounded-lg border flex items-start space-x-3 ${
                importStatus === "success"
                  ? "bg-green-50 border-green-200"
                  : importStatus === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
              }`}
            >
              {importStatus === "success" && (
                <CheckCircle
                  size={20}
                  className="text-green-600 flex-shrink-0 mt-0.5"
                />
              )}
              {importStatus === "error" && (
                <XCircle
                  size={20}
                  className="text-red-600 flex-shrink-0 mt-0.5"
                />
              )}
              {(importStatus === "parsing" || importStatus === "importing") && (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-bold ${
                    importStatus === "success"
                      ? "text-green-800"
                      : importStatus === "error"
                        ? "text-red-800"
                        : "text-blue-800"
                  }`}
                >
                  {importedFileName}
                </p>
                <p
                  className={`text-xs mt-1 whitespace-pre-line ${
                    importStatus === "success"
                      ? "text-green-700"
                      : importStatus === "error"
                        ? "text-red-700"
                        : "text-blue-700"
                  }`}
                >
                  {importMessage}
                </p>
              </div>
              {importStatus === "success" && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase tracking-wider flex-shrink-0">
                  {importedRowCount} rows
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Awards / Prizes */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Awards / Prizes</h2>
          <p className="text-xs text-gray-500 mt-1">
            Each contestant can win at most one award. Awards are assigned
            randomly when landing on the Freebee segment.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Add new award */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-3 sm:space-x-0">
            <div className="flex-1">
              <label
                htmlFor="new-award-name"
                className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider"
              >
                Award Name
              </label>
              <input
                id="new-award-name"
                type="text"
                value={newAwardName}
                onChange={(e) => setNewAwardName(e.target.value)}
                placeholder="e.g. T-Shirt, Mug, Notebook"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-sm text-gray-900"
              />
            </div>
            <div className="w-24">
              <label
                htmlFor="new-award-qty"
                className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider"
              >
                Qty
              </label>
              <input
                id="new-award-qty"
                type="number"
                min={1}
                value={newAwardQty}
                onChange={(e) =>
                  setNewAwardQty(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent text-sm text-center font-bold text-gray-900"
              />
            </div>
            <button
              onClick={handleAddAward}
              disabled={!newAwardName.trim() || awardLoading}
              className="flex items-center space-x-1 px-4 py-2 bg-cdgai-accent text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>

          {/* Awards list */}
          {awards.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm font-medium">
              No awards configured. Add awards above to enable prize
              distribution.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-3">Award</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center">Remaining</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {awards.map((award) => (
                    <tr
                      key={award.id}
                      className={`${award.remainingQuantity === 0 ? "opacity-60" : ""}`}
                    >
                      <td className="p-3 font-bold text-gray-900">
                        {award.name}
                      </td>
                      <td className="p-3 text-center text-gray-600">
                        {award.totalQuantity}
                      </td>
                      <td className="p-3 text-center font-bold text-gray-900">
                        {award.remainingQuantity}
                      </td>
                      <td className="p-3 text-center">
                        {award.remainingQuantity === 0 ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded uppercase">
                            Exhausted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() =>
                            handleDeleteAward(award.id, award.name)
                          }
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label={`Delete ${award.name} award`}
                          title="Delete Award"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Event Settings */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Event Details</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label
              htmlFor="event-name"
              className="block text-sm font-bold text-gray-700 mb-2"
            >
              Event Name
            </label>
            <input
              id="event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-cdgai-accent"
            />
          </div>
          <button
            onClick={handleSaveEventName}
            disabled={savingEventName}
            className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 ${savedEventName ? "bg-green-600 text-white" : "bg-gray-900 text-white hover:bg-gray-800"}`}
          >
            {savedEventName ? (
              <>
                <CheckCircle size={16} /> Saved
              </>
            ) : savingEventName ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Saving…
              </>
            ) : (
              "Save Event Details"
            )}
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="p-6 border-b border-red-100 bg-red-100/50 flex items-center space-x-2 text-red-800">
          <AlertCircle size={20} aria-hidden="true" />
          <h2 className="text-lg font-bold">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-red-800 mb-4 font-medium">
            This will permanently delete all student records, scores, and spin
            history. This action cannot be undone.
          </p>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Session Data
            </button>
          ) : (
            <div className="bg-white p-4 rounded-lg border border-red-200 inline-block">
              <p className="text-sm font-bold text-gray-900 mb-2">
                Type RESET to confirm
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder="RESET"
                  className="w-32 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-red-500 text-center font-bold"
                />

                <button
                  onClick={handleReset}
                  disabled={resetText !== "RESET"}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetText("");
                  }}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
