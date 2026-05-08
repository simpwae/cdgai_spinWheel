# AI Context — EduWheel (CDGAI Career Fair Spin Wheel)

> Read this before modifying anything. Cross-reference DATABASE.md and ARCHITECTURE.md.

## Identity & Stack
- **App:** Career fair gamification kiosk at CECOS University. v2 (May 2026). Repo: `cdgai_spinWheel`. Entry: `src/index.tsx` → `#root`.
- **Personas:** Student monitor (`/`) + Staff admin (`/?mode=admin`). Mode detection: `new URLSearchParams(location.search).get('mode') === 'admin'`.
- **Stack:** React 18 + TS 5.5 · Vite 5 · Tailwind 3.4 · Framer Motion 11 · React Router v6 · Supabase (PostgreSQL + Realtime + Edge Functions) · SheetJS · Recharts 3 · Lucide React

## What It Does
Student registers on monitor → staff spin physical wheel → click matching segment in admin panel → monitor transitions instantly (Supabase Realtime). MCQ segments: student answers on monitor. Pitch/résumé: admin scores 0–10 → appears live on monitor via `pending_score` field. Screen auto-dismisses → leaderboard → next student.

## File Map
| File | Purpose |
|---|---|
| `src/context/AppContext.tsx` | ALL state + ALL methods + 3 Realtime subscriptions (~800 lines). Read this first. |
| `src/pages/student/StudentApp.tsx` | Screen state machine; owns all screen transitions. |
| `src/lib/database.types.ts` | Source of truth for all `Db*` row interfaces. |
| `src/lib/supabase.ts` | Singleton client; throws on missing env vars. |
| `src/data/questions.ts` | **GENERATED** by Vite plugin — never edit manually. |
| `src/services/students.ts` | CRUD for students table. |
| `src/services/session.ts` | `active_session` reads/writes; owns atomic spin-clear. |
| `src/services/questions.ts` | Question bank CRUD + batched insert (500/chunk). |
| `src/services/awards.ts` | Prize CRUD + `claimRandomAward` (RPC + fallback). |
| `src/services/departments.ts` | Custom departments CRUD. |
| `src/services/settings.ts` | Settings upsert/fetch. |
| `src/services/email.ts` | `sendThankYouEmail` — fire-and-forget, never throws. |
| `src/pages/admin/DashboardTab.tsx` | Segment buttons, spin recording, score panels, charts. |
| `src/pages/admin/SettingsTab.tsx` | CSV import, awards, event config, danger zone. |
| `vite.config.ts` | Vite config + `questionsGeneratorPlugin` (reads CSVs → writes questions.ts). |
| `supabase-setup.sql` | Full DB: tables, seeds, RLS, Realtime. Run once (idempotent). |
| `supabase-departments-migration.sql` | Adds departments table (run after setup). |
| `fix-department-names.sql` | Normalizes dept name casing in existing student rows. |
| `supabase/functions/send-thankyou-email/index.ts` | Deno Edge Function (Nodemailer, HTML-escaped name). |

## Database — 7 Tables
| Table | PK | Realtime | Key Columns |
|---|---|---|---|
| `students` | UUID | ✅ | `student_id` (UNIQUE), `score`, `status`, `spin_history[]`, `awarded_prize`, `pending_score`, `pending_feedback`, `is_guest`, `participant_type` |
| `segments` | TEXT s1–s7 | ❌ | `name`, `color` — static, seeded once |
| `questions` | UUID | ❌ | `category`, `department` (nullable = shared pool), `text`, `options[]`, `correct_answer_index` |
| `active_session` | TEXT 'singleton' | ✅ | `current_student_id` (FK → students ON DELETE SET NULL), `last_spin_segment_id`, `last_spin_timestamp` |
| `settings` | TEXT 'singleton' | ❌ | `max_tries_default` (3), `reward_points` (5), `event_name` |
| `awards` | UUID | ✅ | `name`, `total_quantity`, `remaining_quantity` |
| `departments` | UUID | ❌ | `name`, `faculty`, `is_active` |

RPC: `claim_random_award(p_student_id uuid) RETURNS text` — atomic, `FOR UPDATE SKIP LOCKED`. Returns prize name or NULL (no stock / already claimed).

