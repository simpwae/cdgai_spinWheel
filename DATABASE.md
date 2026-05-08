# Database Reference — EduWheel (CDGAI Career Fair Spin Wheel)

> **Setup order:** `supabase-setup.sql` → `supabase-departments-migration.sql` → `fix-department-names.sql` (only if migrating data) → Admin UI: Settings → Import All Bundled Questions.

## Schema Overview
| Table | PK | Realtime | Description |
|---|---|---|---|
| `students` | UUID | ✅ | All event participants — core data table |
| `segments` | TEXT s1–s7 | ❌ | 7 wheel segments — static, seeded once, never changed |
| `questions` | UUID | ❌ | MCQ question bank — imported by admin via CSV |
| `active_session` | TEXT `'singleton'` | ✅ | Current booth state — exactly one row |
| `settings` | TEXT `'singleton'` | ❌ | Event configuration — exactly one row |
| `awards` | UUID | ✅ | Physical prize inventory |
| `departments` | UUID | ❌ | Custom departments beyond the 12 built-in ones |

Realtime publication `supabase_realtime` includes: `students`, `active_session`, `awards`.

## Table: `students`
```sql
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, student_id text UNIQUE NOT NULL,
  email text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '',
  faculty text NOT NULL DEFAULT '', department text NOT NULL DEFAULT '',
  participant_type text NOT NULL DEFAULT 'student',
  score integer NOT NULL DEFAULT 0, spins_used integer NOT NULL DEFAULT 0,
  max_spins integer NOT NULL DEFAULT 3, status text NOT NULL DEFAULT 'active',
  spin_history text[] NOT NULL DEFAULT '{}', reward_claimed boolean NOT NULL DEFAULT false,
  awarded_prize text, pending_score integer, pending_feedback text,
  is_guest boolean NOT NULL DEFAULT false, guest_type text NOT NULL DEFAULT '',
  semester text NOT NULL DEFAULT '', position text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '', field_of_interest text NOT NULL DEFAULT '',
  follow_status text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
```
| Column | Notes |
|---|---|
| `student_id` | UNIQUE — prevents duplicate registrations; guests use generated `GUEST-xxx-xxxx` |
| `participant_type` | `'student'` \| `'faculty'` \| `'others'` |
| `status` | `'active'` \| `'locked'` (spinsUsed >= maxSpins) \| `'banned'` (admin action) |
| `spin_history[]` | Array of segment IDs per spin (e.g. `['s3','s1']`) — used for analytics |
| `pending_score` + `pending_feedback` | Admin writes these (pitch/résumé) → Realtime fires → result screen transitions to score display sub-state |
| `awarded_prize` | Set atomically by `claim_random_award` RPC |
| `is_guest` | `true` for non-CECOS participants |
| `semester` | CECOS students only; `position`/`organization` for faculty; `field_of_interest`/`follow_status` for guests |

Status transitions: `active → locked` (spinsUsed >= maxSpins on recordSpin) · `active → banned` (admin) · `banned → active` (admin unban) · `locked → active` (admin increases maxSpins via editTries).

## Table: `segments` (static seed, never modified)
| id | name | color |
|---|---|---|
| s1 | Better Luck Next Time | #6B7280 |
| s2 | 3 Followers + Freebee | #D97706 |
| s3 | Question Bank | #7C3AED |
| s4 | IQ Games | #0D9488 |
| s5 | Pitch & Communicate | #EA580C |
| s6 | Career Questions | #2563EB |
| s7 | Résumé Review | #16A34A |

RLS: SELECT only for anon. IDs stored in `active_session.last_spin_segment_id` and `students.spin_history[]`.

