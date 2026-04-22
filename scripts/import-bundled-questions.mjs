import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = Object.fromEntries(
  envContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const equalsIndex = line.indexOf('=');
      return [line.slice(0, equalsIndex), line.slice(equalsIndex + 1)];
    }),
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const QUESTION_FILES = [
  { fileName: 'Allied Heath Sciences Question Bank (1).csv', department: 'Allied Health Sciences' },
  { fileName: 'Architecuture_Mcqs - Architecture.csv', department: 'Architecture' },
  { fileName: 'BioScience-Re - Bioscience MCQs.csv', department: 'Bioscience' },
  { fileName: 'BSH_MCQs.csv', department: 'Basic Science & Humanities' },
  { fileName: 'Civil_Engineering_MCQs_200.csv', department: 'Civil' },
  { fileName: 'Computer_Science_MCQs_200.csv', department: 'Computer Sciences' },
  { fileName: 'Electrical_Engineering_MCQs_200.csv', department: 'Electrical' },
  { fileName: 'Management_Sciences_MCQs_200.csv', department: 'Management of Science' },
  { fileName: 'Mechanical_MCQs_200.csv', department: 'Mechanical' },
  { fileName: 'nursing_200_mcqs.csv', department: 'Nursing' },
  { fileName: 'pharmacy_200_mcqs.csv', department: 'Pharmacy' },
  { fileName: 'Software eng_200_mcqs.csv', department: 'Software Engineering' },
];

const KNOWN_DEPARTMENTS = [
  'Civil', 'Mechanical', 'Electrical', 'Architecture',
  'Pharmacy', 'Bioscience', 'Allied Health Sciences', 'Nursing',
  'Management of Science', 'Basic Science & Humanities',
  'Computer Sciences', 'Software Engineering',
];

const DEPT_ALIASES = {
  'bsh': 'Basic Science & Humanities',
  'basic science and humanities': 'Basic Science & Humanities',
  'basic sciences and humanities': 'Basic Science & Humanities',
  'basic sciences humanities': 'Basic Science & Humanities',
  'allied health': 'Allied Health Sciences',
  'allied health science': 'Allied Health Sciences',
  'allied health sciences': 'Allied Health Sciences',
  'allied heath science': 'Allied Health Sciences',
  'allied heath sciences': 'Allied Health Sciences',
  'biosciences': 'Bioscience',
  'bio science': 'Bioscience',
  'bio sciences': 'Bioscience',
  'life sciences': 'Bioscience',
  'cs': 'Computer Sciences',
  'computer science': 'Computer Sciences',
  'compsci': 'Computer Sciences',
  'se': 'Software Engineering',
  'soft eng': 'Software Engineering',
  'software eng': 'Software Engineering',
  'mgt': 'Management of Science',
  'management science': 'Management of Science',
  'management sciences': 'Management of Science',
  'management of sciences': 'Management of Science',
  'mgmt of science': 'Management of Science',
  'mgmt science': 'Management of Science',
  'arch': 'Architecture',
  'architecuture': 'Architecture',
  'ce': 'Civil',
  'civil engineering': 'Civil',
  'mech': 'Mechanical',
  'mechanical engineering': 'Mechanical',
  'ee': 'Electrical',
  'electrical engineering': 'Electrical',
};

const CATEGORY_ALIASES = {
  'question bank': 'Question Bank',
  'questionbank': 'Question Bank',
  'questions bank': 'Question Bank',
  'iq games': 'IQ Games',
  'iq game': 'IQ Games',
  'career question': 'Career Questions',
  'career questions': 'Career Questions',
};