## Segments → Screens
| ID | Name | Result Screen | Score / Behavior |
|---|---|---|---|
| s1 | Better Luck Next Time | `result-betterluck` | 0 pts, auto-dismiss 5s |
| s2 | 3 Followers + Freebee | `result-freebee` | `rewardPoints` pts + atomic prize claim |
| s3 | Question Bank | `result-question` | +10 if correct + prize claim |
| s4 | IQ Games | `result-question` | +10 if correct |
| s5 | Pitch & Communicate | `result-pitch` | 0–10 admin score, 60s timer |
| s6 | Career Questions | `result-question` | +10 if correct |
| s7 | Résumé Review | `result-resume` | 0–10 admin score, 120s timeout |

Question category strings (must match exactly): `'Question Bank'`→s3, `'IQ Games'`→s4, `'Career Questions'`→s6.

## Screen State Machine
```
States: idle | waiting | locked | result-betterluck | result-freebee | result-question | result-pitch | result-resume

Transitions:
  idle → waiting:   registerStudent() success (Realtime: active_session.current_student_id set)
  waiting → result: lastSpinResult arrives via session-realtime channel
  idle → result:    lastSpinResult arrives while idle (edge case, handled)
  result → idle:    onComplete() + spinsUsed < maxSpins
  result → locked:  onComplete() + spinsUsed >= maxSpins
  locked → idle:    user clicks "See Leaderboard"
```
`IdleRegistration` stays **mounted** (blurred) during all result screens — preserves Realtime subscriptions.

## How Screens Communicate
Admin and student communicate **exclusively through Supabase** — no direct calls between them.
Admin clicks segment → `recordSpin()` → `UPDATE active_session` → Realtime fires → `session-realtime` handler → `setLastSpinResult()` → StudentApp `useEffect` detects change → `setScreen('result-*')`. Student screen never calls APIs in response to admin actions directly.

## Realtime Channels (all subscribed in AppContext)
- `students-realtime` — `students` table (`*`) — updates student list + currentStudent state
- `awards-realtime` — `awards` table (`*`) — live prize inventory
- `session-realtime` — `active_session` (UPDATE only) — triggers screen transitions + currentStudent

**Race condition guard:** `lastProcessedSpinTs` ref. If incoming `last_spin_timestamp` equals ref value, event is skipped (prevents re-fire on Realtime reconnect). Pre-seeded from `fetchSession()` on mount so restored timestamp is already marked processed.

## Registration Logic
1. Student/faculty: lookup by `student_id` → name match + spins remaining → resume existing. Name mismatch → `'name_mismatch'`. Spins exhausted → `'max_spins'`. Not found → `insertStudent()`.
2. Others (guest): lookup by email. New guests get generated `student_id = GUEST-xxx-xxxx`.
3. Success: `setCurrentStudentId()` → Realtime fires `active_session` UPDATE → StudentApp: `'idle'` → `'waiting'`.
4. Registration.tsx: `name_mismatch` → warning toast; `max_spins` → `onLocked()` callback.

## Spin Logic
DashboardTab `handleSegmentClick(segId)`:
1. Guard: `!currentStudent || spinningRef.current` → abort. Lock `spinningRef` for 3s (prevents double-click).
2. Points: s2 only = `rewardPoints`; all others = 0.
3. `recordSpin(id, segId, points)` in AppContext: `spins_used++`, append to `spin_history[]`, `score += points`, `status = 'locked'` if `spinsUsed+1 >= maxSpins`.
4. `setSpinResultAndClearStudent(segId, segName)` — **single atomic UPDATE**: sets spin fields AND `current_student_id = NULL` together. Do not split into two calls.
5. s5 → open Pitch Score Panel in DashboardTab. s7 → open Résumé Score Panel.

## Scoring Logic
**MCQ (s3/s4/s6):** `ResultQuestion` picks question: filter by category + department, fallback to `department = NULL` shared pool. Correct answer → `updateScore(id, 10)` + `claimAward()` if `!currentStudent.awardedPrize`.

**Admin (s5/s7):** DashboardTab → `submitAdminScore(id, value, feedback)` → writes `score += value`, `pending_score = value`, `pending_feedback = text` → Realtime fires students UPDATE → `ResultPitch`/`ResultResume` detects `currentStudent.pendingScore !== null` → transitions to score display sub-state.