## Table: `questions`
```sql
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,           -- 'Question Bank' | 'IQ Games' | 'Career Questions'
  department text,                  -- NULL = shared pool (fallback for all departments)
  text text NOT NULL,
  options text[] NOT NULL,          -- exactly 4 strings
  correct_answer_index integer NOT NULL  -- 0-based
);
```
Category→segment: `'Question Bank'`→s3 · `'IQ Games'`→s4 · `'Career Questions'`→s6. Selection logic: filter by category + department; fallback to `department IS NULL` pool. Import replaces existing rows per department (`deleteQuestionsByDepartment()` then batched insert of 500/chunk).

## Table: `active_session` (singleton)
```sql
CREATE TABLE active_session (
  id text PRIMARY KEY DEFAULT 'singleton',
  current_student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  last_spin_segment_id text, last_spin_segment_name text,
  last_spin_timestamp bigint,       -- dedup key for Realtime; compared against lastProcessedSpinTs ref
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
`setSpinResultAndClearStudent()` sets spin fields AND `current_student_id = NULL` in **one atomic UPDATE** — fires one Realtime event. This prevents the race condition where result screens would lose `currentStudent` if two separate updates were used. `ON DELETE SET NULL` auto-clears on leaderboard reset. On page load, `fetchSession()` restores `currentStudent` and pre-seeds `lastProcessedSpinTs` so the spin is not re-triggered.

## Table: `settings` (singleton)
| Column | Default | Description |
|---|---|---|
| `max_tries_default` | 3 | Default max spins for new registrations only |
| `reward_points` | 5 | Points for s2 (Freebee) |
| `event_name` | `'EduWheel'` | Shown in admin panel and registration |

All writes use UPSERT: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...`

## Table: `awards`
```sql
CREATE TABLE awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_quantity integer NOT NULL DEFAULT 0,   -- never changes after insert
  remaining_quantity integer NOT NULL DEFAULT 0, -- decremented by RPC
  created_at timestamptz NOT NULL DEFAULT now()
);
```
When `remaining_quantity = 0`, award shows "Exhausted" in admin UI. Realtime enabled — inventory changes propagate live.

## Table: `departments`
```sql
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, faculty text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
Duplicate prevention is in CategoriesTab (case-insensitive check vs built-ins + existing). `is_active = false` hides dept from registration forms and leaderboard filters (student data intact). The 12 built-in depts are hardcoded in `FACULTY_DEPARTMENTS` in `AppContext.tsx` — NOT in this table.

## PostgreSQL RPC: `claim_random_award`
```sql
CREATE OR REPLACE FUNCTION claim_random_award(p_student_id uuid) RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_award_id uuid; v_award_name text; v_existing text;
BEGIN
  SELECT awarded_prize INTO v_existing FROM students WHERE id = p_student_id;
  IF v_existing IS NOT NULL THEN RETURN NULL; END IF;  -- idempotency guard
  SELECT id, name INTO v_award_id, v_award_name FROM awards
    WHERE remaining_quantity > 0 ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_award_id IS NULL THEN RETURN NULL; END IF;      -- no stock
  UPDATE awards SET remaining_quantity = remaining_quantity - 1 WHERE id = v_award_id;
  UPDATE students SET awarded_prize = v_award_name WHERE id = p_student_id;
  RETURN v_award_name;
