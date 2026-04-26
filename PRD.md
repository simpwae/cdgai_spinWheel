# Product Requirements Document

## CDGAI Spin Wheel — Career Fair Interactive Engagement App

**Version:** 1.0  
**Date:** April 26, 2026  
**Status:** Draft — For Review & Editing

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack & Infrastructure](#2-tech-stack--infrastructure)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [User Roles](#5-user-roles)
6. [Application Modes & Routing](#6-application-modes--routing)
7. [Global State (AppContext)](#7-global-state-appcontext)
8. [Data Flows](#8-data-flows)
9. [Student-Facing Pages (StudentApp)](#9-student-facing-pages-studentapp)
10. [Admin Pages (AdminPanel)](#10-admin-pages-adminpanel)
11. [Shared Components](#11-shared-components)
12. [Services Layer](#12-services-layer)
13. [Question Import System](#13-question-import-system)
14. [Realtime Synchronization](#14-realtime-synchronization)
15. [Spin Segments & Scoring](#15-spin-segments--scoring)
16. [Awards & Prize System](#16-awards--prize-system)
17. [Export System](#17-export-system)
18. [Security & Access Control](#18-security--access-control)
19. [Known Constraints & Edge Cases](#19-known-constraints--edge-cases)

---

## 1. Product Overview

The CDGAI Spin Wheel is a real-time interactive kiosk application used at career fairs. Students approach a physical booth and register on a monitor (the "student view"). A staff member at the booth spins a physical wheel and then records the result on a separate admin tablet/laptop (the "admin view"). The student's monitor instantly transitions to the appropriate result screen — showing questions, scores, or prize claims — driven by Supabase Realtime pub/sub.

### Core Value Proposition

- Creates a gamified, engaging experience at career fair booths.
- Collects structured student data (ID, faculty, department, contact info).
- Rewards students with prizes, scores, and leaderboard rankings.
- Provides admins with live operational control and post-session data export.

### High-Level User Journey

1. Student walks up → sees live leaderboard on screen → fills in registration form.
2. Admin confirms the student is ready → spins a physical wheel.
3. Admin clicks the matching segment on their dashboard.
4. Student screen instantly shows the result (question, pitch timer, freebee, résumé review, or better luck).
5. If applicable, admin scores the student; score appears on student screen in real time.
6. Result screen auto-dismisses → student returns to leaderboard/idle state.

---

## 2. Tech Stack & Infrastructure

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Frontend Framework | React 18 (TypeScript)                           |
| Build Tool         | Vite 5                                          |
| Styling            | Tailwind CSS 3.4 with custom design tokens      |
| Animation          | Framer Motion 11                                |
| Icons              | Lucide React 0.522                              |
| Routing            | React Router DOM v6                             |
| Backend / Database | Supabase (PostgreSQL + Realtime + RLS)          |
| Supabase Client    | @supabase/supabase-js v2                        |
| Spreadsheet        | xlsx 0.18 (import + export)                     |
| CSS Processing     | PostCSS                                         |
| Linting            | ESLint with react-hooks + react-refresh plugins |

### Environment Variables Required

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

Both are read at module load time in `src/lib/supabase.ts`. App throws if either is missing.

### Design Tokens (Tailwind custom theme)

- `bg-cdgai-dark` — dark background
- `bg-cdgai-maroon` — primary brand maroon
- `text-cdgai-accent` — accent text color
  These are defined in `tailwind.config.js`.

---

## 3. Folder Structure

```
d:\cdgai_spinWheel\
├── index.html                      # SPA shell; mounts React at #root; title = "CDGAI Spin Wheel App"
├── package.json                    # Dependencies, scripts
├── vite.config.ts                  # Vite build config (minimal, only react plugin)
├── tailwind.config.js              # Custom design tokens
├── postcss.config.js               # PostCSS config
├── tsconfig.json / tsconfig.node.json
├── supabase-setup.sql              # Full DDL + seed + RLS + realtime setup
├── public/
│   └── questions/                  # 12 bundled CSV question banks (one per department)
│       ├── All_departments.csv
│       ├── Allied Heath Sciences Question Bank (1).csv
│       ├── Architecuture_Mcqs - Architecture.csv
│       ├── BioScience-Re - Bioscience MCQs.csv
│       ├── BSH_MCQs.csv
│       ├── Civil_Engineering_MCQs_200.csv
│       ├── Computer_Science_MCQs_200.csv
│       ├── Electrical_Engineering_MCQs_200.csv
│       ├── Management_Sciences_MCQs_200.csv
│       ├── Mechanical_MCQs_200.csv
│       ├── nursing_200_mcqs.csv
│       ├── pharmacy_200_mcqs.csv
│       └── Software eng_200_mcqs.csv
├── scripts/
│   └── import-bundled-questions.mjs  # Node script for CLI question import
└── src/
    ├── App.tsx                     # Root component: routing + mode switching
    ├── index.css                   # Global Tailwind base styles
    ├── index.tsx                   # React root mount
    ├── vite-env.d.ts               # Vite env type declarations
    ├── components/
    │   ├── SpinWheel.tsx           # Animated SVG wheel component
    │   ├── CountdownTimer.tsx      # Circular SVG countdown timer
    │   ├── Leaderboard.tsx         # Live filterable leaderboard table
    │   └── Logo.tsx                # CDGAI brand logo component
    ├── context/
    │   └── AppContext.tsx          # Global state + all business logic (~700 lines)
    ├── lib/
    │   ├── supabase.ts             # Singleton Supabase client
    │   └── database.types.ts       # TypeScript interfaces for all DB tables
    ├── pages/
    │   ├── admin/
    │   │   ├── AdminPanel.tsx      # Admin shell with sidebar nav
    │   │   ├── DashboardTab.tsx    # Operational spin control
    │   │   ├── StudentsTab.tsx     # Student management table
    │   │   ├── SettingsTab.tsx     # Settings, import, awards
    │   │   └── ExportTab.tsx       # Excel export
    │   └── student/
    │       ├── StudentApp.tsx      # Student screen controller/router
    │       ├── IdleLeaderboard.tsx # Idle screen with leaderboard + registration
    │       ├── WaitingForSpin.tsx  # Post-registration waiting screen
    │       ├── LockedScreen.tsx    # Max spins reached screen
    │       ├── ResultBetterLuck.tsx
    │       ├── ResultFreebee.tsx
    │       ├── ResultQuestion.tsx
    │       ├── ResultPitch.tsx
    │       └── ResultResume.tsx
    └── services/
        ├── students.ts             # Student CRUD
        ├── session.ts              # active_session singleton operations
        ├── segments.ts             # Segment read
        ├── questions.ts            # Question CRUD + pagination
        ├── awards.ts               # Award CRUD + atomic claim RPC
        └── settings.ts             # Settings read + upsert
```

---

## 4. Database Schema

### 4.1 `students` Table

| Column             | Type                  | Notes                                                 |
| ------------------ | --------------------- | ----------------------------------------------------- |
| `id`               | UUID PK               | Auto-generated                                        |
| `name`             | TEXT                  | Student's full name                                   |
| `student_id`       | TEXT UNIQUE           | University-format ID (e.g., CS-001-2024)              |
| `email`            | TEXT                  | Optional (used for guest registration)                |
| `phone`            | TEXT                  | Optional (used for guest registration)                |
| `faculty`          | TEXT                  | Faculty name                                          |
| `department`       | TEXT                  | Department name                                       |
| `score`            | INTEGER DEFAULT 0     | Accumulated points                                    |
| `spins_used`       | INTEGER DEFAULT 0     | How many spins the student has used                   |
| `max_spins`        | INTEGER DEFAULT 3     | Max allowed spins (configurable per student)          |
| `status`           | TEXT                  | `'active'` / `'locked'` / `'banned'`                  |
| `spin_history`     | TEXT[]                | Array of segment IDs (e.g., `['s1', 's3']`)           |
| `reward_claimed`   | BOOLEAN DEFAULT false | General reward claimed flag                           |
| `awarded_prize`    | TEXT                  | Name of prize claimed via claimRandomAward            |
| `pending_score`    | INTEGER               | Score pending display (set by admin for pitch/resume) |
| `pending_feedback` | TEXT                  | Feedback text pending display                         |
| `created_at`       | TIMESTAMPTZ           | Auto                                                  |

**Realtime enabled:** Yes (`supabase_realtime` publication)

### 4.2 `segments` Table (static, seeded)

| Column  | Type       |
| ------- | ---------- |
| `id`    | TEXT PK    |
| `name`  | TEXT       |
| `color` | TEXT (hex) |

**7 seeded segments:**

| ID  | Name                  | Color              |
| --- | --------------------- | ------------------ |
| s1  | Better Luck Next Time | `#6B7280` (gray)   |
| s2  | 3 Followers + Freebee | `#D97706` (amber)  |
| s3  | Question Bank         | `#7C3AED` (purple) |
| s4  | IQ Games              | `#0D9488` (teal)   |
| s5  | Pitch & Communicate   | `#EA580C` (orange) |
| s6  | Career Questions      | `#2563EB` (blue)   |
| s7  | Résumé Review         | `#16A34A` (green)  |

**Realtime enabled:** No (static data)

### 4.3 `questions` Table

| Column                 | Type          | Notes                                                   |
| ---------------------- | ------------- | ------------------------------------------------------- |
| `id`                   | UUID PK       |                                                         |
| `category`             | TEXT          | One of: `Question Bank`, `IQ Games`, `Career Questions` |
| `department`           | TEXT NULLABLE | Department scope; null = all departments                |
| `text`                 | TEXT          | Question content                                        |
| `options`              | TEXT[]        | Array of 4 answer strings                               |
| `correct_answer_index` | INTEGER       | 0-based index into `options`                            |

**Realtime enabled:** No

### 4.4 `active_session` Table (singleton)

| Column                   | Type               | Notes                                            |
| ------------------------ | ------------------ | ------------------------------------------------ |
| `id`                     | TEXT PK            | Always `'singleton'`                             |
| `current_student_id`     | UUID FK → students | Student currently at booth; null if nobody       |
| `last_spin_segment_id`   | TEXT FK → segments | Most recent spin result                          |
| `last_spin_segment_name` | TEXT               | Denormalized for faster display                  |
| `last_spin_timestamp`    | BIGINT             | Unix epoch ms; used for dedup of realtime events |
| `updated_at`             | TIMESTAMPTZ        |                                                  |

**Realtime enabled:** Yes

### 4.5 `settings` Table (singleton)

| Column              | Type              | Notes                                   |
| ------------------- | ----------------- | --------------------------------------- |
| `id`                | TEXT PK           | Always `'singleton'`                    |
| `max_tries_default` | INTEGER DEFAULT 3 | Default max spins for new students      |
| `reward_points`     | INTEGER DEFAULT 5 | Points awarded for segment s2 (Freebee) |
| `event_name`        | TEXT              | Event name displayed in admin UI        |

**Realtime enabled:** No

### 4.6 `awards` Table

| Column               | Type        |
| -------------------- | ----------- |
| `id`                 | UUID PK     |
| `name`               | TEXT        |
| `total_quantity`     | INTEGER     |
| `remaining_quantity` | INTEGER     |
| `created_at`         | TIMESTAMPTZ |

**Realtime enabled:** Yes

### 4.7 `claim_random_award(p_student_id uuid)` RPC (PostgreSQL Function)

Atomic prize claim. Steps:

1. Check if student already has `awarded_prize` → return existing prize.
2. Lock a random award row where `remaining_quantity > 0` using `FOR UPDATE SKIP LOCKED`.
3. Decrement `remaining_quantity` by 1.
4. Update `students.awarded_prize` with the award name.
5. Return the award name, or `null` if none available.

---

## 5. User Roles

### 5.1 Student (Kiosk User)

- Interacts with the student-facing display (monitor/TV at the booth).
- Registers their information (name, ID, faculty, department).
- Views the spin wheel, result screens, and leaderboard.
- No direct access to admin functions.

### 5.2 Guest (Kiosk User)

- Same as student but registers with name, email, and phone only (no university ID, faculty, or department required).
- Does not appear in department-filtered leaderboard views.

### 5.3 Booth Admin (Staff)

- Uses the admin panel (`?mode=admin` URL) on a separate device (tablet/laptop).
- Registers spin results by clicking segment buttons.
- Scores pitch and résumé submissions.
- Manages student records (ban, adjust tries, add manual scores).
- Imports/manages question banks.
- Manages prizes/awards.
- Exports session data.
- No authentication — access is controlled by keeping the URL secret.

---

## 6. Application Modes & Routing

### 6.1 Routing Structure

The app uses React Router v6 with a single route at `/`. Mode switching is done via URL query parameter.

```
URL: /             → StudentApp (kiosk/monitor view)
URL: /?mode=admin  → AdminPanel (staff control view)
```

### 6.2 Mode Detection (`App.tsx`)

```
AppProvider (global context)
  └── Router (react-router-dom)
        └── Routes
              └── Route path="/"
                    ├── if ?mode=admin → <AdminPanel>
                    └── else           → <StudentApp>
```

No authentication guard — mode is purely URL-based.

---

## 7. Global State (AppContext)

### 7.1 Overview

`src/context/AppContext.tsx` is the single source of truth. All state lives here. All business logic methods are exposed via context. Every page/component reads from this context.

### 7.2 State Variables

| Variable          | Type                                   | Description                                     |
| ----------------- | -------------------------------------- | ----------------------------------------------- | ------------------------------ |
| `students`        | `Student[]`                            | All registered students, sorted by score        |
| `currentStudent`  | `Student                               | null`                                           | Student currently at the booth |
| `segments`        | `Segment[]`                            | Wheel segments from DB                          |
| `questions`       | `Question[]`                           | Full question bank                              |
| `awards`          | `Award[]`                              | Prize inventory                                 |
| `lastSpinResult`  | `{ segmentId, segmentName, timestamp } | null`                                           | Latest spin outcome            |
| `maxTriesDefault` | `number`                               | Read from `settings` table on init (default: 3) |
| `rewardPoints`    | `number`                               | Read from `settings` table on init (default: 5) |
| `eventName`       | `string`                               | Read from `settings` table on init              |

**Derived:**

- `leaderboard` — `useMemo` sorted by score descending (recomputes on student changes).

**Refs:**

- `lastProcessedSpinTs` — prevents double-processing of spin realtime events.

### 7.3 Types & Constants

**`FACULTY_DEPARTMENTS`** — maps 3 faculties to their departments:

- Faculty of Engineering: Civil Engineering, Electrical Engineering, Mechanical Engineering
- Faculty of Life Sciences & Medicine: Allied Health Sciences, Bioscience, BSH, Nursing, Pharmacy
- Faculty of Computing & Management: Computer Science, Software Engineering, Management Sciences, Architecture

**`Student` interface** (app-layer, camelCase):
`id`, `name`, `email`, `phone`, `faculty`, `department`, `studentId`, `score`, `spinsUsed`, `maxSpins`, `status`, `spinHistory[]`, `rewardClaimed`, `awardedPrize`, `pendingScore`, `pendingFeedback`

### 7.4 Initialization (on mount)

`Promise.all` fetches in parallel:

- `fetchStudents()` → sets `students`
- `fetchSegments()` → sets `segments`
- `fetchQuestions()` → sets `questions`
- `fetchSession()` → restores `currentStudent` and marks existing spin timestamp as already-processed
- `fetchAwards()` → sets `awards`
- `fetchSettings()` → sets `maxTriesDefault`, `rewardPoints`, `eventName`

### 7.5 Context Methods

| Method                                                                | Description                                                                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `registerStudent(name, studentId, email, phone, faculty, department)` | Validates existing student_id; handles name mismatch and max spins; inserts new student; sets session. Returns `{ success, error?, student? }` |
| `setCurrentStudent(student                                            | null)`                                                                                                                                         | Updates local state + `active_session.current_student_id` |
| `recordSpin(studentId, segmentId, points)`                            | Increments spinsUsed, locks student if max reached, appends spin_history, adds points, atomically updates active_session                       |
| `updateScore(studentId, points)`                                      | Adds points to student score (used for correct question answers)                                                                               |
| `markRewardClaimed(studentId)`                                        | Sets `reward_claimed = true`                                                                                                                   |
| `submitAdminScore(studentId, score, feedback?)`                       | Sets pending_score + pending_feedback on student                                                                                               |
| `resetLeaderboard()`                                                  | Wipes all students + resets session + clears local state                                                                                       |
| `clearSpinResult()`                                                   | Nulls lastSpinResult locally and in DB                                                                                                         |
| `banStudent(studentId)`                                               | Sets status = 'banned'                                                                                                                         |
| `unbanStudent(studentId)`                                             | Restores status to 'active' or 'locked' based on spinsUsed vs maxSpins                                                                         |
| `editTries(studentId, newMaxSpins)`                                   | Updates max_spins and recalculates status                                                                                                      |
| `addAward(name, quantity)`                                            | Inserts award to DB + local state                                                                                                              |
| `removeAward(id)`                                                     | Deletes award from DB + local state                                                                                                            |
| `claimAward(studentId)`                                               | Calls atomic RPC; falls back to client-side claim; updates local state                                                                         |
| `refreshQuestions()`                                                  | Re-fetches all questions from DB                                                                                                               |
| `refreshAwards()`                                                     | Re-fetches all awards from DB                                                                                                                  |
| `updateMaxTriesDefault(value)`                                        | Upserts `max_tries_default` in settings table + updates local state                                                                            |
| `updateRewardPoints(value)`                                           | Upserts `reward_points` in settings table + updates local state                                                                                |
| `updateEventName(value)`                                              | Upserts `event_name` in settings table + updates local state                                                                                   |

---

## 8. Data Flows

### 8.1 Student Registration Flow

```
Student fills IdleLeaderboard form
  → validation (client-side: required fields, ID format, email format)
  → registerStudent() called
    → fetchStudentByStudentId() — check for existing ID
      IF exists AND name matches AND spins not exhausted:
        → setCurrentStudentId() in session
        → return { success: true, student: existingStudent }
      IF exists AND name mismatch:
        → return { success: false, error: 'name_mismatch' }
      IF exists AND max spins exhausted:
        → return { success: false, error: 'max_spins' }
      IF new student:
        → insertStudent() — creates record
        → setCurrentStudentId() in session — sets active_session.current_student_id
  → Supabase Realtime fires UPDATE on active_session to ALL clients
    → Admin panel DashboardTab shows currentStudent card
    → Student screen IdleLeaderboard receives onComplete() callback
      → StudentApp transitions to 'waiting' screen (WaitingForSpin)
```

### 8.2 Spin Registration Flow (Admin → Student)

```
Admin (DashboardTab) clicks a segment button
  → recordSpin(currentStudent.id, segmentId, points) called
    → updateStudent() — increments spinsUsed, updates spinHistory, adds points, sets status
    → setSpinResultAndClearStudent() — atomically:
        sets active_session.last_spin_segment_id/name/timestamp
        sets active_session.current_student_id = null
  → Supabase Realtime fires UPDATE on active_session to ALL clients
    → StudentApp context handler:
        detects new last_spin_timestamp → sets lastSpinResult
        does NOT clear currentStudent locally (result screens need it)
    → StudentApp screen transition logic:
        s1 → 'result-betterluck'
        s2 → 'result-freebee'
        s3 / s4 / s6 → 'result-question' (with segmentName)
        s5 → 'result-pitch'
        s7 → 'result-resume'
  → WaitingForSpin is replaced by the result screen
```

### 8.3 Pitch/Résumé Scoring Flow (Admin → Student)

```
Admin sees Pitch Score Panel (shown after clicking s5)
  → Slides score (0-10) + optional feedback
  → Clicks "Submit Score"
    → submitAdminScore(studentId, score, feedback) called
      → updateStudent() — sets pending_score + pending_feedback
  → Supabase Realtime fires UPDATE on students to ALL clients
    → AppContext students-realtime handler updates currentStudent
      → ResultPitch/ResultResume detects pendingScore !== undefined
        → transitions from "waiting for judge" sub-state to "score display" sub-state
```

### 8.4 Result Dismissal Flow (Student → Idle)

```
Result screen auto-timer fires (or user clicks button)
  → onComplete() called in StudentApp
    → reads currentStudentRef (ref to avoid stale closure)
    → setCurrentStudent(null)
      → UPDATE active_session.current_student_id = null
    → if student.status === 'locked': screen → 'locked'
    → else: screen → 'idle'
      → StudentApp renders IdleLeaderboard again
```

### 8.5 Award Claim Flow

```
ResultFreebee / ResultQuestion (correct answer) mounts
  → claimAward(currentStudent.id) called
    → claimRandomAward(studentId) → tries RPC first
      → RPC: checks awarded_prize; picks random available award; decrements quantity; sets awarded_prize
      → Returns prize name or null
    → Fallback: client-side claim if RPC fails
  → awardState set to 'new-award' / 'already-awarded' / 'no-awards'
  → UI renders appropriate state
  → Supabase Realtime fires UPDATE on awards + students to ALL clients
    → AppContext updates local awards + students
```

---

## 9. Student-Facing Pages (StudentApp)

### 9.1 StudentApp (`src/pages/student/StudentApp.tsx`)

**Role:** Master screen controller for the kiosk/monitor display.

**Screen States:**
| State | Trigger | Rendered Component |
|---|---|---|
| `'idle'` | Default; after result completion | `IdleLeaderboard` (full-screen) |
| `'waiting'` | `currentStudent` set via realtime | `WaitingForSpin` |
| `'locked'` | Student has used all spins | `LockedScreen` |
| `'result-betterluck'` | `lastSpinResult.segmentId === 's1'` | `ResultBetterLuck` (overlay on blurred leaderboard) |
| `'result-freebee'` | `lastSpinResult.segmentId === 's2'` | `ResultFreebee` (overlay) |
| `'result-question'` | `lastSpinResult.segmentId` in `['s3','s4','s6']` | `ResultQuestion` (overlay) |
| `'result-pitch'` | `lastSpinResult.segmentId === 's5'` | `ResultPitch` (overlay) |
| `'result-resume'` | `lastSpinResult.segmentId === 's7'` | `ResultResume` (overlay) |

**Rendering Architecture:**

- `IdleLeaderboard` is always mounted when screen is `'idle'` OR any result state.
- During result states, `IdleLeaderboard` renders behind result overlays with `blur-md brightness-75` CSS for a blurred-backdrop effect.
- Result screens are `position: absolute z-50` overlays.
- `WaitingForSpin` and `LockedScreen` replace the entire screen.

**Keyboard Shortcuts (development/demo only):**
`2` → waiting | `3` → idle | `4` → locked | `5` → better luck | `6` → freebee | `7` → question | `8` → pitch | `9` → resume

**Props passed down:**

- `IdleLeaderboard` receives `onComplete` (→ transition to waiting) and `onLocked` (→ transition to locked).
- All result screens receive `onComplete` (→ transition back to idle/locked).
- `ResultQuestion` also receives `segmentName` for question category filtering.
- `ResultBetterLuck` receives `triesLeft: number`.

---

### 9.2 IdleLeaderboard (`src/pages/student/IdleLeaderboard.tsx`)

**Role:** Primary idle/registration screen split into leaderboard (left) + registration form (right).

**Layout:**

- Desktop: 60% left = live leaderboard, 40% right = maroon-branded registration panel.
- Mobile: Registration panel full-width; leaderboard hidden.

**Branding Panel:**

- Logo component (xl size) + event name.
- Animated tagline rotation: 3 taglines cycling every 4 seconds via `AnimatePresence` fade.
- Registration form below.

**Registration Form — Student Mode:**
| Field | Validation |
|---|---|
| Name | Required |
| University ID | Required; regex `/^[A-Za-z]{2,4}-\d{3,4}-\d{4}$/` |
| Faculty | Required; select from 3 faculties |
| Department | Required; auto-filtered by selected faculty |
| Email | Hidden in student mode |
| Phone | Hidden in student mode |

**Registration Form — Guest Mode:**
| Field | Validation |
|---|---|
| Name | Required |
| Email | Required; valid email format |
| Phone | Required |
| University ID / Faculty / Dept | Hidden |

**Submit Behavior:**

1. Client-side validation → show inline field errors.
2. Call `registerStudent()`.
3. Handle return:
   - `name_mismatch` → show warning toast (ID exists but different name).
   - `max_spins` → call `onLocked()`.
   - success → call `onComplete()`.

---

### 9.3 WaitingForSpin (`src/pages/student/WaitingForSpin.tsx`)

**Role:** Full-screen waiting room shown after registration, while admin registers spin result.

**UI Elements:**

- Dark full-screen background.
- Student badge (name + ID) pinned to top-right corner with green pulsing online dot.
- Centered `<SpinWheel>` component in idle (slow continuous rotation) mode.
- Animated pulsing text: "Spin the wheel and see where luck takes you..."

**Behavior:** Fully passive. No user interaction. Waits for `lastSpinResult` from realtime.

---

### 9.4 LockedScreen (`src/pages/student/LockedScreen.tsx`)

**Role:** End-state screen for students who have exhausted all their spins.

**UI Elements:**

- Lock icon.
- "You've used all your spins!" heading.
- Score card showing:
  - Student name
  - Student ID
  - Leaderboard rank (computed as 1-based position in sorted leaderboard array)
  - Total score
- "See Leaderboard" button → calls `onSeeLeaderboard()` (transitions back to `'idle'`).
- Note: "Need more tries? Check with the booth admin."

---

### 9.5 ResultBetterLuck (`src/pages/student/ResultBetterLuck.tsx`)

**Role:** Result screen for segment `s1` — no reward.

**Props:** `triesLeft: number`, `onComplete: () => void`

**Behavior:** Auto-transitions after 5 seconds.

**UI:**

- Gray/dark background.
- Animated Frown icon (floating + rocking animation via Framer Motion).
- Large "Oops! Better luck next time." heading.
- Remaining tries count displayed.
- 5 dot progress indicators (one fills per second, counts down to transition).

---

### 9.6 ResultFreebee (`src/pages/student/ResultFreebee.tsx`)

**Role:** Result screen for segment `s2` (3 Followers + Freebee). Claims a random prize.

**Props:** `onComplete: () => void`

**Context consumed:** `currentStudent`, `claimAward`

**Award States:**
| State | Trigger | UI |
|---|---|---|
| `'checking'` | On mount (award claim in progress) | Spinner |
| `'new-award'` | Claim successful | Confetti animation (20 falling elements) + prize name |
| `'already-awarded'` | Student already has an award | Shows existing prize name + "Already collected" note |
| `'no-awards'` | No prizes in inventory | "No prizes available right now" message |

**Claim Logic on mount:**

1. Check `currentStudent.awardedPrize` — if already set → `already-awarded`.
2. Else call `claimAward()` with a 12-second timeout fallback.
3. Resolve to `new-award` or `no-awards`.

**Additional UI:**

- Instagram + LinkedIn follow handles for CDGAI displayed prominently.
- Auto-transitions after 18 seconds.

---

### 9.7 ResultQuestion (`src/pages/student/ResultQuestion.tsx`)

**Role:** Result screen for segments `s3` (Question Bank), `s4` (IQ Games), `s6` (Career Questions). Shows a relevant MCQ question.

**Props:** `segmentName: string`, `onComplete: () => void`

**Context consumed:** `questions`, `currentStudent`, `updateScore`, `claimAward`

**Two-Screen Flow:**

**Screen 1 — Department Picker:**

- Shown when `!deptConfirmed`.
- Displays all faculties and departments as toggle buttons.
- Pre-selects the student's own department.
- "Start Question →" button (disabled until a dept is chosen) → sets `deptConfirmed = true`.

**Screen 2 — Question Display:**

- Shown when `deptConfirmed && question !== null`.
- Question selected via `useMemo`:
  1. Filter by `category === segmentName`.
  2. Filter by `department === selectedDept`.
  3. If none found, fall back to questions with `department === null`.
  4. Pick a random question from filtered pool.
- `<CountdownTimer>` shown (90-second time limit).
- 4 option buttons.
- On option click (`handleSelect`):
  - Sets `selectedOption` + `showResult = true`.
  - If correct → `updateScore(currentStudent.id, 10)` (10 points).
  - If correct + no prior award → calls `claimAward` → shows award inline.
- Auto-transitions 4 seconds after result revealed.
- On time up (`handleTimeUp`): `isTimeUp = true`, `showResult = true`, auto-transitions.

**Visual Feedback:**

- Correct answer: button flashes green.
- Incorrect answer: selected button flashes red, correct button highlighted green.
- Award claim state shown inline after correct answer.

**Fallback:** If no question available → "No questions available" message + Continue button.

---

### 9.8 ResultPitch (`src/pages/student/ResultPitch.tsx`)

**Role:** Result screen for segment `s5` (Pitch & Communicate). Student presents a pitch, admin scores it.

**Props:** `onComplete: () => void`

**Context consumed:** `currentStudent` (specifically `pendingScore`, `pendingFeedback`)

**Three Sub-States (sequential):**

**Sub-state 1 — Active Timer:**

- Shown when `!isTimeUp && !hasScore` (no score received yet).
- 60-second `<CountdownTimer>`.
- "Done Pitching" button → immediately sets `isTimeUp = true` (skips remaining time).

**Sub-state 2 — Awaiting Judge Score:**

- Shown when `isTimeUp && !hasScore`.
- Pulsing "Awaiting judge score..." indicator.
- "Go to Leaderboard →" escape-hatch button (calls `onComplete()`).
- Auto-advances after 60 more seconds (fallback timeout).

**Sub-state 3 — Score Received:**

- Shown when `hasScore` (i.e., `currentStudent.pendingScore !== undefined`).
- Large circular score display showing `pendingScore / 10`.
- Optional feedback quote from admin.
- Auto-transitions after 5 seconds.

**Score delivery mechanism:** Admin's `submitAdminScore()` writes to `students.pending_score`. Realtime propagates to context, which updates `currentStudent`, which `ResultPitch` watches.

---

### 9.9 ResultResume (`src/pages/student/ResultResume.tsx`)

**Role:** Result screen for segment `s7` (Résumé Review). Expert reviews résumé, then scores.

**Props:** `onComplete: () => void`

**Context consumed:** `currentStudent` (specifically `pendingScore`, `pendingFeedback`)

**Two Sub-States:**

**Sub-state 1 — Waiting:**

- Shown when `!hasScore`.
- Animated bouncing FileText icon.
- "Awaiting expert feedback..." pulsing indicator.
- Auto-advances after 120 seconds (2-minute timeout for résumé review).

**Sub-state 2 — Score Received:**

- Shown when `hasScore`.
- Two tilted card tiles: Score (`/10`) and Points (`+N`).
- Optional feedback quote in a white card.
- Auto-transitions after 8 seconds.

---

## 10. Admin Pages (AdminPanel)

### 10.1 AdminPanel (`src/pages/admin/AdminPanel.tsx`)

**Role:** Admin shell with tab navigation. Wraps all admin sub-pages.

**State:** `activeTab: 'dashboard' | 'students' | 'settings' | 'export'`

**Layout — Desktop (md+):**

- Fixed left sidebar (64px wide).
- Logo at top.
- Nav buttons with icons (LayoutDashboard, Users, Settings, Download) for each tab.
- "Exit to Monitor" link (`<a href="/">`) at bottom → navigates to student view.

**Layout — Mobile:**

- Header bar with "CDGAI Career Fair 2025" text.
- Bottom tab bar with icon + label for each tab.

**Tab Rendering:**

- Renders `<DashboardTab>`, `<StudentsTab>`, `<SettingsTab>`, or `<ExportTab>` based on `activeTab`.

---

### 10.2 DashboardTab (`src/pages/admin/DashboardTab.tsx`)

**Role:** Primary operational screen for running the event moment-to-moment.

**Context consumed:** `students`, `currentStudent`, `segments`, `recordSpin`, `submitAdminScore`, `rewardPoints`

**Stats Row (4 cards):**

- Total Students (all registered)
- Active Now (status === 'active' count)
- Questions Answered (spin history entries matching `['s3','s4','s6']`)
- Top Score (max score across all students)

**Current Student Card:**

- Shows: name, ID, department, tries used / total, score.
- **Spin history chips** — colored tags for each segment the student has already used.
- Status badge: Active (green) / Locked (red).
- If no student: placeholder message "Waiting for student to register...".

**Segment Buttons Grid:**

- One colored button per segment (7 total).
- Each button labeled with segment name.
- Clicking calls `handleSegmentClick(segmentId)`:
  - Calls `recordSpin(currentStudent.id, segmentId, points)`.
    - Points: `s2` = `rewardPoints` (from settings), all others = 0.
  - If `s5` (Pitch): sets `pitchStudent` state → reveals Pitch Score Panel.
  - If `s7` (Résumé): sets `resumeStudent` state → reveals Résumé Score Panel.
- **Disabled conditions:**
  - No current student.
  - Student has reached max spins.
  - `spinningRef.current === true` (ref-based guard prevents double-clicks; resets after 3 seconds).

**Pitch Score Panel** (shown when `pitchStudent !== null`):

- Theme: orange/amber.
- Slider 0–10 for score.
- Textarea for optional feedback (max 300 characters).
- "Submit Score" → calls `submitAdminScore(pitchStudent.id, score, feedback)`.
- Shows confirmation state after submission with "Dismiss" button.

**Résumé Score Panel** (shown when `resumeStudent !== null`):

- Theme: green.
- Same structure as Pitch Score Panel.
- "Submit Score" → calls `submitAdminScore(resumeStudent.id, score, feedback)`.

---

### 10.3 StudentsTab (`src/pages/admin/StudentsTab.tsx`)

**Role:** Full student management table with search, filter, and per-student actions.

**Context consumed:** `students`, `banStudent`, `unbanStudent`, `editTries`, `submitAdminScore`

**Filtering Controls:**

- Search input: filters by name or student ID (case-insensitive substring match).
- Status filter tabs: All | Active | Locked | Banned.

**Table Columns:**
Name | ID | Email | Phone | Department | Score | Spins (used/max) | Status Badge | Actions

**Action Buttons per Row:**
| Button | Icon | Action |
|---|---|---|
| Edit Tries | ✏️ | Opens Edit Max Tries modal |
| Add Manual Score | ✅ | Opens Manual Score modal |
| Ban / Unban | 🚫 / ✅ | Calls `banStudent` or `unbanStudent`; shows spinner while loading (`actionLoadingId`) |

**Edit Tries Modal:**

- Number input (1–10).
- Save → `editTries(student.id, newTries)`.

**Manual Score Modal:**

- Range slider 0–10.
- Optional feedback textarea.
- Save → `submitAdminScore(student.id, score, feedback)`.

---

### 10.4 SettingsTab (`src/pages/admin/SettingsTab.tsx`)

**Role:** Event configuration, question bank management, and awards management.

**Context consumed:** `maxTriesDefault`, `rewardPoints`, `eventName`, `resetLeaderboard`, `awards`, `addAward`, `removeAward`, `refreshQuestions`, `questions`, `updateMaxTriesDefault`, `updateRewardPoints`, `updateEventName`

#### Section A — Participation Rules

- **Max Tries per Student** — number input; Save button persists to `settings` table via `updateMaxTriesDefault()`. Shows spinner → checkmark on save.
- **Segment 2 Reward Points** — number input; Save button persists via `updateRewardPoints()`. Shows spinner → checkmark on save.

#### Section B — Question Bank Management

- Shows total question count.
- **"Import All Bundled"** button: fetches all 12 files from `public/questions/`, parses each, deletes existing questions per department, inserts fresh. Shows import status.
- **Single file upload**: drag-and-drop or file picker. Accepts `.csv` and `.xlsx`.
- **Import status indicators**: `idle` → `parsing` → `importing` → `success` / `error`.
- **Question deletion controls**:
  - "Clear All Questions" (full wipe; requires `window.confirm`).
  - "Delete by Department" buttons (one per department).

#### Section C — Awards Management

- Lists all awards with remaining/total quantities and Available/Exhausted status badges.
- "Add Award" form: award name + quantity → calls `addAward(name, qty)`.
- "Delete" button per award (with `window.confirm` dialog) → calls `removeAward(id)`.

#### Section D — Event Details

- **Event Name** text input; "Save Event Details" button persists via `updateEventName()`. Shows spinner → green "Saved" state on save.

#### Section E — Danger Zone

- Shows reset warning.
- "Reset Leaderboard" button → reveals confirm UI.
- Confirm requires typing "RESET" exactly → enables the destructive reset call.
- Calls `resetLeaderboard()` which wipes all students and resets session.

---

### 10.5 ExportTab (`src/pages/admin/ExportTab.tsx`)

**Role:** Downloads session data as formatted Excel (.xlsx) files.

**Context consumed:** `students`, `segments`, `leaderboard`

**4 Export Options:**

| Export              | Filename                   | Content                                                            |
| ------------------- | -------------------------- | ------------------------------------------------------------------ |
| Full Session Export | `session-full-export.xlsx` | 3 sheets: Participants + Spin Log + Leaderboard                    |
| Participants List   | `participants.xlsx`        | Name, ID, Email, Phone, Faculty, Dept, Score, Spins, Status, Prize |
| Spin Log            | `spin-log.xlsx`            | One row per spin: Student name, ID, Spin #, Segment                |
| Leaderboard         | `leaderboard.xlsx`         | Rank, Name, ID, Faculty, Dept, Score, Spins, Status                |

**UX:**

- Download buttons show spinner during export → "Exported ✓" state for 3 seconds.
- Last export timestamp shown per export type.
- Uses `xlsx` library (`XLSX.utils.json_to_sheet`, `XLSX.writeFile`).

---

## 11. Shared Components

### 11.1 SpinWheel (`src/components/SpinWheel.tsx`)

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `segments` | `Segment[]` | required | Wheel slices |
| `isSpinning` | `boolean` | false | Triggers spin animation |
| `targetSegmentId` | `string` | — | Segment to land on |
| `onSpinComplete` | `() => void` | — | Called when animation ends |

**SVG Structure:** 500×500 viewBox. Group rotated -90° so segment 1 starts at top. Each segment is a computed pie-slice path. Multi-line text labels via `<tspan>`. White pointer triangle at top. Dark center hub with maroon dot.

**Idle Animation:** Continuous 40-second clockwise rotation loop (Framer Motion).

**Spin Animation:** 5 extra full rotations (1800°) + angle to center `targetSegmentId` under pointer. Cubic ease `[0.2, 0.8, 0.2, 1]` over 5 seconds. Calls `onSpinComplete` when done.

**Note:** The admin uses segment buttons (not the wheel component) to register spin results. The wheel is shown on `WaitingForSpin` in idle mode only.

---

### 11.2 CountdownTimer (`src/components/CountdownTimer.tsx`)

**Props:**
| Prop | Type | Default |
|---|---|---|
| `totalSeconds` | `number` | required |
| `onComplete` | `() => void` | — |
| `size` | `number` | 120 |
| `color` | `string` | `'#2563EB'` |

**Rendering:** SVG with background circle + animated stroke-dashoffset progress arc (Framer Motion, 1s linear transitions). Large bold number in center.

**Accessibility:** `aria-live="polite"` on the number.

**Used in:**

- `ResultPitch` — 60-second pitch timer.
- `ResultQuestion` — 90-second question time limit.

---

### 11.3 Leaderboard (`src/components/Leaderboard.tsx`)

**Props:** `students: Student[]`

**State:** `activeTab: Department | "All"`

**Filtering logic:**

1. Exclude banned students.
2. Exclude students with score ≤ 0.
3. Filter by department if tab != "All".
4. Sort by score descending.
5. Show top 10 only.

**Tabs:** "All" + all 12 department names.

**Table Columns:** Rank | Student | Department | Score

**Styling:**

- Rank 1: Gold + Trophy icon.
- Rank 2: Silver + Trophy icon.
- Rank 3: Bronze + Trophy icon.
- Rank 4+: Plain white.

**Animation:** `AnimatePresence` + `layout` prop for animated reordering when scores change.

**Empty state:** "No scores yet" message.

---

### 11.4 Logo (`src/components/Logo.tsx`)

**Props:** `size?: 'sm' | 'md' | 'lg' | 'xl'`, `className?: string`

**Rendering:** Maroon circle with "CDGAI" text. Pure presentational; no state or logic.

---

## 12. Services Layer

All services are pure async functions. No local state. All call Supabase directly.

### 12.1 `src/services/students.ts`

| Function                      | Query                            |
| ----------------------------- | -------------------------------- |
| `fetchStudents()`             | SELECT \* ORDER BY score DESC    |
| `fetchStudentByStudentId(id)` | SELECT WHERE student_id = ?      |
| `fetchStudentById(id)`        | SELECT WHERE id = ?              |
| `insertStudent(student)`      | INSERT (omits id, created_at)    |
| `updateStudent(id, fields)`   | UPDATE WHERE id = ? (partial)    |
| `deleteAllStudents()`         | DELETE WHERE id != '00000000...' |

### 12.2 `src/services/session.ts`

| Function                                       | Description                                                   |
| ---------------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `fetchSession()`                               | SELECT WHERE id = 'singleton'                                 |
| `setCurrentStudentId(id                        | null)`                                                        | UPDATE current_student_id + updated_at |
| `setSpinResultAndClearStudent(segId, segName)` | Atomic UPDATE: sets spin result AND clears current_student_id |
| `clearSpinResult()`                            | Nulls spin result fields                                      |
| `resetSession()`                               | Nulls all fields                                              |

### 12.3 `src/services/segments.ts`

| Function          | Description           |
| ----------------- | --------------------- |
| `fetchSegments()` | SELECT \* ORDER BY id |

Read-only. Segments are static.

### 12.4 `src/services/questions.ts`

| Function                            | Description                                                 |
| ----------------------------------- | ----------------------------------------------------------- |
| `fetchQuestions()`                  | Paginated SELECT in 1000-row batches (loops until complete) |
| `deleteAllQuestions()`              | DELETE WHERE id != '00000000...'                            |
| `deleteQuestionsByDepartment(dept)` | DELETE WHERE department = ?                                 |
| `deleteNullDepartmentQuestions()`   | DELETE WHERE department IS NULL                             |
| `insertQuestions(questions[])`      | Batched INSERT in chunks of 500                             |

### 12.5 `src/services/awards.ts`

| Function                          | Description                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `fetchAwards()`                   | SELECT \* ORDER BY name ASC                                                              |
| `insertAward(name, quantity)`     | INSERT (sets total_quantity = remaining_quantity)                                        |
| `deleteAward(id)`                 | DELETE WHERE id = ?                                                                      |
| `claimRandomAward(studentId)`     | Tries `rpc('claim_random_award')` first; falls back to `claimAwardClientSide()`          |
| `claimAwardClientSide(studentId)` | Non-atomic client-side fallback: fetch awards → pick random → decrement → update student |

### 12.6 `src/services/settings.ts`

| Function                | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `fetchSettings()`       | SELECT WHERE id = 'singleton'; returns null silently if row absent |
| `updateSettings(patch)` | UPSERT with `{ id: 'singleton', ...patch }`                        |

---

## 13. Question Import System

Located in `src/pages/admin/SettingsTab.tsx`.

### 13.1 Supported Formats

- CSV (`.csv`)
- Excel (`.xlsx`)

### 13.2 Column Header Normalization (`HEADER_LOOKUP`)

The parser handles many aliases for each canonical column:

- **text**: `question`, `question_text`, `q`, `question text`
- **option1–4**: `a`, `b`, `c`, `d`, `answer_a`, `choice1`, etc.
- **option0** (zero-based): `option0`, `choice0`, etc.
- **correct_answer_index**: `correct`, `answer`, `correct_answer`, `answer_index`
- **category**: `type`, `question_type`, `topic`
- **department**: `dept`, `faculty`, `program`

### 13.3 Parsing Pipeline (`parseSingleFile`)

1. Read file via `xlsx` library.
2. Normalize column headers via lookup table.
3. Infer department from filename if column absent (`deptFromFilename`).
4. Normalize department spelling via `DEPARTMENT_LOOKUP`.
5. Normalize category via `CATEGORY_LOOKUP` → `'Question Bank'` | `'IQ Games'` | `'Career Questions'`.
6. If category column absent:
   - Check question text for keywords (regex patterns) → infer category.
   - For files ≥180 rows: rows 0–79 = Question Bank, 80–139 = IQ Games, 140+ = Career Questions.
7. Handle zero-based option columns (`option0` treated as `option1`, etc.).
8. Validate required columns; skip rows with errors; accumulate error messages.
9. Return array of parsed question objects + row count + error list.

### 13.4 Import Modes

**Import All Bundled:**

1. Fetch all 12 files from `public/questions/` via HTTP.
2. Parse each file.
3. Per-department delete + insert (failure in one department does not affect others).
4. Calls `refreshQuestions()` on completion.

**Single File Upload:**

1. User selects/drops a file.
2. Parse → preview row count.
3. Per-department delete + insert (does NOT wipe unrelated departments).

### 13.5 12 Bundled Question Files

| Filename                                      | Inferred Department    |
| --------------------------------------------- | ---------------------- |
| `All_departments.csv`                         | All departments (null) |
| `Allied Heath Sciences Question Bank (1).csv` | Allied Health Sciences |
| `Architecuture_Mcqs - Architecture.csv`       | Architecture           |
| `BioScience-Re - Bioscience MCQs.csv`         | Bioscience             |
| `BSH_MCQs.csv`                                | BSH                    |
| `Civil_Engineering_MCQs_200.csv`              | Civil Engineering      |
| `Computer_Science_MCQs_200.csv`               | Computer Science       |
| `Electrical_Engineering_MCQs_200.csv`         | Electrical Engineering |
| `Management_Sciences_MCQs_200.csv`            | Management Sciences    |
| `Mechanical_MCQs_200.csv`                     | Mechanical Engineering |
| `nursing_200_mcqs.csv`                        | Nursing                |
| `pharmacy_200_mcqs.csv`                       | Pharmacy               |
| `Software eng_200_mcqs.csv`                   | Software Engineering   |

---

## 14. Realtime Synchronization

### 14.1 Three Supabase Realtime Channels

**Channel 1: `students-realtime`**

- Listens: `INSERT`, `UPDATE`, `DELETE` on `students`.
- Keeps local `students` array in sync.
- If `currentStudent` is updated → applies changes immediately (score, pendingScore, awardedPrize, etc.).

**Channel 2: `awards-realtime`**

- Listens: `INSERT`, `UPDATE`, `DELETE` on `awards`.
- Keeps prize inventory in sync across all tabs/devices.

**Channel 3: `session-realtime`**

- Listens: `UPDATE` on `active_session`.
- **On `current_student_id` change:**
  - If set → look up student in local state (fetch from DB if not found) → set `currentStudent`.
  - If null → clear `currentStudent` (with race condition guard — see below).
- **On `last_spin_segment_id` + `last_spin_timestamp` change (new timestamp):**
  - Set `lastSpinResult` → triggers StudentApp screen transition.
  - Mark timestamp as processed in `lastProcessedSpinTs` ref.

### 14.2 Race Condition Guard

`setSpinResultAndClearStudent()` writes spin result AND clears `current_student_id` in a single atomic DB call. The realtime handler in AppContext detects when this happens simultaneously (same DB event) and does NOT clear `currentStudent` locally — preserving the student reference needed by result screens.

---

## 15. Spin Segments & Scoring

| Segment ID | Name                  | Points                         | Result Screen    | Admin Action Required   |
| ---------- | --------------------- | ------------------------------ | ---------------- | ----------------------- |
| s1         | Better Luck Next Time | 0                              | ResultBetterLuck | None                    |
| s2         | 3 Followers + Freebee | `rewardPoints` (from settings) | ResultFreebee    | None (auto prize claim) |
| s3         | Question Bank         | 0 (correct = +10)              | ResultQuestion   | None (auto graded)      |
| s4         | IQ Games              | 0 (correct = +10)              | ResultQuestion   | None (auto graded)      |
| s5         | Pitch & Communicate   | 0 (admin scored)               | ResultPitch      | Submit score 0–10       |
| s6         | Career Questions      | 0 (correct = +10)              | ResultQuestion   | None (auto graded)      |
| s7         | Résumé Review         | 0 (admin scored)               | ResultResume     | Submit score 0–10       |

**Points from admin-scored segments (s5, s7):** Written to `pending_score`, not added to main score automatically. The `submitAdminScore()` context method adds the score to `score` + stores in `pending_score`/`pending_feedback`.

**Max Spins:** Default 3 per student (read from `settings.max_tries_default`). Configurable per-student by admin via "Edit Tries" in StudentsTab.

---

## 16. Awards & Prize System

### Flow

1. Admin adds prizes in SettingsTab (name + quantity).
2. When student lands on s2 (Freebee) or correctly answers a question (s3/s4/s6), `claimAward()` is called.
3. The RPC atomically assigns a random available prize to the student.
4. `awarded_prize` is set on the student record.
5. Subsequent claims by the same student return `already-awarded` state — they cannot claim twice.

### Inventory Tracking

- `total_quantity` — original quantity added by admin.
- `remaining_quantity` — decrements with each claim; enforced at DB level.

### Fallback

If the RPC fails, a client-side non-atomic fallback is used. Under concurrent load this could allow over-claiming, but is acceptable for low-concurrency career fair scenarios.

---

## 17. Export System

All exports use the `xlsx` library. Files download directly to the user's browser.

### Full Session Export (`session-full-export.xlsx`) — 3 Sheets

1. **Participants:** Name, ID, Email, Phone, Faculty, Department, Score, Spins Used, Max Spins, Status, Prize Claimed
2. **Spin Log:** Student Name, Student ID, Spin Number, Segment Name
3. **Leaderboard:** Rank, Name, ID, Faculty, Department, Score, Spins Used, Status

### Participants Export (`participants.xlsx`)

Single sheet matching the Participants sheet above.

### Spin Log Export (`spin-log.xlsx`)

One row per individual spin. Spin history from `spin_history[]` array on each student.

### Leaderboard Export (`leaderboard.xlsx`)

Uses `leaderboard` derived state (sorted by score descending).

---

## 18. Security & Access Control

### Supabase RLS Policies

| Table            | Anonymous Read | Anonymous Write                             |
| ---------------- | -------------- | ------------------------------------------- |
| `students`       | ✅             | ✅                                          |
| `questions`      | ✅             | ✅                                          |
| `awards`         | ✅             | ✅                                          |
| `active_session` | ✅             | ✅                                          |
| `segments`       | ✅             | ❌ (read-only)                              |
| `settings`       | ✅             | ✅ (INSERT + UPDATE for admin save buttons) |

### Admin Access

- No authentication. Admin mode is accessed via `?mode=admin` URL query parameter.
- Security relies on keeping the admin URL known only to staff.
- **Consideration:** This is a low-security event context; for production use, add authentication.

### Data Validation

- Student ID format validated client-side: `/^[A-Za-z]{2,4}-\d{3,4}-\d{4}$/`
- Email validated client-side.
- `student_id` has a UNIQUE constraint in the DB — prevents duplicate registrations at DB level.
- Award claim uses `FOR UPDATE SKIP LOCKED` in the RPC for concurrency safety.

---

## 19. Known Constraints & Edge Cases

| #   | Constraint / Edge Case                                         | Behavior                                                                                                |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Admin registers spin before student's registration fully loads | Race condition prevented by atomic `setSpinResultAndClearStudent` + dedup via `lastProcessedSpinTs` ref |
| 2   | Student ID already registered with different name              | Returns `name_mismatch` error; shows warning; blocks registration                                       |
| 3   | Student exhausted all spins on re-registration                 | Returns `max_spins` error; triggers `onLocked()`                                                        |
| 4   | No questions available for student's department                | Falls back to questions with `department = null`; if still none, shows "No questions available"         |
| 5   | No prizes in inventory                                         | `claimAward` returns null; ResultFreebee shows `no-awards` state                                        |
| 6   | Admin submits pitch score before student's pitch timer ends    | Realtime pushes score; ResultPitch transitions to score display immediately                             |
| 7   | Network disconnect                                             | Realtime channels reconnect automatically (Supabase client handles this)                                |
| 8   | Two students registering simultaneously                        | `student_id` UNIQUE constraint prevents duplicate inserts; session holds only one `current_student_id`  |
| 9   | Admin navigates away mid-scoring                               | Score state is local to `DashboardTab`; lost on tab switch; not persisted to DB until "Submit" clicked  |
| 10  | Double-clicking a segment button                               | Prevented by `spinningRef.current` guard; blocks subsequent clicks for 3 seconds after first click      |
| 11  | Guest registration                                             | Guests have no studentId/faculty/department; appear in "All" leaderboard tab only                       |
| 12  | Résumé review timeout                                          | If admin never submits score, `ResultResume` auto-completes after 120 seconds                           |
| 13  | Pitch waiting timeout                                          | If admin never submits score, `ResultPitch` auto-completes after 60 more seconds in waiting state       |