const HEADER_ALIASES = {
  category: ['category', 'question category', 'segment', 'type', 'question type'],
  department: ['department', 'dept', 'branch', 'major', 'school'],
  text: ['text', 'question', 'question text', 'question_text', 'q', 'stem'],
  option1: ['option1', 'option_1', 'option 1', 'a', 'choice1', 'choice_1', 'choice 1', 'choice a', 'answer a'],
  option2: ['option2', 'option_2', 'option 2', 'b', 'choice2', 'choice_2', 'choice 2', 'choice b', 'answer b'],
  option3: ['option3', 'option_3', 'option 3', 'c', 'choice3', 'choice_3', 'choice 3', 'choice c', 'answer c'],
  option4: ['option4', 'option_4', 'option 4', 'd', 'choice4', 'choice_4', 'choice 4', 'choice d', 'answer d'],
  correct_answer_index: [
    'correct answer index',
    'correct_answer_index',
    'correct answer',
    'answer',
    'answer index',
    'answer_index',
    'correct',
    'correct index',
    'key',
    'right answer',
    'correct option',
  ],
};

const buildLookupMap = (source) => {
  const map = new Map();
  Object.entries(source).forEach(([alias, canonical]) => {
    const normalized = alias
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    if (normalized) {
      map.set(normalized, canonical);
      map.set(normalized.replace(/\s+/g, ''), canonical);
    }
  });
  return map;
};

const HEADER_LOOKUP = (() => {
  const map = {};
  Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
      map[alias.toLowerCase().replace(/^\uFEFF/, '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')] = canonical;
    });
  });
  return map;
})();

const DEPARTMENT_LOOKUP = buildLookupMap({
  ...Object.fromEntries(KNOWN_DEPARTMENTS.map((department) => [department, department])),
  ...DEPT_ALIASES,
});

const CATEGORY_LOOKUP = buildLookupMap({
  'Question Bank': 'Question Bank',
  'IQ Games': 'IQ Games',
  'Career Questions': 'Career Questions',
  ...CATEGORY_ALIASES,
});

const normalizeLookupValue = (value) =>
  value
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/&/g, ' and ')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const collapseLookupValue = (value) => normalizeLookupValue(value).replace(/\s+/g, '');

const normalizeDepartment = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  const normalized = normalizeLookupValue(trimmed);
  const collapsed = collapseLookupValue(trimmed);
  const directMatch = DEPARTMENT_LOOKUP.get(normalized) || DEPARTMENT_LOOKUP.get(collapsed);
  if (directMatch) return directMatch;

  for (const department of KNOWN_DEPARTMENTS) {
    const normalizedDepartment = normalizeLookupValue(department);
    const collapsedDepartment = collapseLookupValue(department);
    if (normalized.includes(normalizedDepartment) || collapsed.includes(collapsedDepartment)) {
      return department;
    }
  }

  for (const [alias, canonical] of Object.entries(DEPT_ALIASES)) {
    const normalizedAlias = normalizeLookupValue(alias);
    const collapsedAlias = collapseLookupValue(alias);
    if (normalizedAlias.length > 3 && (normalized.includes(normalizedAlias) || collapsed.includes(collapsedAlias))) {
      return canonical;
    }
  }

  return null;
};

const normalizeCategory = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const normalized = normalizeLookupValue(trimmed);
  const collapsed = collapseLookupValue(trimmed);
  return CATEGORY_LOOKUP.get(normalized) || CATEGORY_LOOKUP.get(collapsed) || null;
};

const inferCategoryFromQuestionText = (text, rowIndex, totalRows) => {
  const lowerText = String(text || '').toLowerCase();
  if (/\bcareer\b/.test(lowerText) || /\b(role|profession|skills?|portfolio|resume|scrum|project manager|software engineer)\b/.test(lowerText)) {
    return 'Career Questions';
  }
  if (/\b(find the next|sequence|analogy|odd one out|how many|what comes next|logical|pattern|rooms\?)\b/.test(lowerText)) {
    return 'IQ Games';
  }
  if (totalRows >= 180) {
    if (rowIndex < 80) return 'Question Bank';
    if (rowIndex < 140) return 'IQ Games';
    return 'Career Questions';
  }
  return 'Question Bank';
};

