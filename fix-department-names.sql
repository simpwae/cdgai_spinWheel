-- ============================================================
-- FIX: Normalize department names in the questions table
-- Run this in the Supabase SQL Editor (project > SQL Editor)
-- ============================================================
-- Root cause: some CSVs used abbreviations (CS, CE, BSH) which
-- were stored as-is in older imports. Students register with
-- canonical names (Computer Sciences, Civil, Basic Science &
-- Humanities), causing a mismatch and random questions being shown.
-- ============================================================

-- 1. Computer Science abbreviations → canonical "Computer Sciences"
UPDATE questions
SET department = 'Computer Sciences'
WHERE department IN ('CS', 'Computer Science', 'computer science', 'comp sci', 'CompSci');

-- 2. Civil Engineering abbreviations → canonical "Civil"
UPDATE questions
SET department = 'Civil'
WHERE department IN ('CE', 'Civil Engineering', 'civil engineering');

-- 3. BSH abbreviations → canonical "Basic Science & Humanities"
UPDATE questions
SET department = 'Basic Science & Humanities'
WHERE department IN (
    'BSH',
    'Basic Sciences & Humanities',
    'Basic Sciences and Humanities',
    'basic science and humanities',
    'basic sciences and humanities'
);

-- 4. Other common variations (safety net)
UPDATE questions SET department = 'Software Engineering'  WHERE department IN ('SE', 'Soft Eng', 'software eng');
UPDATE questions SET department = 'Electrical'            WHERE department IN ('EE', 'Electrical Engineering');
UPDATE questions SET department = 'Mechanical'            WHERE department IN ('Mech', 'Mechanical Engineering');
UPDATE questions SET department = 'Architecture'          WHERE department IN ('Arch', 'architecuture', 'Architecuture');
UPDATE questions SET department = 'Allied Health Sciences' WHERE department IN ('Allied Health', 'Allied Heath Sciences', 'Allied Health Science');
UPDATE questions SET department = 'Bioscience'            WHERE department IN ('Biosciences', 'Bio Science', 'Bio Sciences');
UPDATE questions SET department = 'Management of Science' WHERE department IN ('Management Sciences', 'Management Science', 'Mgt');

-- 5. Verify - run this SELECT to confirm the results
SELECT department, category, COUNT(*) AS count
FROM questions
GROUP BY department, category
ORDER BY department, category;
