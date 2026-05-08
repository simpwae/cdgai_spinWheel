# Architecture — EduWheel (CDGAI Career Fair Spin Wheel)

> Single-page React app. Two views from one URL: student kiosk (`/`) and admin panel (`/?mode=admin`). All communication flows through Supabase Realtime — no direct inter-device messaging.

## System Overview
```
Physical World           App Layer                    Supabase
──────────────           ─────────────────────────    ──────────────────
Student registers  →   INSERT students             →  Realtime → kiosk updates
Staff spins wheel  →   UPDATE active_session       →  Realtime → kiosk transitions
Staff scores pitch →   UPDATE students.pending_score→ Realtime → score displayed
```

## High-Level Architecture
```
Browser (React SPA)
├── AppContext (global state + 3 Realtime channels + all business logic methods)
│   ├── students[] | currentStudent | segments[] | questions[] | awards[]
│   ├── lastSpinResult | maxTriesDefault | rewardPoints | eventName | customDepartments[]
│   ├── Realtime: students-realtime | awards-realtime | session-realtime
│   └── Methods: registerStudent() | recordSpin() | submitAdminScore() | claimAward() | ...
│
├── StudentApp (screen state machine)
│   ├── IdleRegistration (leaderboard + registration form — always mounted)
│   ├── WaitingForSpin | LockedScreen
│   └── ResultBetterLuck | ResultFreebee | ResultQuestion | ResultPitch | ResultResume
│
└── AdminPanel (?mode=admin)
    ├── DashboardTab (spin control + score panels + charts)
    ├── StudentsTab | CategoriesTab | SettingsTab | ExportTab
    └── (all tabs share AppContext — see same live state as student screen)

Services Layer (pure async functions, no React state)
├── students.ts | session.ts | questions.ts | awards.ts
└── segments.ts | departments.ts | settings.ts | email.ts

          ↕ HTTPS (REST + WebSocket)

Supabase
├── PostgreSQL: students | segments | questions | awards | active_session | settings | departments
├── Realtime (WAL CDC): students, active_session, awards
├── Edge Function (Deno): send-thankyou-email → Nodemailer → SMTP
└── RLS: anon full access (event-mode; see Security section for hardening)
```