const normalizeHeaderKey = (rawKey) =>
  rawKey
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const isZeroBasedOptionHeader = (key) => /^(option|choice)\s*0$/.test(key);

const normalizeRow = (row, zeroBasedOptions) => {
  const output = {};
  Object.entries(row).forEach(([rawKey, value]) => {
    const cleanedKey = normalizeHeaderKey(rawKey);

    if (zeroBasedOptions) {
      if (/^(option|choice)\s*0$/.test(cleanedKey)) {
        output.option1 = value;
        return;
      }
      if (/^(option|choice)\s*1$/.test(cleanedKey)) {
        output.option2 = value;
        return;
      }
      if (/^(option|choice)\s*2$/.test(cleanedKey)) {
        output.option3 = value;
        return;
      }
      if (/^(option|choice)\s*3$/.test(cleanedKey)) {
        output.option4 = value;
        return;
      }
    }

    const canonicalKey = HEADER_LOOKUP[cleanedKey] || cleanedKey.replace(/\s+/g, '_');
    output[canonicalKey] = value;
  });
  return output;
};

const deptFromFilename = (fileName) => {
  const base = fileName
    .replace(/\.(csv|xlsx|xls)$/i, '')
    .replace(/\(\d+\)$/i, '')
    .replace(/\b(mcqs?|questions?|question bank|q bank|final|re)\b/gi, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeDepartment(base);
};

const toCellText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseQuestionFile = (absolutePath, departmentHint) => {
  const workbook = /\.csv$/i.test(absolutePath)
    ? XLSX.read(fs.readFileSync(absolutePath, 'utf8'), { type: 'string', raw: true, cellFormula: false })
    : XLSX.read(fs.readFileSync(absolutePath), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error(`${path.basename(absolutePath)}: no sheet found`);
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (rawRows.length === 0) throw new Error(`${path.basename(absolutePath)}: no data rows found`);

  const headerKeys = Object.keys(rawRows[0]).map(normalizeHeaderKey);
  const zeroBasedOptions = headerKeys.some(isZeroBasedOptionHeader);
  const hasCategoryColumn = headerKeys.includes('category');
  const rows = rawRows.map((row) => normalizeRow(row, zeroBasedOptions));
  const requiredCols = ['text', 'option1', 'option2', 'option3', 'option4', 'correct_answer_index'];
  const missingCols = requiredCols.filter((column) => !(column in rows[0]));
  if (missingCols.length > 0) {
    throw new Error(`${path.basename(absolutePath)}: missing required columns ${missingCols.join(', ')}`);
  }

  const parsed = [];
  const errors = [];
  const fallbackDepartment = normalizeDepartment(departmentHint || '') || deptFromFilename(path.basename(absolutePath));

  rows.forEach((row, index) => {
    const text = toCellText(row.text);
    const category = normalizeCategory(toCellText(row.category)) || (!hasCategoryColumn ? inferCategoryFromQuestionText(text, index, rows.length) : null);
    const department = normalizeDepartment(toCellText(row.department)) || fallbackDepartment || null;
    const option1 = toCellText(row.option1);
    const option2 = toCellText(row.option2);
    const option3 = toCellText(row.option3);
    const option4 = toCellText(row.option4);
    const answerIdx = Number(row.correct_answer_index);

    if (!category || !text || !option1 || !option2 || !option3 || !option4 || Number.isNaN(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      errors.push(`${path.basename(absolutePath)} row ${index + 2}: invalid row`);
      return;
    }
    if (!department && row.department) {
      errors.push(`${path.basename(absolutePath)} row ${index + 2}: could not normalize department ${row.department}`);
      return;
    }

    parsed.push({
      category,
      department,
      text,
      options: [option1, option2, option3, option4],
      correct_answer_index: answerIdx,
    });
  });

  return { parsed, errors };
};

const dryRun = process.argv.includes('--dry-run');
const verifyOnly = process.argv.includes('--verify-only');
const writeAllCsv = process.argv.includes('--write-all-csv');
const questionsDirectory = path.join(projectRoot, 'public', 'questions');
const byDepartment = new Map();
const allQuestions = [];
const parseSummary = [];
const parseErrors = [];

const escapeCsvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const writeAllDepartmentsCsv = (questions) => {
  const outputPath = path.join(questionsDirectory, 'All_departments.csv');
  const lines = [
    'category,department,text,option1,option2,option3,option4,correct_answer_index',
    ...questions.map((question) => [
      question.category,
      question.department,
      question.text,
      question.options[0],
      question.options[1],
      question.options[2],
      question.options[3],
      question.correct_answer_index,
    ].map(escapeCsvCell).join(',')),
  ];

  fs.writeFileSync(outputPath, `${lines.join('\r\n')}\r\n`, 'utf8');
  console.log(`Wrote ${questions.length} rows to ${path.relative(projectRoot, outputPath)}`);
};

const fetchQuestionsForVerification = async () => {
  const pageSize = 1000;
  const questions = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('questions')
      .select('department, category')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message || error.details || JSON.stringify(error));
    }

    questions.push(...(data || []));
    if (!data || data.length < pageSize) {
      break;
    }
  }

  return questions;
};