## Award Claim Logic
Triggers: `ResultFreebee` (always on mount) + `ResultQuestion` (correct answer + no prior prize).
1. `supabase.rpc('claim_random_award', { p_student_id })` — idempotency check, picks random award with stock `FOR UPDATE SKIP LOCKED`, decrements `remaining_quantity`, sets `students.awarded_prize`. Returns name or NULL.
2. RPC error → `claimAwardClientSide()` non-atomic fallback (known tradeoff for event-scale availability).
3. Result screen manages 3 states: `'new-award'` / `'already-awarded'` / `'no-awards'`.

## Key Code Patterns
- **Stale closure guard:** `currentStudentRef = useRef(currentStudent)` synced via effect. `handleResultComplete` uses `useCallback([])` — never add `currentStudent` to deps.
- **DB→App mapping:** Services return `Db*` (snake_case). AppContext maps via `dbStudentToStudent()`, `dbAwardToAward()`, `dbDepartmentToCustomDepartment()`. Components use camelCase app types.
- **Fire-and-forget:** `sendThankYouEmail(name, email)` never awaited, never throws. Called in `handleResultComplete` after result dismissed.
- **Batched inserts:** Questions inserted in chunks of 500 to avoid request limits.
- **Singleton UPSERT:** `settings` and `active_session` always use `INSERT ... ON CONFLICT DO UPDATE`.

## Services Reference
```
students:    fetchStudents | fetchStudentByStudentId | fetchStudentById | fetchStudentByEmail |
             insertStudent | updateStudent | deleteAllStudents
session:     fetchSession | setCurrentStudentId | setSpinResultAndClearStudent | clearSpinResult | resetSession
questions:   fetchQuestions | fetchQuestionsByDepartments | deleteAllQuestions |
             deleteQuestionsByDepartment | insertQuestions (batched 500)
awards:      fetchAwards | insertAward | deleteAward | claimRandomAward (RPC + fallback)
departments: fetchDepartments | insertDepartment | updateDepartment | deleteDepartment
settings:    fetchSettings | updateSettings (upsert)
email:       sendThankYouEmail (never throws)
```

## Types & Enums
- **status:** `'active'` (can spin) | `'locked'` (spinsUsed >= maxSpins) | `'banned'` (admin; excluded from leaderboard)
- **participant_type:** `'student'` | `'faculty'` | `'others'`
- **Built-in departments** (hardcoded in AppContext as `KNOWN_DEPARTMENTS`, not in DB): Civil, Mechanical, Electrical, Architecture, Pharmacy, Bioscience, Allied Health Sciences, Nursing, Management of Science, Basic Science & Humanities, Computer Sciences, Software Engineering

## Intentionally Non-Standard
- **No admin auth** — `?mode=admin` is the only gate. Deliberate for event-mode on a controlled network. Do not add auth unless deploying publicly.
- **Monolithic context** — No Redux/Zustand. Splitting would complicate cross-context Realtime coordination.
- **`questions.ts` is generated** — Vite plugin writes it on every dev/build start. Do not hand-edit.
- **Segment IDs are string literals** — No TypeScript enum for `'s1'`–`'s7'`. Segments never change at runtime.
- **Client-side award fallback** — Non-atomic fallback if RPC fails. Known tradeoff for availability at event scale.

## Edge Cases Already Handled — Do NOT "Fix"
| Edge Case | Guard | Mechanism |
|---|---|---|
| Same ID, different name | `registerStudent()` | Returns `'name_mismatch'`; blocks registration |
| Admin spins before student loads | AppContext session handler | `lastProcessedSpinTs` ref + atomic update |
| Double-click segment button | DashboardTab | `spinningRef` blocks for 3s |
| No questions for department | `ResultQuestion` | Falls back to `department = null` shared pool |
| No prizes in inventory | `claimAward()` | Returns null → screen shows `'no-awards'` state |
| Pitch/résumé admin never scores | Result screens | Auto-completes after 60s / 120s |
| Spin arrives mid-result-screen | StudentApp | `if (screen !== 'waiting' && screen !== 'idle') return` |
| Guest re-registration | `fetchStudentByEmail()` | Email + name match resumes existing student |
| Email failure | `email.ts` | Caught + logged, never propagates |
| RPC failure | `awards.ts` | Falls back to `claimAwardClientSide()` |
| Browser refresh mid-event | AppContext init | Restores state from `fetchSession()` on mount |