## Frontend Architecture
- **Framework:** React 18 + TypeScript 5.5, built by Vite 5. Strict SPA — single `index.html`.
- **Styling:** Tailwind CSS 3.4, utility classes only. Custom tokens: `cdgai-dark`, `cdgai-maroon` (#C8102E), `cdgai-accent`.
- **Animation:** Framer Motion 11 — `AnimatePresence` for screen transitions, `layout` for leaderboard reordering, SVG animations for SpinWheel and CountdownTimer.
- **Mode detection:** `new URLSearchParams(location.search).get('mode') === 'admin'` in `AppContent` — no lazy loading, both interfaces in same bundle.

## State Management
All state in one `AppContext` (no Redux/Zustand). Co-locating Realtime subscriptions with state eliminates stale-closure bugs. Update pattern: write to DB → Realtime fires → context handler updates local state. App does NOT optimistically update — waits for Realtime confirmation. Exception: `lastSpinResult` is set directly from the Realtime payload.

```
AppContext
├── useState: students[], currentStudent, segments[], questions[], awards[],
│            lastSpinResult, maxTriesDefault, rewardPoints, eventName, customDepartments[]
├── useMemo:  leaderboard (sorted students[])
├── useRef:   lastProcessedSpinTs (Realtime dedup guard)
└── useCallback: registerStudent() | recordSpin() | submitAdminScore() | claimAward()
                 resetSessionData() | banStudent() | editTries() | ... (20+ methods)
```

Static question data: `src/data/questions.ts` is generated at build time from CSVs — zero DB latency for built-in departments. Custom dept questions are fetched from Supabase on init into `questions[]`.

## Realtime Architecture — 3 Channels

**`students-realtime`** (`students` table, all events):
INSERT → append to `students[]` (dedup by id). UPDATE → patch matching student; also update `currentStudent` if ID matches. DELETE → remove from `students[]`; null `currentStudent` if ID matches.

**`awards-realtime`** (`awards` table, all events): mirrors INSERT/UPDATE/DELETE into `awards[]`.

**`session-realtime`** (`active_session`, UPDATE only):
- If `last_spin_timestamp` is new (≠ `lastProcessedSpinTs.current`): set `lastSpinResult`, mark timestamp processed. Do NOT null `currentStudent` (result screens need it).
- If `current_student_id` changed with no new spin: set/null `currentStudent` accordingly.

**Race condition guard — Spin + Clear Student:**
`setSpinResultAndClearStudent()` is one atomic SQL UPDATE setting spin fields AND `current_student_id = NULL` simultaneously → fires one Realtime event. AppContext handler: if payload has a new spin timestamp, it sets `lastSpinResult` but does NOT null `currentStudent`. If the two were separate calls, the student-clear event would arrive first and result screens would lose the student reference.

## Screen State Machine (StudentApp)
```
'idle' (IdleRegistration: leaderboard + form)
  → 'waiting' (WaitingForSpin)         on registerStudent() success
  → 'result-*'                          on lastSpinResult via Realtime (if idle, handled as edge case)

'waiting'
  → 'result-betterluck' (s1)            auto-dismiss 5s
  → 'result-freebee'    (s2)            prize claim + rewardPoints
  → 'result-question'   (s3/s4/s6)      MCQ + 90s timer + score
  → 'result-pitch'      (s5)            60s timer + admin score via pending_score
  → 'result-resume'     (s7)            120s timeout + admin score via pending_score

'result-*' → 'idle'     on onComplete() if spinsUsed < maxSpins
'result-*' → 'locked'   on onComplete() if spinsUsed >= maxSpins
'locked'   → 'idle'     user clicks "See Leaderboard"
```
`IdleRegistration` stays **mounted and blurred** behind all result overlays (z-50) — prevents Realtime subscription teardown during result screens.

## Registration Flow
```
Student fills form → registerStudent()
  → fetchStudentByStudentId()   (or fetchStudentByEmail() for guests)
  → Match: name OK + spins left → setCurrentStudentId() → Realtime → 'waiting'
  → Match: name mismatch        → return 'name_mismatch' → toast in Registration.tsx
  → Match: spins exhausted      → return 'max_spins' → onLocked() callback
  → No match: insertStudent() → setCurrentStudentId() → Realtime → 'waiting'
  Guest: generated student_id (format GUEST-xxx-xxxx), lookup by email
```

## Spin Flow
```
Admin clicks segment → DashboardTab.handleSegmentClick(segId)
  → Guard: !currentStudent; spinningRef.current → abort
  → spinningRef = true (3s debounce)
  → Points: s2 = rewardPoints, all others = 0
  → recordSpin(id, segId, pts): spins_used++, spin_history.push(segId), score+=pts,
      status='locked' if spinsUsed+1 >= maxSpins, → updateStudent()
  → setSpinResultAndClearStudent(segId, segName)  ← single atomic UPDATE
  → Realtime fires → StudentApp setScreen('result-*')
  → s5 → open Pitch Score Panel | s7 → open Résumé Score Panel
```

## Scoring
**MCQ (s3/s4/s6):** `ResultQuestion` selects question (category filter + dept filter, null-dept fallback). Correct → `updateScore(id, 10)` + `claimAward()` if no prior prize.

**Admin (s5/s7):** `submitAdminScore(id, value, feedback)` → writes `score+=value`, `pending_score=value`, `pending_feedback=text` → Realtime fires students UPDATE → `ResultPitch`/`ResultResume` detects `pendingScore !== null` → transitions to score display sub-state.

## Award Claim
`claimAward()` → `supabase.rpc('claim_random_award', { p_student_id })`:
PostgreSQL RPC: idempotency check (already has prize → return null) → `SELECT ... FOR UPDATE SKIP LOCKED` (concurrency safe) → decrement `remaining_quantity` → set `students.awarded_prize` → return name.
RPC failure → `claimAwardClientSide()` non-atomic fallback. Result screens manage: `'new-award'` / `'already-awarded'` / `'no-awards'`.

## Build-Time Question Generation
`vite.config.ts` `questionsGeneratorPlugin.buildStart()` runs on every dev/build: reads 12 CSVs from `public/questions/`, picks 10 questions/category/dept (30/dept, 360 total), writes `src/data/questions.ts` as `QUESTIONS_BY_DEPT: Record<Dept, Record<Category, Question[]>>`. Zero network latency for built-in departments at event time.

## Services Layer
Pure async functions, return `Db*` types (snake_case). AppContext converts to camelCase via `dbStudentToStudent()`, `dbAwardToAward()`, `dbDepartmentToCustomDepartment()`. No React state or context imports in services.

```
students.ts  fetchStudents | fetchStudentByStudentId | fetchStudentById | fetchStudentByEmail |
             insertStudent | updateStudent | deleteAllStudents
session.ts   fetchSession | setCurrentStudentId | setSpinResultAndClearStudent | clearSpinResult | resetSession
questions.ts fetchQuestions | fetchQuestionsByDepartments | deleteAllQuestions |
             deleteQuestionsByDepartment | insertQuestions (batched 500)
awards.ts    fetchAwards | insertAward | deleteAward | claimRandomAward (RPC + client fallback)
departments  fetchDepartments | insertDepartment | updateDepartment | deleteDepartment
settings.ts  fetchSettings | updateSettings (upsert)
email.ts     sendThankYouEmail (fire-and-forget, never throws)
```

## Database Layer
Two singleton tables use fixed PK `'singleton'` + UPSERT semantics: `active_session` and `settings`. Realtime enabled on: `students`, `active_session`, `awards` (via `supabase_realtime` publication). Questions batched 500/insert to stay within Supabase request limits. `claim_random_award` RPC uses `FOR UPDATE SKIP LOCKED` for thread-safe concurrent claims.

## Edge Function
`supabase/functions/send-thankyou-email/index.ts` (Deno): HTML-escapes `name` (XSS prevention) → builds branded HTML template (Bebas Neue + DM Sans, #C8102E header) → sends via Nodemailer. Invoked fire-and-forget from `StudentApp.handleResultComplete()`. Returns CORS headers for `*`.

## Security
| Control | Implementation |
|---|---|
| SQL injection | Supabase client uses parameterized queries only |
| XSS in email | `name` HTML-escaped in Edge Function before template embedding |
| Concurrent prize claims | `FOR UPDATE SKIP LOCKED` in `claim_random_award` RPC |
| Duplicate registration | `UNIQUE` constraint on `students.student_id` |
| Award double-claim | Idempotency check at top of RPC function |
| Admin access | URL secrecy (`?mode=admin`); appropriate for monitored event LAN |

**Hardening for public/internet deployments:** Add Supabase Auth gating `?mode=admin`. Restrict write RLS policies to `authenticated` role. Rate-limit registration. Rotate Anon Key after each event. Enable Supabase network restrictions to venue IP range.

## Deployment
```
npm run build → dist/ (static SPA)
Deploy dist/ to Cloudflare Pages / Netlify / Vercel
Set env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

supabase functions deploy send-thankyou-email
supabase secrets set RESEND_EMAIL_KEY=your-key

DB setup order:
  1. supabase-setup.sql                  ← tables, seeds, RLS, Realtime (idempotent)
  2. supabase-departments-migration.sql  ← adds departments table
  3. fix-department-names.sql            ← only if migrating data with name casing issues
  4. Admin UI: Settings → Import All Bundled Questions
```

## Key Architectural Decisions
| Decision | Rationale |
|---|---|
| Single monolithic AppContext | Realtime handlers read/write multiple state slices simultaneously; splitting creates cross-context coordination complexity |
| Realtime for admin→student comms | Built into Supabase; DB is source of truth; state recoverable on refresh with no extra infrastructure |
| Atomic spin-and-clear UPDATE | Two separate UPDATEs → two Realtime events → race condition; one UPDATE → one event → no race |
| Build-time question generation | Zero network latency for built-in depts; offline fallback if Supabase unreachable at event start |
| No admin auth | Career fair booth is physically monitored; auth adds friction with minimal security benefit on closed LAN |
| Singleton active_session / settings | One booth, one row; UPSERT semantics simpler than row management; extend PK to booth ID for multi-booth |
| Client-side award fallback | RPC is correct path (99.9% of cases); fallback prevents full award failure if function dropped accidentally |