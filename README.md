# EduWheel — CDGAI Career Fair Spin Wheel App

> A real-time, gamified kiosk application for career fair booths. Students register, a staff member spins a physical wheel, and the student screen instantly shows the matching outcome — trivia question, elevator pitch, résumé review, freebee prize, or better luck — all synchronized live via Supabase Realtime. A live leaderboard ranks participants throughout the event.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Project Structure](#project-structure)
7. [Application Modes & URLs](#application-modes--urls)
8. [Wheel Segments & Scoring](#wheel-segments--scoring)
9. [Database Schema Summary](#database-schema-summary)
10. [Importing Questions](#importing-questions)
11. [Custom Departments](#custom-departments)
12. [Awards & Prize System](#awards--prize-system)
13. [Email Notifications](#email-notifications)
14. [Export System](#export-system)
15. [Available Scripts](#available-scripts)
16. [Keyboard Shortcuts (Dev/Demo)](#keyboard-shortcuts-devdemo)
17. [Known Constraints & Edge Cases](#known-constraints--edge-cases)
18. [Security Notes](#security-notes)

---

## Overview

EduWheel is a **dual-screen kiosk system**:

- **Student Screen** — shown on a monitor/TV at the booth. Students register, watch the spin wheel animation, then see their result.
- **Admin Screen** — opened on a staff tablet/laptop via `?mode=admin`. Staff record the physical wheel result by clicking a segment button; the student screen updates instantly.

The two screens communicate exclusively through **Supabase Realtime** — no polling, no WebSocket server to maintain.

---

## Features

### Student-Facing
| Feature | Details |
|---|---|
| Registration — CECOS Student | Name, University ID, Faculty, Department, Semester |
| Registration — Faculty Member | Name, Position, Organization, Faculty, Department |
| Registration — Guest | Name, Email, Phone, Field of Interest |
| Re-registration | Returning students (same ID) resume where they left off |
| Max spins lock | Students who exhaust all spins are shown a locked screen with their final rank |
| Animated SVG Spin Wheel | Shown on `WaitingForSpin` in idle rotation mode |
| Countdown Timer | 90-second MCQ timer, 60-second pitch timer |
| Live Leaderboard | Top 10 per department, filterable by tab; updates in real time |
| Result: Better Luck | 5-second auto-dismiss, shows remaining tries |
| Result: Freebee | Claims a random prize atomically; shows prize name with confetti |
| Result: Question | MCQ with department filter, auto-graded, +10 pts for correct |
| Result: Pitch | 60-second pitch timer; admin scores 0–10; score appears live |
| Result: Résumé Review | Admin scores 0–10 within 2 minutes; score appears live |
| Thank-you email | Sent fire-and-forget after result dismissal (if email on record) |

### Admin Panel (`?mode=admin`)
| Feature | Details |
|---|---|
| Dashboard | Live event stats, segment trigger buttons, pitch/résumé score panels |
| Session Analytics | Bar + pie charts: participants by faculty, by department, spin outcomes, prizes |
| Students Tab | Search, filter (All/Active/Locked/Banned), edit tries, manual score, ban/unban |
| Categories Tab | Add/edit/toggle custom departments beyond the 12 built-in departments |
| Settings Tab | Import question CSVs, manage awards inventory, configure spin limits + event name |
| Export Tab | Download Excel (.xlsx) — full session, participants list, spin log, leaderboard |
| Leaderboard Reset | Danger zone: wipes all students and resets session (requires typing "RESET") |

---

## Tech Stack

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
| Spreadsheet / Import / Export | SheetJS (xlsx) | 0.18 |
| Charts | Recharts | 3 |
| Email | Supabase Edge Function + Nodemailer | — |

### Design Tokens (Tailwind `tailwind.config.js`)
- `bg-cdgai-dark` — dark background
- `bg-cdgai-maroon` — CDGAI brand maroon (`#C8102E`)
- `text-cdgai-accent` — accent colour

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier is sufficient)

### 1. Clone & Install

```bash
git clone https://github.com/simpwae/cdgai_spinWheel.git
cd cdgai_spinWheel
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the entire contents of [`supabase-setup.sql`](./supabase-setup.sql).  
   This creates all tables, seeds the 7 wheel segments, enables Row Level Security, and activates Realtime on the `students`, `active_session`, and `awards` tables.
3. Also run [`supabase-departments-migration.sql`](./supabase-departments-migration.sql) to create the `departments` table needed for custom department management.
4. Copy your **Project URL** and **Anon Key** from **Project Settings → API**.

### 3. Configure Environment

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
RESEND_EMAIL_KEY=your-resend-api-key-here   # optional — for thank-you emails
```

> The app **throws an error at startup** if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is absent.

### 4. Import Question Banks

After running the SQL setup, open the admin panel and click **Settings → Import All Bundled Questions**. This parses the 12 CSV files in `public/questions/` and inserts them into Supabase.

Alternatively, import via CLI:

```bash
npm run import:bundled-questions
```

### 5. Start Development Server

```bash
npm run dev
```

| URL | Screen |
|---|---|
| `http://localhost:5173/` | Student kiosk view |
| `http://localhost:5173/?mode=admin` | Admin panel |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous API key |
| `RESEND_EMAIL_KEY` | No | Resend API key — enables thank-you emails to participants |

---

## Project Structure

```
├── index.html                          # SPA shell — mounts React at #root
├── package.json
├── vite.config.ts                      # Vite config + Questions Generator plugin
├── tailwind.config.js                  # Custom brand tokens
├── supabase-setup.sql                  # Full DB DDL + seed + RLS + Realtime (run once)
├── supabase-departments-migration.sql  # Adds custom departments table
├── fix-department-names.sql            # Normalizes department name casing (migration)
│
├── public/
│   └── questions/                      # 12 bundled CSV question banks
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
│
├── scripts/
│   ├── build-questions-json.mjs        # Compile CSVs → src/data/questions.ts
│   ├── gen-questions.mjs               # Generate department question CSVs
│   └── import-bundled-questions.mjs    # CLI bulk-import all CSVs into Supabase
│
├── supabase/
│   └── functions/
│       └── send-thankyou-email/
│           └── index.ts                # Supabase Edge Function — sends thank-you email
│
└── src/
    ├── App.tsx                         # Root — routing + mode switch (student vs admin)
    ├── index.css                       # Tailwind base styles
    ├── index.tsx                       # React mount point
    ├── vite-env.d.ts
    │
    ├── components/
    │   ├── SpinWheel.tsx               # Animated SVG wheel (idle rotation + spin-to-segment)
    │   ├── CountdownTimer.tsx          # Circular SVG countdown with stroke-dashoffset animation
    │   └── Logo.tsx                    # CDGAI brand logo
    │
    ├── context/
    │   └── AppContext.tsx              # All state + business logic + Realtime subscriptions
    │
    ├── data/
    │   └── questions.ts                # Static question map (generated by build-questions-json.mjs)
    │
    ├── lib/
    │   ├── supabase.ts                 # Singleton Supabase client
    │   └── database.types.ts           # TypeScript interfaces for all DB rows
    │
    ├── pages/
    │   ├── admin/
    │   │   ├── AdminPanel.tsx          # Admin shell — sidebar nav + tab routing
    │   │   ├── DashboardTab.tsx        # Spin control, live stats, score panels
    │   │   ├── StudentsTab.tsx         # Student management table
    │   │   ├── CategoriesTab.tsx       # Custom departments CRUD
    │   │   ├── SettingsTab.tsx         # Question import, awards, event config
    │   │   └── ExportTab.tsx           # Excel download
    │   └── student/
    │       ├── StudentApp.tsx          # Screen state machine controller
    │       ├── IdleRegistration.tsx    # Idle leaderboard + registration entry
    │       ├── Registration.tsx        # Participant registration form
    │       ├── WaitingForSpin.tsx      # Post-registration waiting screen
    │       ├── LockedScreen.tsx        # All spins used — shows final rank
    │       ├── ResultBetterLuck.tsx    # s1 — 5s auto-dismiss
    │       ├── ResultFreebee.tsx       # s2 — atomic prize claim + confetti
    │       ├── ResultQuestion.tsx      # s3/s4/s6 — MCQ with countdown
    │       ├── ResultPitch.tsx         # s5 — pitch timer + real-time score
    │       └── ResultResume.tsx        # s7 — résumé review + real-time score
    │
    └── services/
        ├── students.ts                 # Student CRUD (Supabase)
        ├── session.ts                  # active_session singleton operations
        ├── segments.ts                 # Segment read
        ├── questions.ts               # Question CRUD + department-scoped queries
        ├── awards.ts                   # Award CRUD + atomic claim RPC
        ├── departments.ts              # Custom departments CRUD
        ├── settings.ts                 # Settings read + upsert
        └── email.ts                    # Fire-and-forget thank-you email call
```

---

## Application Modes & URLs

Routing is handled by React Router v6. Mode is determined by the `?mode=admin` URL parameter — no authentication.

```
http://localhost:5173/            → StudentApp  (kiosk monitor)
http://localhost:5173/?mode=admin → AdminPanel  (staff control)
```

> **Security note:** Admin access is protected only by URL obscurity. For production deployments accessible over the internet, add Supabase Auth or a password gate.

---

## Wheel Segments & Scoring

| ID | Segment Name | Points Awarded | Result Screen | Admin Action |
|---|---|---|---|---|
| s1 | Better Luck Next Time | 0 | ResultBetterLuck | None — auto-dismiss (5 s) |
| s2 | 3 Followers + Freebee | `rewardPoints` (default 5) | ResultFreebee | None — prize claimed automatically |
| s3 | Question Bank | +10 if correct | ResultQuestion | None — auto-graded |
| s4 | IQ Games | +10 if correct | ResultQuestion | None — auto-graded |
| s5 | Pitch & Communicate | 0–10 (admin sets) | ResultPitch | Submit score + optional feedback |
| s6 | Career Questions | +10 if correct | ResultQuestion | None — auto-graded |
| s7 | Résumé Review | 0–10 (admin sets) | ResultResume | Submit score + optional feedback |

- **Default max spins per student:** 3 (configurable in Settings).
- **Segment s2 reward points** are configurable in Settings.
- Students reaching max spins are locked (`status = 'locked'`) and shown `LockedScreen`.

---

## Database Schema Summary

> Full schema with all constraints, RLS policies, and Realtime config is in [`DATABASE.md`](./DATABASE.md).

| Table | Realtime | Description |
|---|---|---|
| `students` | ✅ | All participants — scores, spin history, status, prize |
| `segments` | ❌ | Wheel segments — static, seeded at setup |
| `questions` | ❌ | MCQ question bank — importable per department |
| `awards` | ✅ | Physical prize inventory with quantity tracking |
| `active_session` | ✅ | Singleton — current student + last spin result |
| `settings` | ❌ | Singleton — max tries, reward points, event name |
| `departments` | ❌ | Custom departments added via CategoriesTab |

**Key RPC:** `claim_random_award(p_student_id uuid)` — atomically assigns a random available prize using `FOR UPDATE SKIP LOCKED` to prevent race conditions under concurrent claims.

---

## Importing Questions

### Via Admin UI (recommended)

1. Open `/?mode=admin` → **Settings** tab.
2. Click **Import All Bundled Questions** — imports all 12 department CSVs automatically.
3. Or drag-and-drop / select a single `.csv` or `.xlsx` file.

### Via CLI

```bash
npm run import:bundled-questions
```

### CSV Column Format

The importer accepts many column name aliases. Canonical columns:

| Column | Aliases Accepted |
|---|---|
| `text` | `question`, `question_text`, `q` |
| `option_a` / `option_b` / `option_c` / `option_d` | `a`, `b`, `c`, `d`, `choice1`–`4`, `answer_a`–`d` |
| `correct_answer_index` | `correct`, `answer`, `answer_index` |
| `category` | `type`, `question_type`, `topic` |
| `department` | `dept`, `faculty`, `program` |

- If `category` is absent, it is inferred from question text keywords or positional row ranges.
- If `department` is absent, it is inferred from the filename.
- Categories normalize to one of: `Question Bank`, `IQ Games`, `Career Questions`.

### Bundled Question Banks

13 files in `public/questions/` covering all 12 built-in departments plus an `All_departments.csv` shared pool (no department scope — used as fallback).

---

## Custom Departments

Beyond the 12 built-in departments, admins can add custom departments via **Admin → Categories**:

- Create a new department (name + faculty).
- Toggle active/inactive status.
- Edit or delete existing custom departments.
- Custom departments appear in the registration form and leaderboard filters.
- Questions can be imported for custom departments via single-file upload in Settings.

Built-in departments (hardcoded in `AppContext.FACULTY_DEPARTMENTS`):

| Faculty | Departments |
|---|---|
| Faculty of Engineering | Civil, Mechanical, Electrical, Architecture |
| Faculty of Life Sciences | Pharmacy, Bioscience, Allied Health Sciences, Nursing |
| Faculty of Computing and Management Sciences | Management of Science, Basic Science & Humanities, Computer Sciences, Software Engineering |

---

## Awards & Prize System

1. Admin adds prizes in **Settings → Awards** (name + quantity).
2. When a student lands on **s2 (Freebee)** or **correctly answers a question (s3/s4/s6)**, `claimAward()` is called automatically.
3. An atomic PostgreSQL RPC (`claim_random_award`) picks a random available prize, decrements its `remaining_quantity`, and sets `students.awarded_prize`.
4. A student can only claim **one prize** across all spins — subsequent calls return their existing prize.
5. If no prizes are in stock, `ResultFreebee` shows a "no prizes available" state gracefully.
6. A non-atomic client-side fallback is used if the RPC fails (safe for low-concurrency events).

---

## Email Notifications

A **Supabase Edge Function** (`supabase/functions/send-thankyou-email/index.ts`) sends a branded HTML thank-you email to participants after their result screen dismisses.

- Triggered fire-and-forget from `StudentApp.handleResultComplete()`.
- Only fires if the student's email is on record.
- Uses **Nodemailer** inside the Edge Function — configure `RESEND_EMAIL_KEY` in Supabase project secrets.
- Failures are logged but never block the UI.
- Name is HTML-escaped in the email template to prevent XSS.

---

## Export System

**Admin → Export** tab provides 4 Excel downloads:

| Export | Filename | Sheets / Content |
|---|---|---|
| Full Session Export | `session-full-export.xlsx` | 3 sheets: Participants + Spin Log + Leaderboard |
| Participants List | `participants.xlsx` | Name, ID, Email, Phone, Faculty, Dept, Score, Spins, Status, Prize |
| Spin Log | `spin-log.xlsx` | One row per spin: Student name, ID, Spin #, Segment |
| Leaderboard | `leaderboard.xlsx` | Rank, Name, ID, Faculty, Dept, Score, Spins, Status |

Uses `xlsx` (SheetJS) library — downloads direct to browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all `.ts/.tsx` files |
| `npm run import:bundled-questions` | CLI bulk-import of all 12 CSVs into Supabase |

**Utility scripts** (run with `node scripts/<name>.mjs`):

| Script | Description |
|---|---|
| `build-questions-json.mjs` | Compiles CSVs → `src/data/questions.ts` (static bundle, no DB needed) |
| `gen-questions.mjs` | Generates department question CSV files |
| `import-bundled-questions.mjs` | Bulk imports all bundled CSVs into the live Supabase DB |

---

## Keyboard Shortcuts (Dev/Demo)

Press these keys on the student screen to jump to any state instantly (ignored when focus is in a form field):

| Key | Screen |
|---|---|
| `2` | WaitingForSpin |
| `3` | Idle (leaderboard) |
| `4` | LockedScreen |
| `5` | ResultBetterLuck |
| `6` | ResultFreebee |
| `7` | ResultQuestion (Question Bank) |
| `8` | ResultPitch |
| `9` | ResultResume |

---

## Known Constraints & Edge Cases

| # | Scenario | Behaviour |
|---|---|---|
| 1 | Admin registers spin before student load completes | Atomic `setSpinResultAndClearStudent` + `lastProcessedSpinTs` ref prevents double-processing |
| 2 | Same university ID, different name | Registration returns `name_mismatch`; shows warning; blocks entry |
| 3 | Returning student who has used all spins | Returns `max_spins` error; triggers `LockedScreen` |
| 4 | No questions available for student's department | Falls back to `department = null` (shared pool); if still empty, shows "No questions available" + Continue |
| 5 | No prizes in inventory | `claimAward` returns null; `ResultFreebee` shows `no-awards` state |
| 6 | Admin submits pitch score before timer ends | Realtime pushes `pendingScore`; `ResultPitch` immediately transitions to score display |
| 7 | Résumé review timeout | `ResultResume` auto-completes after 120 s if admin never scores |
| 8 | Pitch waiting timeout | `ResultPitch` auto-completes after 60 s in waiting state |
| 9 | Two students registering simultaneously | `student_id` UNIQUE constraint prevents duplicates; session holds only one `current_student_id` |
| 10 | Double-click on segment button | `spinningRef` guard blocks re-click for 3 s after first click |
| 11 | Guest registration | No university ID/faculty/department required; guests appear only in "All" leaderboard tab |
| 12 | Admin navigates away mid-scoring | Pitch/résumé score state is local to DashboardTab; lost on tab switch until "Submit" is clicked |
| 13 | Network disconnect | Supabase client auto-reconnects Realtime channels |
| 14 | Browser refresh during event | State is restored from Supabase on mount — `currentStudent` and last spin are recovered from `active_session` |
| 15 | Prize over-claiming (RPC fallback) | Client-side fallback is non-atomic; negligible risk for low-concurrency career fair context |
| 16 | Custom department with no questions | Falls back to shared `department = null` pool; prevents blank question screen |

---

## Security Notes

- **No authentication on the admin panel.** Access is controlled by URL secrecy (`?mode=admin`).
- **RLS is configured for anonymous read/write** — appropriate for a closed, monitored event network. Do not deploy on a public internet URL without adding authentication.
- **Student ID uniqueness** is enforced at the database level (UNIQUE constraint), preventing duplicate registrations even under concurrent load.
- **Award claims** use `FOR UPDATE SKIP LOCKED` in the RPC — concurrency-safe at DB level.
- **Email content** is HTML-escaped in the Edge Function before embedding in the email template.
- **No sensitive data** is stored — no passwords, no payment info, no government IDs.
- For production internet deployment, consider adding Supabase Auth and restricting admin RLS policies to authenticated roles only.

---

## License

MIT