END; $$;
```
Returns prize name (success) or NULL (no stock / already claimed). `FOR UPDATE SKIP LOCKED` = concurrency-safe. Invoked via `supabase.rpc('claim_random_award', { p_student_id })`. On RPC failure → `claimAwardClientSide()` non-atomic fallback.

## Row Level Security (RLS)
All tables allow full anon access (appropriate for closed event network).
- `students`: SELECT + INSERT + UPDATE + DELETE for anon
- `segments`: SELECT only for anon (no write policies)
- `questions`, `awards`: SELECT + INSERT + UPDATE + DELETE for anon
- `active_session`: SELECT + UPDATE for anon (no insert/delete — singleton managed by SQL)
- `settings`: SELECT + INSERT + UPDATE for anon
- `departments`: SELECT + INSERT + UPDATE + DELETE for anon

**Hardening for internet-facing deployments:** Add Supabase Auth; restrict write RLS to `authenticated`; rate-limit registration; rotate Anon Key after each event.

## Realtime Configuration
```sql
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE students;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE active_session;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE awards;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
```
Idempotent — safe to run multiple times. Channels: `students-realtime` (all events) · `awards-realtime` (all events) · `session-realtime` (UPDATE only). All subscribed on AppContext mount, unsubscribed on unmount.

## Migrations
- **`supabase-departments-migration.sql`** — creates `departments` table. Run after `supabase-setup.sql`.
- **`fix-department-names.sql`** — normalizes dept name casing in `students` rows. Run once on existing data.
- **In-setup ALTER TABLE** — `supabase-setup.sql` includes `ADD COLUMN IF NOT EXISTS` for all v2 guest columns (`is_guest`, `guest_type`, `semester`, `position`, `organization`, `field_of_interest`, `follow_status`, `participant_type`) — safe on existing DBs.

## Indexes & Constraints
| Table | Constraint | Type |
|---|---|---|
| `students` | `id` PK · `student_id` UNIQUE | Primary + Unique |
| `active_session` | `current_student_id → students(id) ON DELETE SET NULL` | Foreign Key |
| All others | PK only | Primary Key |

Recommended additional indexes for > 200 participants: `idx_students_student_id`, `idx_students_email`, `idx_questions_category_department`.

## TypeScript Types (src/lib/database.types.ts)
`DbStudent` · `DbSegment` · `DbQuestion` · `DbActiveSession` · `DbSettings` · `DbAward` · `DbDepartment` — all snake_case. AppContext converts to camelCase via `dbStudentToStudent()`, `dbAwardToAward()`, `dbDepartmentToCustomDepartment()`.

## Common Queries
```sql
-- All students ranked
SELECT * FROM students ORDER BY score DESC;

-- Current booth state
SELECT s.*, st.name, st.department, st.score FROM active_session s
LEFT JOIN students st ON st.id = s.current_student_id WHERE s.id = 'singleton';

-- Random question for dept+category (with shared fallback)
SELECT * FROM questions WHERE category = 'Question Bank'
AND (department = 'Computer Sciences' OR department IS NULL) ORDER BY random() LIMIT 1;

-- Leaderboard top 10
SELECT ROW_NUMBER() OVER (ORDER BY score DESC) AS rank, name, department, score
FROM students WHERE status != 'banned' AND score > 0 ORDER BY score DESC LIMIT 10;

-- Spin outcome analytics
SELECT seg.name, COUNT(*) AS spin_count FROM students st,
UNNEST(st.spin_history) AS seg_id JOIN segments seg ON seg.id = seg_id
GROUP BY seg.name ORDER BY spin_count DESC;

-- Reset for new event
DELETE FROM students;
UPDATE active_session SET current_student_id=NULL, last_spin_segment_id=NULL,
last_spin_segment_name=NULL, last_spin_timestamp=NULL, updated_at=NOW() WHERE id='singleton';
```
Note: Questions and awards are NOT deleted on reset — they persist for the next event.

## Operational Notes
**Before:** Run setup SQL files → import question banks → add prizes → confirm `max_tries_default` + `event_name`.  
**During:** `students` grows with registrations; `active_session` updates atomically on each spin; `awards.remaining_quantity` decrements on claims.  
**After:** Export data (Admin → Export) → Reset (Admin → Settings → Danger Zone, type "RESET").

| Issue | Fix |
|---|---|
| Screen not transitioning after spin | Verify `active_session` in Realtime publication; check `lastProcessedSpinTs` not matching new timestamp |
| "No questions available" | `SELECT DISTINCT department FROM questions` must match `students.department` exactly; run `fix-department-names.sql` |
| Award claim fails silently | Verify `claim_random_award` function: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'claim_random_award'` |
| App throws on load | Verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |
| Custom departments not showing | Check `is_active = true` in `departments` table; verify table exists (run migration SQL) |