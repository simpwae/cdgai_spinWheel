/**
 * Strict CSV Validation Engine
 *
 * Validates parsed question rows against active departments and categories
 * from the DB. No silent fallbacks. No inference. Exact case-insensitive match only.
 */

export interface ParsedQuestionRow {
  rowIndex: number; // 0-based, represents data row (not header)
  category: string | null;
  department: string | null;
  text: string;
  options: [string, string, string, string] | null;
  correctAnswerIndex: number | null;
  /** Raw original values for error reporting */
  raw: Record<string, unknown>;
}

export interface RowError {
  rowIndex: number; // 1-based display row (rowIndex + 2 including header)
  field: string;
  value: string;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: RowError[];
  summary: ImportSummary;
}

function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Validate an array of parsed question rows against the active department
 * and category lists from the DB.
 *
 * Rules:
 *  - Department: if non-null, MUST match an active department (case-insensitive)
 *  - Category: MUST match an active category (case-insensitive)
 *  - Missing required fields (text, options, correctAnswerIndex) are also reported
 *  - Duplicate rows (same text + department + category) are reported as warnings
 *
 * Import MUST stop completely if any errors are present.
 */
export function validateCsvRows(
  rows: ParsedQuestionRow[],
  activeDepartmentNames: string[],
  activeCategoryNames: string[],
): ValidationResult {
  const deptSet = new Set(activeDepartmentNames.map(normalizeForMatch));
  const catSet = new Set(activeCategoryNames.map(normalizeForMatch));

  const errors: RowError[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const displayRow = row.rowIndex + 2; // +1 for header, +1 for 1-based

    // --- Required: question text ---
    if (!row.text.trim()) {
      errors.push({
        rowIndex: displayRow,
        field: 'text',
        value: row.text,
        message: 'Question text is required.',
      });
    }

    // --- Required: all 4 options ---
    if (!row.options) {
      errors.push({
        rowIndex: displayRow,
        field: 'options',
        value: '',
        message: 'All 4 answer options are required.',
      });
    } else {
      row.options.forEach((opt, i) => {
        if (!opt.trim()) {
          errors.push({
            rowIndex: displayRow,
            field: `option${i + 1}`,
            value: opt,
            message: `Option ${i + 1} is empty.`,
          });
        }
      });
    }

    // --- Required: correct_answer_index 0–3 ---
    if (row.correctAnswerIndex === null || row.correctAnswerIndex < 0 || row.correctAnswerIndex > 3) {
      errors.push({
        rowIndex: displayRow,
        field: 'correct_answer_index',
        value: String(row.raw['correct_answer_index'] ?? ''),
        message: `correct_answer_index must be 0–3 (got "${row.raw['correct_answer_index'] ?? ''}").`,
      });
    }

    // --- STRICT: category must match an active category ---
    if (row.category === null || row.category.trim() === '') {
      errors.push({
        rowIndex: displayRow,
        field: 'category',
        value: String(row.raw['category'] ?? ''),
        message:
          'Category is missing or unrecognized. Please check the Categories tab.',
      });
    } else if (!catSet.has(normalizeForMatch(row.category))) {
      errors.push({
        rowIndex: displayRow,
        field: 'category',
        value: row.category,
        message: `Category "${row.category}" does not match any active category. Please check the Categories tab.`,
      });
    }

    // --- STRICT: department (if present) must match an active department ---
    if (row.department !== null && row.department.trim() !== '') {
      if (!deptSet.has(normalizeForMatch(row.department))) {
        errors.push({
          rowIndex: displayRow,
          field: 'department',
          value: row.department,
          message: `Department "${row.department}" does not match any active department. Please check the Departments list.`,
        });
      }
    }

    // --- Duplicate detection ---
    const key = `${normalizeForMatch(row.text)}|${normalizeForMatch(row.category ?? '')}|${normalizeForMatch(row.department ?? '')}`;
    if (seenKeys.has(key)) {
      errors.push({
        rowIndex: displayRow,
        field: 'duplicate',
        value: row.text.slice(0, 60),
        message: 'Duplicate question (same text + category + department) detected in this upload.',
      });
    } else {
      seenKeys.add(key);
    }
  }

  const invalidRows = new Set(errors.map((e) => e.rowIndex)).size;

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      totalRows: rows.length,
      validRows: rows.length - invalidRows,
      invalidRows,
    },
  };
}
