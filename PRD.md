# Product Requirements Document (PRD)

## EduWheel — CDGAI Career Fair Interactive Engagement App

**Version:** 2.0  
**Last Updated:** May 2026  
**Status:** Production

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [Tech Stack & Infrastructure](#3-tech-stack--infrastructure)
4. [Folder Structure](#4-folder-structure)
5. [Database Schema](#5-database-schema)
6. [User Roles](#6-user-roles)
7. [Application Modes & Routing](#7-application-modes--routing)
8. [Global State (AppContext)](#8-global-state-appcontext)
9. [Data Flows](#9-data-flows)
10. [Student-Facing Pages](#10-student-facing-pages)
11. [Admin Pages](#11-admin-pages)
12. [Shared Components](#12-shared-components)
13. [Services Layer](#13-services-layer)
14. [Question Import System](#14-question-import-system)
15. [Custom Departments System](#15-custom-departments-system)
16. [Realtime Synchronization](#16-realtime-synchronization)
17. [Spin Segments & Scoring](#17-spin-segments--scoring)
18. [Awards & Prize System](#18-awards--prize-system)
19. [Email Notification System](#19-email-notification-system)
20. [Export System](#20-export-system)
21. [Security & Access Control](#21-security--access-control)
22. [Known Constraints & Edge Cases](#22-known-constraints--edge-cases)
23. [Future Considerations](#23-future-considerations)

---

## 1. Product Overview

EduWheel (branded CDGAI Spin Wheel) is a **real-time interactive kiosk application** used at CECOS University career fair booths. Students approach a physical booth and register on a monitor — the "student view". A staff member at the booth spins a physical wheel and records the result on a separate admin tablet or laptop — the "admin view". The student's monitor instantly transitions to the appropriate result screen via Supabase Realtime pub/sub.

### Core Value Proposition

- Creates a gamified, engaging experience that draws students to the career fair booth.
- Collects structured participant data (ID, faculty, department, contact info, participation type).
- Rewards students with prizes, leaderboard rankings, and skill-based challenges.
- Provides staff with live operational control (score students, manage prizes, monitor stats).
- Delivers post-session data exports for analytics and follow-up.

### High-Level User Journey

1. Student approaches → sees live leaderboard on monitor → fills in registration form.
2. Admin confirms the student is ready → spins a physical wheel.
3. Admin clicks the matching segment on the dashboard.
4. Student screen instantly shows the result (question, pitch timer, freebee, résumé review, or better luck).
5. For scored segments (pitch/résumé), admin rates the student; score appears on the student screen in real time.
6. Result screen auto-dismisses → student returns to leaderboard/idle state.
7. A thank-you email is sent to the participant (if email is on record).

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| High booth engagement | ≥ 50 participant registrations per event session |
| Zero dropped spins | Every physical spin mapped to a student result with no manual recovery needed |
| Fast registration | < 30 seconds from approach to waiting-for-spin screen |
| Real-time accuracy | Score and leaderboard update visible within 2 seconds of admin action |
| Data completeness | ≥ 95% of registrations include faculty + department (student registrations) |

---

## 3. Tech Stack & Infrastructure

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React + TypeScript | 18 / 5.5 |
| Build Tool | Vite | 5 |
| Styling | Tailwind CSS | 3.4 |
| Animation | Framer Motion | 11 |
| Icons | Lucide React | 0.522 |
| Routing | React Router DOM | v6 |
| Backend / Database | Supabase (PostgreSQL + Realtime + RLS) | — |
| Supabase Client | @supabase/supabase-js | v2 |
| Spreadsheet | SheetJS (xlsx) | 0.18 |
| Charts | Recharts | 3 |
| Email | Supabase Edge Function + Nodemailer | — |

### Required Environment Variables

| Variable | Source | Usage |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project Settings → API | Supabase client init |
| `VITE_SUPABASE_ANON_KEY` | Supabase Project Settings → API | Supabase client init |
| `RESEND_EMAIL_KEY` | Resend dashboard | Edge Function email sending |

Both `VITE_*` variables are read at module load time in `src/lib/supabase.ts`. The app throws immediately if either is missing.

### Design Tokens (`tailwind.config.js`)

```
bg-cdgai-dark     — dark surface background
bg-cdgai-maroon   — primary brand colour (#C8102E)
text-cdgai-accent — accent text colour
```

---

## 4. Folder Structure

```
├── index.html                          # SPA shell — <div id="root">
├── package.json
├── vite.config.ts                      # Vite config + Questions Generator Vite plugin
├── tailwind.config.js                  # Custom brand tokens
├── postcss.config.js
├── tsconfig.json / tsconfig.node.json
├── supabase-setup.sql                  # Full DDL + seed + RLS + Realtime (run once)
├── supabase-departments-migration.sql  # Adds departments table
├── fix-department-names.sql            # Migration: normalize department name casing
│
├── public/questions/                   # 12 bundled CSV question banks
│   ├── All_departments.csv
│   ├── Allied Heath Sciences Question Bank (1).csv
│   ├── Architecuture_Mcqs - Architecture.csv
│   ├── BioScience-Re - Bioscience MCQs.csv
│   ├── BSH_MCQs.csv
│   ├── Civil_Engineering_MCQs_200.csv
│   ├── Computer_Science_MCQs_200.csv
│   ├── Electrical_Engineering_MCQs_200.csv
│   ├── Management_Sciences_MCQs_200.csv
│   ├── Mechanical_MCQs_200.csv
│   ├── nursing_200_mcqs.csv
│   ├── pharmacy_200_mcqs.csv
│   └── Software eng_200_mcqs.csv
│
├── scripts/
│   ├── build-questions-json.mjs        # Compile CSVs → src/data/questions.ts
│   ├── gen-questions.mjs               # Generate question CSVs
│   └── import-bundled-questions.mjs    # CLI bulk-import into Supabase
│
├── supabase/
│   └── functions/send-thankyou-email/
│       └── index.ts                    # Edge Function — HTML email via Nodemailer
│
└── src/
    ├── App.tsx                         # Root component: AppProvider + Router + mode switch
    ├── index.css                       # Tailwind directives + global styles
    ├── index.tsx                       # React.createRoot mount
    ├── vite-env.d.ts
    │
    ├── components/
    │   ├── SpinWheel.tsx
    │   ├── CountdownTimer.tsx
    │   └── Logo.tsx
    │
    ├── context/
    │   └── AppContext.tsx              # ~800 lines — all state + methods + Realtime
    │
    ├── data/
    │   └── questions.ts               # Static question map (build-time generated)
    │
    ├── lib/
    │   ├── supabase.ts                # Singleton createClient()
    │   └── database.types.ts          # TypeScript DB row interfaces
    │
    ├── pages/
    │   ├── admin/
    │   │   ├── AdminPanel.tsx
    │   │   ├── DashboardTab.tsx
    │   │   ├── StudentsTab.tsx
    │   │   ├── CategoriesTab.tsx
    │   │   ├── SettingsTab.tsx
    │   │   └── ExportTab.tsx
    │   └── student/
    │       ├── StudentApp.tsx
    │       ├── IdleRegistration.tsx
    │       ├── Registration.tsx
    │       ├── WaitingForSpin.tsx
    │       ├── LockedScreen.tsx
    │       ├── ResultBetterLuck.tsx
    │       ├── ResultFreebee.tsx
    │       ├── ResultQuestion.tsx
    │       ├── ResultPitch.tsx
    │       └── ResultResume.tsx
    │
    └── services/
        ├── students.ts
        ├── session.ts
        ├── segments.ts
        ├── questions.ts
        ├── awards.ts
        ├── departments.ts
        ├── settings.ts
        └── email.ts
```

---

## 5. Database Schema

> Full DDL in `supabase-setup.sql`. Complete field-by-field reference in `DATABASE.md`.

### 5.1 `students` Table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | TEXT NOT NULL | Full name |
| `student_id` | TEXT UNIQUE NOT NULL | University ID (e.g. CS-001-2024) or generated guest ID |
| `email` | TEXT DEFAULT '' | Required for guest; optional for student |
| `phone` | TEXT DEFAULT '' | Required for guest |
| `faculty` | TEXT DEFAULT '' | Required for CECOS student / faculty member |
| `department` | TEXT DEFAULT '' | Required for CECOS student / faculty member |
| `participant_type` | TEXT DEFAULT 'student' | `'student'` \| `'faculty'` \| `'others'` |
| `score` | INTEGER DEFAULT 0 | Accumulated points |
| `spins_used` | INTEGER DEFAULT 0 | Number of spins consumed |
| `max_spins` | INTEGER DEFAULT 3 | Configurable per student by admin |
| `status` | TEXT DEFAULT 'active' | `'active'` \| `'locked'` \| `'banned'` |
| `spin_history` | TEXT[] DEFAULT '{}' | Array of segment IDs for each spin |
| `reward_claimed` | BOOLEAN DEFAULT false | Generic reward flag |
| `awarded_prize` | TEXT | Name of prize claimed via RPC |
| `pending_score` | INTEGER | Score set by admin, pending display |
| `pending_feedback` | TEXT | Feedback text set by admin, pending display |
| `is_guest` | BOOLEAN DEFAULT false | True for non-CECOS participants |
| `guest_type` | TEXT DEFAULT '' | `'student'` \| `'faculty'` \| `'other'` |
| `semester` | TEXT DEFAULT '' | CECOS student's semester |
| `position` | TEXT DEFAULT '' | Faculty member's position title |
| `organization` | TEXT DEFAULT '' | Guest's organization |
| `field_of_interest` | TEXT DEFAULT '' | Guest's field of interest |
| `follow_status` | TEXT DEFAULT '' | `'already_followed'` \| `'just_followed'` |
| `created_at` | TIMESTAMPTZ | Auto |

**Realtime:** Yes

### 5.2 `segments` Table (static seed)

| ID | Name | Colour |
|---|---|---|
| s1 | Better Luck Next Time | `#6B7280` (gray) |
| s2 | 3 Followers + Freebee | `#D97706` (amber) |
| s3 | Question Bank | `#7C3AED` (purple) |
| s4 | IQ Games | `#0D9488` (teal) |
| s5 | Pitch & Communicate | `#EA580C` (orange) |
| s6 | Career Questions | `#2563EB` (blue) |
| s7 | Résumé Review | `#16A34A` (green) |

**Realtime:** No (static)

### 5.3 `questions` Table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `category` | TEXT NOT NULL | `'Question Bank'` \| `'IQ Games'` \| `'Career Questions'` |
| `department` | TEXT NULL | Department scope; NULL = shared across all |
| `text` | TEXT NOT NULL | Question body |
| `options` | TEXT[] NOT NULL | Exactly 4 answer strings |
| `correct_answer_index` | INTEGER NOT NULL | 0-based index into `options` |

**Realtime:** No

### 5.4 `active_session` Table (singleton)

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Always `'singleton'` |
| `current_student_id` | UUID FK → students | NULL when no student at booth |
| `last_spin_segment_id` | TEXT FK → segments | |
| `last_spin_segment_name` | TEXT | Denormalized for display speed |
| `last_spin_timestamp` | BIGINT | Unix epoch ms — dedup key for Realtime |
| `updated_at` | TIMESTAMPTZ | |

**Realtime:** Yes

### 5.5 `settings` Table (singleton)

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Always `'singleton'` |
| `max_tries_default` | INTEGER DEFAULT 3 | Default max spins for new students |
| `reward_points` | INTEGER DEFAULT 5 | Points for s2 (Freebee) segment |
| `event_name` | TEXT DEFAULT 'EduWheel' | Shown in admin UI and student panel |

**Realtime:** No

### 5.6 `awards` Table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Prize name |
| `total_quantity` | INTEGER NOT NULL | Original quantity |
| `remaining_quantity` | INTEGER NOT NULL | Decremented on each claim |
| `created_at` | TIMESTAMPTZ | |

**Realtime:** Yes

### 5.7 `departments` Table

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Department name |
| `faculty` | TEXT NOT NULL | Parent faculty |
| `is_active` | BOOLEAN DEFAULT true | Toggle visibility |
| `created_at` | TIMESTAMPTZ | |

**Realtime:** No

### 5.8 `claim_random_award(p_student_id uuid)` PostgreSQL RPC

Atomic prize claim procedure:

1. Check if student already has `awarded_prize` → return existing prize name (no double claim).
2. Lock a random award row where `remaining_quantity > 0` using `FOR UPDATE SKIP LOCKED`.
3. If no award available → return `NULL`.
4. Decrement `remaining_quantity` by 1.
5. Set `students.awarded_prize` to the award name.
6. Return the award name.

---

## 6. User Roles

### 6.1 CECOS Student

- Registers with: name, university ID, faculty, department, semester.
- University ID must match regex `/^[A-Za-z]{2,4}-\d{3,4}-\d{4}$/`.
- Appears on leaderboard under their department tab.
- Up to `max_spins` spins (default 3, admin-adjustable).

### 6.2 Faculty Member

- Registers with: name, position, organization, faculty, department.
- Appears on leaderboard.
- Same spin limits as students.

### 6.3 Guest / Visitor

- Registers with: name, email, phone, field of interest.
- No university ID / faculty / department required.
- `is_guest = true`, `participant_type = 'others'`.
- Appears only in "All" leaderboard tab.

### 6.4 Booth Admin (Staff)

- Opens `/?mode=admin` on a separate device.
- Records physical wheel results by clicking segment buttons.
- Scores pitch and résumé submissions.
- Manages question banks, awards, and student records.
- **No authentication** — access relies on URL secrecy.

---

## 7. Application Modes & Routing

```
App.tsx
└── AppProvider
    └── BrowserRouter
        └── Routes
            └── Route path="/"
                ├── ?mode=admin → <AdminPanel>
                └── (default)  → <StudentApp>
```

Mode is detected via `useLocation()` and `URLSearchParams` inside `AppContent`. No server-side routing — single SPA route.

---

## 8. Global State (AppContext)

`src/context/AppContext.tsx` is the **single source of truth**. All business logic lives here. No component fetches from Supabase directly — all DB operations go through context methods or services.

### 8.1 State Variables

| Variable | Type | Description |
|---|---|---|
| `students` | `Student[]` | All registered participants |
| `currentStudent` | `Student \| null` | Student currently at booth |
| `segments` | `Segment[]` | Wheel segment definitions |
| `questions` | `Question[]` | Loaded question bank (custom dept questions) |
| `awards` | `Award[]` | Prize inventory |
| `lastSpinResult` | `{ segmentId, segmentName, timestamp } \| null` | Latest spin result from Realtime |
| `maxTriesDefault` | `number` | From settings table (default 3) |
| `rewardPoints` | `number` | From settings table (default 5) |
| `eventName` | `string` | From settings table (default 'EduWheel') |
| `customDepartments` | `CustomDepartment[]` | DB-stored custom departments |

**Derived:**
- `leaderboard` — `useMemo` sorted by score descending.

**Refs:**
- `lastProcessedSpinTs` — prevents double-processing of spin Realtime events.

### 8.2 Types

```typescript
interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  faculty: string;
  department: string;
  studentId: string;
  participantType: string;          // 'student' | 'faculty' | 'others'
  score: number;
  spinsUsed: number;
  maxSpins: number;
  status: 'active' | 'locked' | 'banned';
  spinHistory: string[];
  rewardClaimed?: boolean;
  awardedPrize?: string | null;
  pendingScore?: number | null;
  pendingFeedback?: string | null;
  isGuest: boolean;
  guestType: string;                // 'student' | 'faculty' | 'other'
  semester: string;
  position: string;
  organization: string;
  fieldOfInterest: string;
  followStatus: string;             // 'already_followed' | 'just_followed'
}
```

### 8.3 Faculty → Department Map (`FACULTY_DEPARTMENTS`)

```typescript
{
  "Faculty of Engineering": ["Civil", "Mechanical", "Electrical", "Architecture"],
  "Faculty of Life Sciences": ["Pharmacy", "Bioscience", "Allied Health Sciences", "Nursing"],
  "Faculty of Computing and Management Sciences": [
    "Management of Science", "Basic Science & Humanities",
    "Computer Sciences", "Software Engineering"
  ]
}
```

Custom departments added via CategoriesTab are merged at runtime.

### 8.4 Initialization Sequence (on mount)

`Promise.all` parallel fetches:
1. `fetchStudents()` → `students`
2. `fetchSegments()` → `segments`
3. `fetchSession()` → restore `currentStudent` + mark existing spin timestamp as processed
4. `fetchAwards()` → `awards`
5. `fetchSettings()` → `maxTriesDefault`, `rewardPoints`, `eventName`
6. `fetchDepartments()` → `customDepartments` + pre-fetch their questions from DB

### 8.5 Context Methods (complete)

| Method | Description |
|---|---|
| `registerStudent(name, studentId, email, phone, faculty, department, registrationType, guestSubType?)` | Validates fields; handles returning students, name mismatches, max-spin locks; inserts new student; sets active_session |
| `setCurrentStudent(student \| null)` | Updates local state + `active_session.current_student_id` |
| `recordSpin(studentId, segmentId, points)` | Increments spinsUsed; locks student if max reached; appends spin_history; adds points; atomically sets active_session spin result + clears current_student_id |
| `updateScore(studentId, points)` | Adds points to student score (used for correct question answers) |
| `recordQuestionResult(studentId, category, correct)` | Tracks question outcomes for analytics |
| `submitAdminScore(studentId, score, feedback?)` | Sets pending_score + pending_feedback on student; adds to total score |
| `resetSessionData()` | Wipes all students + resets active_session + clears local state |
| `markRewardClaimed(studentId)` | Sets `reward_claimed = true` |
| `banStudent(studentId)` | Sets `status = 'banned'` |
| `unbanStudent(studentId)` | Restores `status` based on spinsUsed vs maxSpins |
| `editTries(studentId, newMaxSpins)` | Updates `max_spins`; recalculates `status` |
| `clearSpinResult()` | Nulls `lastSpinResult` locally + in DB |
| `addAward(name, quantity)` | Inserts award to DB + local state |
| `removeAward(id)` | Deletes award from DB + local state |
| `claimAward(studentId)` | Calls atomic RPC; falls back to client-side; updates local state |
| `refreshQuestions()` | Re-fetches all questions from DB |
| `refreshAwards()` | Re-fetches all awards from DB |
| `updateMaxTriesDefault(value)` | Upserts `max_tries_default` in settings + local state |
| `updateRewardPoints(value)` | Upserts `reward_points` in settings + local state |
| `updateEventName(value)` | Upserts `event_name` in settings + local state |
| `addCustomDepartment(name, faculty)` | Inserts department to DB + local state |
| `updateCustomDepartment(id, updates)` | Updates department in DB + local state |
| `removeCustomDepartment(id)` | Deletes department from DB + local state |
| `refreshCustomDepartments()` | Re-fetches all custom departments from DB |
| `getDepartmentsForFaculty(faculty)` | Returns combined built-in + active custom departments for a faculty |

---

## 9. Data Flows

### 9.1 Student Registration Flow

```
Student fills registration form
  → client-side validation (required fields, ID regex, email format)
  → registerStudent() called
    ┌─ Student type = 'student' / 'faculty'
    │   → fetchStudentByStudentId(id)
    │   IF found AND name matches AND spins remain:
    │     → setCurrentStudentId(session)  → return { success, student }
    │   IF found AND name mismatch:
    │     → return { success: false, error: 'name_mismatch' }
    │   IF found AND max spins reached:
    │     → return { success: false, error: 'max_spins' }
    │   IF new: → insertStudent()  → setCurrentStudentId()
    └─ Guest type = 'others'
        → fetchStudentByEmail(email)
        IF found AND name matches: → resume session
        IF new: → insertStudent() (student_id = generated 'GUEST-xxx-xxxx')
  → Supabase Realtime fires UPDATE on active_session
    → Admin DashboardTab: currentStudent card populates
    → StudentApp: transitions to 'waiting' screen
```

### 9.2 Spin Registration Flow (Admin → Student)

```
Admin clicks segment button on DashboardTab
  → handleSegmentClick(segmentId)
    → recordSpin(currentStudent.id, segmentId, points)
      → updateStudent() — spinsUsed++, spinHistory.push(segId), score+=pts, status update
      → setSpinResultAndClearStudent() — atomic UPDATE:
          active_session.last_spin_segment_id = segId
          active_session.last_spin_segment_name = segName
          active_session.last_spin_timestamp = Date.now()
          active_session.current_student_id = NULL
  → Supabase Realtime fires UPDATE on active_session
    → AppContext session handler:
        detects new timestamp → sets lastSpinResult
        detects current_student_id = null BUT spin present → does NOT clear currentStudent
    → StudentApp useEffect:
        s1 → 'result-betterluck'
        s2 → 'result-freebee'
        s3/s4/s6 → 'result-question' (with segmentName)
        s5 → 'result-pitch'
        s7 → 'result-resume'
```

### 9.3 Pitch / Résumé Scoring Flow

```
Admin opens Pitch or Résumé score panel (auto-shown after clicking s5/s7)
  → Sets score (0–10) + optional feedback
  → Clicks "Submit Score"
    → submitAdminScore(studentId, score, feedback)
      → updateStudent() — sets pending_score + pending_feedback + adds to score
  → Supabase Realtime fires UPDATE on students
    → AppContext students handler updates currentStudent
      → ResultPitch / ResultResume detects pendingScore set
        → transitions to "score display" sub-state
```

### 9.4 Result Dismissal Flow

```
Result screen auto-timer fires (or user clicks button)
  → onComplete() called in StudentApp
    → reads currentStudentRef.current (stale-closure-safe ref)
    → sendThankYouEmail(student.name, student.email) — fire-and-forget
    → setCurrentStudent(null) — UPDATE active_session.current_student_id = null
    → if student.status === 'locked': screen → 'locked'
    → else: screen → 'idle'
```

### 9.5 Award Claim Flow

```
ResultFreebee / ResultQuestion (correct) mounts
  → check currentStudent.awardedPrize — if set → 'already-awarded' state
  → else call claimAward(currentStudent.id)
    → claimRandomAward RPC (atomic):
        checks student.awarded_prize
        SELECT ... FOR UPDATE SKIP LOCKED (random, remaining > 0)
        UPDATE awards SET remaining_quantity - 1
        UPDATE students SET awarded_prize = name
        RETURN name or NULL
    → fallback: claimAwardClientSide() if RPC fails
  → awardState = 'new-award' / 'no-awards'
  → Supabase Realtime propagates awards + students changes to all clients
```

---

## 10. Student-Facing Pages

### 10.1 StudentApp (`src/pages/student/StudentApp.tsx`)

Screen state machine for the kiosk display.

| State | Trigger | Component |
|---|---|---|
| `'idle'` | Default; after result completion | `IdleRegistration` |
| `'waiting'` | `currentStudent` set via Realtime | `WaitingForSpin` |
| `'locked'` | Student exhausted all spins | `LockedScreen` |
| `'result-betterluck'` | `lastSpinResult.segmentId === 's1'` | `ResultBetterLuck` (overlay) |
| `'result-freebee'` | `lastSpinResult.segmentId === 's2'` | `ResultFreebee` (overlay) |
| `'result-question'` | `lastSpinResult.segmentId` in `['s3','s4','s6']` | `ResultQuestion` (overlay) |
| `'result-pitch'` | `lastSpinResult.segmentId === 's5'` | `ResultPitch` (overlay) |
| `'result-resume'` | `lastSpinResult.segmentId === 's7'` | `ResultResume` (overlay) |

**Rendering Architecture:**
- `IdleRegistration` is always mounted when screen is `'idle'` or any result state (blurred backdrop).
- Result screens are `position: absolute z-50` overlays over the blurred leaderboard.
- `WaitingForSpin` and `LockedScreen` are full-screen replacements.

**Keyboard Shortcuts (dev/demo):** `2`=waiting `3`=idle `4`=locked `5`=betterluck `6`=freebee `7`=question `8`=pitch `9`=resume

### 10.2 IdleRegistration (`src/pages/student/IdleRegistration.tsx`)

Primary idle screen split: 60% live leaderboard (left) + 40% registration panel (right, maroon-branded).

**Tagline animation:** 3 rotating taglines cycle every 4 seconds using Framer Motion `AnimatePresence`.

**Registration tabs:** Switches between Student / Faculty / Guest registration types.

**Delegates to:** `Registration.tsx` for the form UI.

### 10.3 Registration (`src/pages/student/Registration.tsx`)

Unified registration form that adapts per `registrationType` prop.

| Field | Student | Faculty | Guest |
|---|---|---|---|
| Name | ✅ Required | ✅ Required | ✅ Required |
| University ID | ✅ Required (regex) | ✅ Required | ❌ |
| Faculty | ✅ Required (select) | ✅ Required | ❌ |
| Department | ✅ Required (filtered) | ✅ Required | ❌ |
| Semester | ✅ Required | ❌ | ❌ |
| Position | ❌ | ✅ Required | ❌ |
| Organization | ❌ | ✅ Required | ❌ |
| Email | ❌ | ❌ | ✅ Required |
| Phone | ❌ | ❌ | ✅ Required |
| Field of Interest | ❌ | ❌ | ✅ Required |
| Instagram / LinkedIn follow | ❌ | ❌ | ✅ Shown |

**Submit error handling:**
- `name_mismatch` → warning toast (ID exists under a different name)
- `max_spins` → calls `onLocked()`
- success → calls `onComplete()`

### 10.4 WaitingForSpin (`src/pages/student/WaitingForSpin.tsx`)

Full-screen waiting room. Displays the animated SVG spin wheel (idle rotation). Shows student badge (name + ID) with pulsing green online dot. Fully passive — waits for `lastSpinResult` from Realtime.

### 10.5 LockedScreen (`src/pages/student/LockedScreen.tsx`)

End state for students who have used all spins. Shows final rank, total score, student name/ID. "See Leaderboard" button returns to idle state.

### 10.6 ResultBetterLuck (`src/pages/student/ResultBetterLuck.tsx`)

- Segment: s1.
- Props: `triesLeft: number`, `onComplete: () => void`.
- 5-second auto-dismiss with 5 dot progress indicator.
- Shows remaining tries count.

### 10.7 ResultFreebee (`src/pages/student/ResultFreebee.tsx`)

- Segment: s2.
- On mount: checks `awardedPrize` then calls `claimAward()` with 12-second timeout fallback.
- States: `checking` → `new-award` / `already-awarded` / `no-awards`.
- Shows confetti animation (20 falling elements) on new award.
- Displays CDGAI Instagram + LinkedIn handles.
- Auto-dismisses after 18 seconds.

### 10.8 ResultQuestion (`src/pages/student/ResultQuestion.tsx`)

- Segments: s3 (Question Bank), s4 (IQ Games), s6 (Career Questions).
- **Two-screen flow:**
  1. Department picker (pre-selects student's department; all faculty/dept toggles shown).
  2. Question display with 90-second `CountdownTimer`.
- Question selection: filter by `category === segmentName` AND `department === selectedDept`, fallback to `department = null`.
- On correct answer: `updateScore(+10)` + triggers `claimAward()`.
- Auto-transitions 4 seconds after result revealed. On time-up: auto-transitions.
- Visual feedback: correct = green flash; incorrect = red flash on selected + green on correct.

### 10.9 ResultPitch (`src/pages/student/ResultPitch.tsx`)

- Segment: s5.
- **Three sub-states:**
  1. Active timer (60-second `CountdownTimer`) — "Done Pitching" button skips remaining time.
  2. Awaiting judge score — pulsing indicator + escape-hatch button + 60-second fallback.
  3. Score received — large circular score + optional feedback quote.
- Score arrives via Realtime: `currentStudent.pendingScore` transitions state.
- Auto-transitions after 5 seconds once score is displayed.

### 10.10 ResultResume (`src/pages/student/ResultResume.tsx`)

- Segment: s7.
- **Two sub-states:**
  1. Waiting for expert — animated FileText icon + 120-second fallback.
  2. Score received — two tilted card tiles (score + points) + feedback quote.
- Same Realtime score delivery mechanism as ResultPitch.
- Auto-transitions after 8 seconds once score is displayed.

---

## 11. Admin Pages

### 11.1 AdminPanel (`src/pages/admin/AdminPanel.tsx`)

Shell with sidebar navigation. Tabs: Dashboard | Students | Categories | Settings | Export.

- Desktop: fixed 64px left sidebar with icon nav buttons.
- Mobile: top header + bottom tab bar.
- "Exit to Monitor" link (`<a href="/">`) at sidebar bottom.

### 11.2 DashboardTab (`src/pages/admin/DashboardTab.tsx`)

Primary operational screen.

**Stats Row (4 cards):** Total Students | Active Now | Questions Answered | Top Score

**Current Student Card:**
- Name, ID, department, tries used/total, score.
- Spin history chips (colour-coded per segment).
- Status badge.
- Placeholder when no student is at the booth.

**Segment Buttons Grid (7 buttons):**
- Each button coloured with segment colour.
- Click → `recordSpin()` → spin result propagates via Realtime.
- Disabled when: no current student / student maxed spins / `spinningRef.current === true` (3-second debounce).
- s5 click → reveals Pitch Score Panel (orange/amber theme, 0–10 slider, feedback textarea).
- s7 click → reveals Résumé Score Panel (green theme, same structure).

**Session Analytics (live charts):**
- Participants by Faculty (bar chart)
- Participant Types (pie chart: CECOS Student / Faculty / Guest)
- Spin Outcomes (horizontal bar, segment colours)
- Prizes Won (horizontal bar)
- Participants by Department (full-width bar, top 8)

### 11.3 StudentsTab (`src/pages/admin/StudentsTab.tsx`)

**Filters:** Search (name/ID substring) + Status tabs (All/Active/Locked/Banned).

**Table:** Name | ID | Email | Phone | Department | Score | Spins | Status | Actions

**Per-row actions:**
- Edit Tries — opens modal, number input 1–10 → `editTries()`
- Add Manual Score — opens modal, slider 0–10 + feedback → `submitAdminScore()`
- Ban / Unban — `banStudent()` / `unbanStudent()` with loading spinner (`actionLoadingId` state)

### 11.4 CategoriesTab (`src/pages/admin/CategoriesTab.tsx`)

Manages custom departments beyond the 12 built-in ones.

- Create: name + faculty select → `addCustomDepartment()` (duplicate check against built-in + existing custom).
- Edit: inline edit with save/cancel.
- Toggle active/inactive: `updateCustomDepartment({ is_active: !current })`.
- Delete: two-step confirmation → `removeCustomDepartment()`.
- Duplicate detection is case-insensitive.

### 11.5 SettingsTab (`src/pages/admin/SettingsTab.tsx`)

**Section A — Participation Rules:**
- Max Tries per Student → `updateMaxTriesDefault()`
- Segment 2 Reward Points → `updateRewardPoints()`

**Section B — Question Bank Management:**
- Shows total question count.
- "Import All Bundled" → fetches all 12 CSVs from `public/questions/`, parses, per-dept delete + insert.
- Single file upload (CSV or XLSX) → parse → preview → per-dept replace.
- "Clear All Questions" (requires `window.confirm`).
- "Delete by Department" per-dept buttons.

**Section C — Awards Management:**
- Lists awards with remaining/total quantities + Available/Exhausted badges.
- "Add Award" form: name + quantity → `addAward()`.
- Delete button per award (with `window.confirm`) → `removeAward()`.

**Section D — Event Details:**
- Event name text input → `updateEventName()`.

**Section E — Danger Zone:**
- Reset Leaderboard: requires typing "RESET" → calls `resetSessionData()`.

### 11.6 ExportTab (`src/pages/admin/ExportTab.tsx`)

| Export | Filename | Content |
|---|---|---|
| Full Session | `session-full-export.xlsx` | 3 sheets: Participants + Spin Log + Leaderboard |
| Participants List | `participants.xlsx` | Name, ID, Email, Phone, Faculty, Dept, Score, Spins, Status, Prize |
| Spin Log | `spin-log.xlsx` | One row per spin: Name, ID, Spin #, Segment |
| Leaderboard | `leaderboard.xlsx` | Rank, Name, ID, Faculty, Dept, Score, Spins, Status |

Download buttons show spinner → "Exported ✓" state for 3 seconds. Last export timestamp shown per type.

---

## 12. Shared Components

### 12.1 SpinWheel (`src/components/SpinWheel.tsx`)

SVG-based animated wheel.

| Prop | Type | Description |
|---|---|---|
| `segments` | `Segment[]` | Wheel slices |
| `isSpinning` | `boolean` | Triggers spin animation |
| `targetSegmentId` | `string` | Segment to land on |
| `onSpinComplete` | `() => void` | Called when animation ends |

- 500×500 viewBox. Group rotated –90° so segment 1 starts at top.
- Idle: continuous 40-second clockwise loop.
- Spin: 5 extra rotations + angle to center `targetSegmentId` under pointer. Cubic ease `[0.2, 0.8, 0.2, 1]` over 5 s.
- Note: Admin uses segment buttons to record results — the wheel visual is on WaitingForSpin in idle mode only.

### 12.2 CountdownTimer (`src/components/CountdownTimer.tsx`)

Circular SVG timer with stroke-dashoffset animation.

| Prop | Default | Description |
|---|---|---|
| `totalSeconds` | required | Total countdown duration |
| `onComplete` | — | Callback when timer reaches 0 |
| `size` | 120 | SVG dimensions |
| `color` | `'#2563EB'` | Arc stroke colour |

- `aria-live="polite"` on the numeric display.
- Used in `ResultPitch` (60 s) and `ResultQuestion` (90 s).

### 12.3 Logo (`src/components/Logo.tsx`)

Presentational maroon circle with "CDGAI" text.

| Prop | Default |
|---|---|
| `size` | `'md'` (`'sm' \| 'md' \| 'lg' \| 'xl'`) |
| `className` | — |

---

## 13. Services Layer

All services are pure async functions — no local state, no context coupling. All call Supabase directly.

### 13.1 `students.ts`

| Function | Query |
|---|---|
| `fetchStudents()` | `SELECT * ORDER BY score DESC` |
| `fetchStudentByStudentId(id)` | `WHERE student_id = ?` |
| `fetchStudentById(id)` | `WHERE id = ?` |
| `fetchStudentByEmail(email)` | `WHERE email = ?` (case-insensitive) |
| `fetchStudentByNameFacultyDept(name, faculty, dept)` | `WHERE ilike(name) AND faculty = ? AND department = ?` |
| `insertStudent(data)` | `INSERT ... SELECT` |
| `updateStudent(id, fields)` | `UPDATE WHERE id = ?` (partial) |
| `deleteAllStudents()` | `DELETE WHERE id != '00000000...'` |

### 13.2 `session.ts`

| Function | Description |
|---|---|
| `fetchSession()` | `SELECT WHERE id = 'singleton'` |
| `setCurrentStudentId(id \| null)` | `UPDATE current_student_id + updated_at` |
| `setSpinResultAndClearStudent(segId, segName)` | Atomic UPDATE: sets spin result + clears `current_student_id` |
| `clearSpinResult()` | Nulls all spin fields |
| `resetSession()` | Nulls all fields |

### 13.3 `segments.ts`

| Function | Description |
|---|---|
| `fetchSegments()` | `SELECT * ORDER BY id` (read-only) |

### 13.4 `questions.ts`

| Function | Description |
|---|---|
| `fetchQuestions()` | Paginated SELECT in 1000-row batches |
| `fetchQuestionsByDepartments(depts[])` | `WHERE department IN (...)` |
| `deleteAllQuestions()` | Delete all rows |
| `deleteQuestionsByDepartment(dept)` | `WHERE department = ?` |
| `deleteNullDepartmentQuestions()` | `WHERE department IS NULL` |
| `insertQuestions(questions[])` | Batched INSERT in chunks of 500 |

### 13.5 `awards.ts`

| Function | Description |
|---|---|
| `fetchAwards()` | `SELECT * ORDER BY name ASC` |
| `insertAward(name, quantity)` | INSERT both total + remaining = quantity |
| `deleteAward(id)` | DELETE by id |
| `claimRandomAward(studentId)` | RPC call with client-side fallback |
| `claimAwardClientSide(studentId)` | Non-atomic fallback: fetch → pick random → decrement → update student |

### 13.6 `departments.ts`

| Function | Description |
|---|---|
| `fetchDepartments()` | `SELECT * ORDER BY created_at` |
| `insertDepartment(name, faculty)` | INSERT |
| `updateDepartment(id, updates)` | UPDATE (partial: name, faculty, is_active) |
| `deleteDepartment(id)` | DELETE |

### 13.7 `settings.ts`

| Function | Description |
|---|---|
| `fetchSettings()` | `SELECT WHERE id = 'singleton'`; returns null silently if absent |
| `updateSettings(patch)` | UPSERT with `{ id: 'singleton', ...patch }` |

### 13.8 `email.ts`

| Function | Description |
|---|---|
| `sendThankYouEmail(name, email)` | Calls `supabase.functions.invoke('send-thankyou-email')`; never throws |

---

## 14. Question Import System

Located in `src/pages/admin/SettingsTab.tsx`.

### 14.1 Supported Formats

- `.csv` (comma-separated)
- `.xlsx` (Excel)

Both parsed via SheetJS (`xlsx` library).

### 14.2 Column Header Normalization (`HEADER_LOOKUP`)

The parser accepts many aliases:

| Canonical Column | Accepted Aliases |
|---|---|
| `text` | `question`, `question_text`, `q`, `question text` |
| `option_a` | `a`, `answer_a`, `choice1`, `option1` |
| `option_b` | `b`, `answer_b`, `choice2`, `option2` |
| `option_c` | `c`, `answer_c`, `choice3`, `option3` |
| `option_d` | `d`, `answer_d`, `choice4`, `option4` |
| `correct_answer_index` | `correct`, `answer`, `correct_answer`, `answer_index` |
| `category` | `type`, `question_type`, `topic` |
| `department` | `dept`, `faculty`, `program` |

Zero-based option columns (`option0`) are treated as the first option.

### 14.3 Parsing Pipeline (`parseSingleFile`)

1. Parse via `xlsx.read()`.
2. Normalize column headers.
3. Infer `department` from filename if column absent (`deptFromFilename`).
4. Normalize department spelling via `DEPARTMENT_LOOKUP` (handles typos/abbreviations).
5. Normalize category via `CATEGORY_LOOKUP`.
6. Category inference when absent:
   - Check question text for keywords (IQ patterns → `IQ Games`; career patterns → `Career Questions`).
   - For files ≥ 180 rows: rows 0–79 = Question Bank, 80–139 = IQ Games, 140+ = Career Questions.
7. Validate required columns; skip invalid rows; accumulate error messages.
8. Return `{ questions[], rowCount, errors[] }`.

### 14.4 Import Modes

**Import All Bundled:**
- Fetches all 12 CSVs via `fetch('/questions/<filename>')`.
- For each file: delete existing questions for that department → insert new batch.
- Failure in one department does not abort others.
- Calls `refreshQuestions()` on completion.

**Single File Upload:**
- Parse → preview row count → user confirms.
- Delete existing for inferred department → insert new batch.
- Does not touch other departments.

### 14.5 Questions Generator Vite Plugin (`vite.config.ts`)

On every `npm run dev` / `npm run build`, the plugin automatically:
1. Reads all 12 CSV files from `public/questions/`.
2. Parses 10 questions per category per department (30 total per dept, 360 total).
3. Writes `src/data/questions.ts` — a static TypeScript module exporting `QUESTIONS_BY_DEPT`.

This enables offline/fallback question lookup without a DB fetch.

---

## 15. Custom Departments System

### Overview

Beyond the 12 hardcoded departments, admins can define custom departments via **CategoriesTab**. These are stored in the `departments` table and merged into the registration form and leaderboard filters at runtime.

### How Custom Departments Work

1. Admin creates a department → stored in `departments` table (`is_active = true`).
2. On app init, `fetchDepartments()` loads all custom departments.
3. Active custom departments are pre-loaded with their questions from the DB (`fetchQuestionsByDepartments()`).
4. `getDepartmentsForFaculty(faculty)` returns built-in + active custom departments for that faculty.
5. Registration form uses this merged list for department dropdowns.
6. Leaderboard filters include custom departments.
7. Question picker in `ResultQuestion` shows all active departments.

### Validation

- Name cannot be empty.
- Name cannot duplicate any existing built-in or custom department (case-insensitive check).
- Faculty must be one of the 3 built-in faculties or "Custom".

---

## 16. Realtime Synchronization

### Three Supabase Realtime Channels

**Channel: `students-realtime`**
- Events: `INSERT`, `UPDATE`, `DELETE` on `students`.
- On `INSERT`: append to local `students[]` if not already present.
- On `UPDATE`: update matching student in `students[]`; update `currentStudent` if matches.
- On `DELETE`: remove from `students[]`; null `currentStudent` if matches.

**Channel: `awards-realtime`**
- Events: `INSERT`, `UPDATE`, `DELETE` on `awards`.
- Keeps prize inventory synchronized across all admin tabs/devices.

**Channel: `session-realtime`**
- Events: `UPDATE` on `active_session`.
- On `current_student_id` change:
  - Set → look up student in local state (DB fetch if not found) → set `currentStudent`.
  - Null → clear `currentStudent` (with race condition guard, see below).
- On `last_spin_segment_id` + new `last_spin_timestamp`:
  - Set `lastSpinResult` → triggers StudentApp screen transition.
  - Mark timestamp as processed in `lastProcessedSpinTs` ref.

### Race Condition Guard

`setSpinResultAndClearStudent()` writes spin result AND nulls `current_student_id` in a **single atomic DB call**. The Realtime handler detects this combined event (spin set + student cleared in same payload) and does **not** clear `currentStudent` locally — preserving the student reference needed by result screens to display name, score, etc.

---

## 17. Spin Segments & Scoring

| ID | Name | Points | Result Screen | Admin Action |
|---|---|---|---|---|
| s1 | Better Luck Next Time | 0 | ResultBetterLuck | None |
| s2 | 3 Followers + Freebee | `rewardPoints` (default 5) | ResultFreebee | None |
| s3 | Question Bank | +10 if correct | ResultQuestion | None |
| s4 | IQ Games | +10 if correct | ResultQuestion | None |
| s5 | Pitch & Communicate | Admin-scored 0–10 | ResultPitch | Submit score + feedback |
| s6 | Career Questions | +10 if correct | ResultQuestion | None |
| s7 | Résumé Review | Admin-scored 0–10 | ResultResume | Submit score + feedback |

**Admin-scored segments (s5, s7):** `submitAdminScore()` adds the score to `students.score` and simultaneously writes to `pending_score` / `pending_feedback` for the result screen to display.

**Max spins:** Default 3 (read from `settings.max_tries_default`). Admin can adjust per student via StudentsTab → Edit Tries.

**Status transitions:**
- `active` → `locked` when `spinsUsed >= maxSpins` (set on `recordSpin()`).
- `active` ↔ `banned` via admin ban/unban actions.
- `locked` → `active` if admin increases `max_spins` via editTries.

---

## 18. Awards & Prize System

### Setup

Admin adds physical prizes in **SettingsTab → Awards** by entering a name and quantity. Both `total_quantity` and `remaining_quantity` are set to this value at creation.

### Claim Triggers

- **Segment s2 (Freebee):** Always triggers `claimAward()` on mount.
- **Segment s3/s4/s6 (Question):** Triggers `claimAward()` only on a correct answer, and only if the student has not already claimed a prize.

### Claim Guarantee

- A student can only ever hold **one prize** — `awarded_prize` is set once and never overwritten.
- The atomic RPC enforces this at the database level (checks `awarded_prize` before claiming).
- Supabase Realtime propagates inventory changes to all connected clients.

### Inventory States

| State | Condition |
|---|---|
| Available | `remaining_quantity > 0` |
| Exhausted | `remaining_quantity === 0` |

### Fallback Behaviour

If the PostgreSQL RPC fails, `claimAwardClientSide()` executes a non-atomic client-side claim. Under truly concurrent load this could allow over-claiming, but is acceptable for career fair scenarios where simultaneous claims are rare.

---

## 19. Email Notification System

### Architecture

```
StudentApp.handleResultComplete()
  → sendThankYouEmail(student.name, student.email)   [fire-and-forget, never throws]
    → supabase.functions.invoke('send-thankyou-email', { body: { name, email } })
      → Edge Function (Deno, Nodemailer)
        → Builds branded HTML email
        → Sends via SMTP (configured with RESEND_EMAIL_KEY)
```

### Email Template

- Branded with CDGAI maroon header, `Bebas Neue` / `DM Sans` fonts.
- Personalised with participant name (HTML-escaped to prevent XSS).
- Subject: "Thank You for Playing EduWheel!"
- Includes social follow CTAs and event recap.

### Failure Handling

- Email failures are logged (`console.error`) but never thrown.
- UI transitions proceed regardless of email outcome.
- Edge Function returns CORS headers for all responses including `OPTIONS` preflight.

---

## 20. Export System

### Library

SheetJS (`xlsx` v0.18). All files download directly in the browser (`XLSX.writeFile()`).

### Export Schemas

**Full Session Export (`session-full-export.xlsx`)**
- Sheet 1 — Participants: Name, Student ID, Email, Phone, Faculty, Department, Score, Spins Used, Max Spins, Status, Prize Claimed
- Sheet 2 — Spin Log: Student Name, Student ID, Spin Number, Segment Name
- Sheet 3 — Leaderboard: Rank, Name, ID, Faculty, Department, Score, Spins, Status

**Participants (`participants.xlsx`)** — matches Participants sheet above.

**Spin Log (`spin-log.xlsx`)** — one row per individual spin, derived from `spin_history[]`.

**Leaderboard (`leaderboard.xlsx`)** — uses `leaderboard` derived state (sorted by score descending, includes all non-zero-score students).

---

## 21. Security & Access Control

### Supabase RLS

| Table | Anon Read | Anon Write |
|---|---|---|
| `students` | ✅ | ✅ (INSERT + UPDATE + DELETE) |
| `questions` | ✅ | ✅ (needed for import from browser) |
| `awards` | ✅ | ✅ |
| `active_session` | ✅ | ✅ (SELECT + UPDATE only) |
| `segments` | ✅ | ❌ (read-only — no INSERT/UPDATE/DELETE policy) |
| `settings` | ✅ | ✅ (INSERT + UPDATE) |
| `departments` | ✅ | ✅ |

### Admin Access

No authentication. `?mode=admin` is the only gate. Appropriate for a closed, monitored LAN/event network.

> **For internet-facing deployments**: Add Supabase Auth with email/password or SSO, and restrict admin-write RLS policies to authenticated roles.

### Input Validation

| Validation | Where |
|---|---|
| Student ID format: `/^[A-Za-z]{2,4}-\d{3,4}-\d{4}$/` | Client-side (Registration.tsx) |
| Email format | Client-side (Registration.tsx) |
| Required field presence | Client-side (Registration.tsx) |
| `student_id` uniqueness | Database UNIQUE constraint |
| Award over-claim prevention | PostgreSQL `FOR UPDATE SKIP LOCKED` + pre-check |
| Email HTML injection prevention | `name` field HTML-escaped in Edge Function |
| Leaderboard reset confirmation | Requires typing "RESET" exactly |

### Data Sensitivity

No passwords, no government IDs, no payment information stored. Student university IDs and emails are the most sensitive data — handle exports accordingly.

---

## 22. Known Constraints & Edge Cases

| # | Scenario | Behaviour |
|---|---|---|
| 1 | Admin registers spin before student's registration Realtime fires | Atomic `setSpinResultAndClearStudent` + `lastProcessedSpinTs` ref deduplication prevents race |
| 2 | Same university ID, different name | `name_mismatch` error returned; warning shown; registration blocked |
| 3 | Returning student with all spins exhausted | `max_spins` error; `LockedScreen` shown |
| 4 | No questions for student's department | Falls back to `department = null` pool; if still empty, shows "No questions available" + Continue |
| 5 | No prizes in inventory | `claimAward` returns null; `ResultFreebee` shows `no-awards` gracefully |
| 6 | Admin submits pitch score mid-timer | Realtime pushes `pendingScore`; `ResultPitch` immediately transitions to score display |
| 7 | Résumé review — admin never scores | Auto-completes after 120 s |
| 8 | Pitch — admin never scores | Auto-completes after 60 s in awaiting state |
| 9 | Two students registering simultaneously | DB UNIQUE constraint prevents duplicate inserts; only one `current_student_id` in session |
| 10 | Double-click on segment button | `spinningRef` blocks re-click for 3 s |
| 11 | Guest with no department | Appears only in "All" leaderboard tab; question picker shows all departments |
| 12 | Admin tab-switches mid-scoring | Score state is local to DashboardTab; unsaved if tab is left before "Submit" |
| 13 | Network disconnect | Supabase Realtime auto-reconnects; no manual recovery needed |
| 14 | Browser refresh during event | `currentStudent` and last spin result restored from `active_session` on mount |
| 15 | Prize RPC fallback race condition | Client-side fallback is non-atomic; negligible for low-concurrency events |
| 16 | Custom department with no imported questions | Falls back to shared `department = null` pool |
| 17 | Duplicate custom department names | Blocked by case-insensitive check against built-in + existing custom list |
| 18 | Email send failure | Logged silently; UI proceeds normally |
| 19 | CSV import with missing columns | Row is skipped with error logged; import continues for valid rows |
| 20 | Large CSV import (>500 rows) | Batched in 500-row INSERT chunks to avoid request size limits |

---

## 23. Future Considerations

- **Authentication for admin:** Add Supabase Auth to restrict the admin panel to authenticated staff.
- **QR code registration:** Students scan a QR code on their phone to self-register, freeing up the kiosk monitor.
- **Multi-booth support:** Multiple `active_session` rows (keyed by booth ID) for running parallel booths at the same event.
- **Real-time question preview:** Admin sees the same question the student sees, enabling live coaching.
- **SMS fallback for notifications:** For participants without email, send a thank-you SMS via Twilio.
- **Question difficulty tiers:** Assign difficulty levels (easy/medium/hard) to questions with tiered point rewards.
- **Offline mode:** Cache question bank in `localStorage` or IndexedDB so the app works through brief network outages.
- **Printer integration:** Print a score receipt or QR-code voucher for prize redemption at the booth.