const printVerificationSummary = async () => {
  const questions = await fetchQuestionsForVerification();

  const departmentCounts = new Map();
  const categoryCounts = new Map();
  for (const row of questions || []) {
    const department = row.department || 'General';
    departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
    const key = `${department} | ${row.category}`;
    categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  }

  console.log(JSON.stringify({
    total: questions.length,
    departments: Object.fromEntries([...departmentCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    categories: Object.fromEntries([...categoryCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
  }, null, 2));
};

if (verifyOnly) {
  await printVerificationSummary();
} else {
  for (const entry of QUESTION_FILES) {
    const absolutePath = path.join(questionsDirectory, entry.fileName);
    const { parsed, errors } = parseQuestionFile(absolutePath, entry.department);
    parseSummary.push(`${entry.fileName}: ${parsed.length} questions`);
    parseErrors.push(...errors);
    allQuestions.push(...parsed);

    for (const question of parsed) {
      const key = question.department || '__general__';
      if (!byDepartment.has(key)) byDepartment.set(key, []);
      byDepartment.get(key).push(question);
    }
  }

  console.log('Parse summary:');
  parseSummary.forEach((line) => console.log(`  ${line}`));
  if (parseErrors.length > 0) {
    console.log(`Warnings/errors during parsing: ${parseErrors.length}`);
    parseErrors.slice(0, 20).forEach((line) => console.log(`  ${line}`));
  }

  if (writeAllCsv) {
    writeAllDepartmentsCsv(allQuestions);
  }

  if (writeAllCsv) {
    // Rebuilding the combined CSV is a file output only; skip database writes.
  } else if (dryRun) {
    console.log('Dry run only. No database changes made.');
  } else {
    for (const [department, questions] of byDepartment.entries()) {
      const deleteQuery = supabase.from('questions').delete();
      const { error: deleteError } = department === '__general__'
        ? await deleteQuery.is('department', null)
        : await deleteQuery.eq('department', department);

      if (deleteError) {
        throw new Error(`Failed deleting ${department}: ${deleteError.message || deleteError.details || JSON.stringify(deleteError)}`);
      }

      for (let index = 0; index < questions.length; index += 500) {
        const batch = questions.slice(index, index + 500);
        const { error: insertError } = await supabase.from('questions').insert(batch);
        if (insertError) {
          throw new Error(`Failed inserting ${department}: ${insertError.message || insertError.details || JSON.stringify(insertError)}`);
        }
      }
    }

    console.log('Verification summary:');
    await printVerificationSummary();
  }
}