## What NOT to Change Without Reading First
- **`setSpinResultAndClearStudent()`** must stay one atomic UPDATE (spin fields + `current_student_id = NULL`). Splitting it breaks the race condition guard — result screen loses `currentStudent`.
- **`lastProcessedSpinTs` ref** — removing it causes Realtime reconnects to re-trigger result screens incorrectly.
- **`currentStudentRef` in StudentApp** — if `handleResultComplete` depends on `currentStudent` instead of ref, timer race conditions occur on auto-dismiss.
- **`FOR UPDATE SKIP LOCKED` in RPC** — removing it allows concurrent prize double-awards under load.
- **`IdleRegistration` always mounted** — unmounting during result screens destroys Realtime subscriptions.

## Adding Features

**New wheel segment:** Seed row in DB → add case in StudentApp `useEffect` (segId → screenState) → create result page in `src/pages/student/` → add to `ScreenState` type → render in StudentApp → update DashboardTab if admin action needed → update PRD.md + DATABASE.md.

**New students column:** `ALTER TABLE students ADD COLUMN IF NOT EXISTS` in `supabase-setup.sql` + run on DB → add to `DbStudent` + `Student` in AppContext → update `dbStudentToStudent()` → update `registerStudent()` call → update Registration.tsx → update ExportTab → update DATABASE.md.

**New admin tab:** Add to AdminPanel nav + state type → create `src/pages/admin/NewTab.tsx` → render in tab switch → add context values/methods if needed.

**New settings field:** Add column to `settings` table → `DbSettings` → AppContext state → load in `fetchSettings()` init → add update method → expose in `AppContextType` → add UI in SettingsTab.

## Debugging
- **Screen not transitioning after spin:** Verify `active_session` is in Realtime publication (Supabase Dashboard → Database → Replication). Check `lastProcessedSpinTs.current` is not matching the new timestamp.
- **"No questions available":** Run `SELECT DISTINCT department FROM questions` — must match `SELECT DISTINCT department FROM students` exactly. Run `fix-department-names.sql` to normalize.
- **Award `no-awards` unexpectedly:** Check `remaining_quantity > 0`. Verify: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'claim_random_award'`.
- **`currentStudent` null on result screen:** Verify `setSpinResultAndClearStudent()` is being called (not two separate DB calls).
- **Export downloads empty file:** Verify `students` state is loaded in context.
- **Custom depts not in registration:** Check `is_active = true` and `departments` table exists (run migration SQL).

## Environment & Build
```env
VITE_SUPABASE_URL=https://xxx.supabase.co   # required
VITE_SUPABASE_ANON_KEY=eyJ...               # required
RESEND_EMAIL_KEY=re_xxxx                     # optional — thank-you emails
```
- `npm run dev` / `npm run build` — both run `questionsGeneratorPlugin`: reads 12 CSVs from `public/questions/`, writes `src/data/questions.ts` (10 questions/category/dept, 360 total).
- `npm run import:bundled-questions` — imports all CSVs directly into live Supabase DB (`scripts/import-bundled-questions.mjs`).
- **DB setup order:** `supabase-setup.sql` → `supabase-departments-migration.sql` → `fix-department-names.sql` (only if migrating) → Admin UI: Settings → Import All Bundled Questions.
- **Edge function:** `supabase functions deploy send-thankyou-email` + `supabase secrets set RESEND_EMAIL_KEY=...`

## Component Responsibilities (Quick Ref)
| Component | Business Logic |
|---|---|
| `StudentApp` | Screen state machine — reads `lastSpinResult` + `currentStudent`, transitions states |
| `Registration` | Calls `registerStudent()`, handles `name_mismatch` / `max_spins` errors |
| `ResultQuestion` | Calls `updateScore()` + `claimAward()` on correct answer |
| `ResultFreebee` | Calls `claimAward()` on mount, manages 3 award sub-states |
| `ResultPitch` | Watches `pendingScore` for admin score arrival; 60s auto-dismiss |
| `ResultResume` | Same as ResultPitch, 120s timeout |
| `DashboardTab` | Calls `recordSpin()` + `submitAdminScore()`; owns score panels |
| `SettingsTab` | CSV parsing + `refreshQuestions()`, `addAward()`, `removeAward()`, settings updates |