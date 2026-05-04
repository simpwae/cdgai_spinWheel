# EduWheel — Career Fair Spin Wheel App

An interactive, real-time kiosk application for career fair events. Students register at a booth, a staff member spins a physical wheel, and the student screen instantly transitions to the matching outcome — trivia question, elevator pitch, resume review, freebee prize, or better luck. A live leaderboard tracks scores and a full admin panel controls the event.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Importing Questions](#importing-questions)
7. [Project Structure](#project-structure)
8. [Available Scripts](#available-scripts)
9. [License](#license)

---

## Features

### Student Side
- **Registration** — students register with name, student ID, faculty, department, email, and phone; guest registration also supported
- **Animated Spin Wheel** — visual SVG wheel displayed on screen
- **Result Screens** — unique screen for each wheel outcome:
  - **Question** — multiple-choice trivia question drawn from the student's department, scored automatically
  - **Pitch** — timed elevator pitch, manually scored by admin in real time
  - **Resume Review** — admin reviews resume and assigns a score
  - **Freebee** — student claims a random physical prize from the award pool
  - **Better Luck** — no points, spin is consumed
- **Countdown Timer** — animated circular timer for time-limited challenges
- **Idle Leaderboard** — live-ranked scoreboard shown when no student is active

### Admin Panel (`?mode=admin`)
- **Dashboard** — live event stats and manual segment trigger (maps physical wheel result to a student screen)
- **Session Analytics** — live charts rendered below the Current Participant card, updated in real time as participants register and spin:
  - **Participants by Faculty** — bar chart
  - **Participant Types** — pie chart (CECOS Student / Faculty / Guest variants)
  - **Spin Outcomes** — horizontal bar chart, each bar coloured by its segment colour
  - **Prizes Won** — horizontal bar chart showing how many times each prize has been claimed
  - **Participants by Department** — full-width bar chart (top 8 departments)
- **Students** — search, filter by faculty/department, ban/unban students, edit remaining spins, assign manual scores and feedback
- **Settings** — manage the question bank (import per-department CSV or combined CSV), manage physical award inventory, configure spin limits
- **Export** — export full student data and results to Excel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3.4 |
| Animations | Framer Motion 11 |
| Icons | Lucide React 0.522 |
| Routing | React Router DOM v6 |
| Backend / DB | Supabase (PostgreSQL + Realtime + RLS) |
| Spreadsheet | SheetJS (xlsx) — import & export |
| Charts | Recharts — Session Analytics graphs |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/simpwae/cdgai_spinWheel.git
cd cdgai_spinWheel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the full contents of [`supabase-setup.sql`](./supabase-setup.sql) — this creates all tables, seeds segments, configures RLS, and enables Realtime
3. Copy your **Project URL** and **Anon Key** from **Project Settings → API**

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
RESEND_EMAIL_KEY=your-resend-api-key-here
```

### 5. Run the development server

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

| URL | Purpose |
|---|---|
| `http://localhost:5173/` | Student kiosk view |
| `http://localhost:5173/?mode=admin` | Admin panel |

### 6. Build for production

```bash
npm run build
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Your Supabase anonymous (public) API key |
| `RESEND_EMAIL_KEY` | Optional | Resend API key for email notifications |

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required — the app will throw an error on startup if either is missing.

---

## Database Schema

All tables are created by [`supabase-setup.sql`](./supabase-setup.sql).

| Table | Purpose |
|---|---|
| `students` | Registered participants — scores, spin history, status |
| `segments` | Wheel segments (name + colour), seeded at setup |
| `questions` | Question bank, organised by department |
| `awards` | Physical prizes with quantity tracking |
| `active_session` | Singleton row — currently active student + last spin result |

> **Realtime** is enabled on `students` and `active_session`, so the leaderboard and admin dashboard update live without polling.

### Wheel Segments (seeded)

| ID | Name | Colour |
|---|---|---|
| s1 | Better Luck Next Time | Gray |
| s2 | 3 Followers + Freebee | Amber |
| s3 | Question Bank | Purple |
| s4 | Elevator Pitch | Blue |
| s5 | Resume Review | Green |
| s6 | Freebee | Pink |
| s7 | Bonus Question | Orange |

---

## Importing Questions

Questions can be imported in **Admin → Settings → Question Bank** by uploading a CSV file.

### CSV Format

Each file must include a header row with these exact columns:

```
category,department,text,option_a,option_b,option_c,option_d,correct_answer_index
```

- `correct_answer_index` — zero-based index of the correct option (0 = option_a, 1 = option_b, …)
- Both per-department CSVs and a combined `All_departments.csv` are supported

### Bundled Question Banks

Pre-built CSVs for all supported departments are included in [`public/questions/`](./public/questions/):

| File | Department |
|---|---|
| `Allied Heath Sciences Question Bank (1).csv` | Allied Health Sciences |
| `Architecuture_Mcqs - Architecture.csv` | Architecture |
| `BioScience-Re - Bioscience MCQs.csv` | Bioscience |
| `BSH_MCQs.csv` | BSH |
| `Civil_Engineering_MCQs_200.csv` | Civil Engineering |
| `Computer_Science_MCQs_200.csv` | Computer Science |
| `Electrical_Engineering_MCQs_200.csv` | Electrical Engineering |
| `Management_Sciences_MCQs_200.csv` | Management Sciences |
| `Mechanical_MCQs_200.csv` | Mechanical Engineering |
| `nursing_200_mcqs.csv` | Nursing |
| `pharmacy_200_mcqs.csv` | Pharmacy |
| `Software eng_200_mcqs.csv` | Software Engineering |
| `All_departments.csv` | All departments combined |

---

## Project Structure

```
├── index.html                        # SPA shell
├── supabase-setup.sql                # Full DB setup (run once in Supabase SQL Editor)
├── fix-department-names.sql          # Migration to normalize department name casing
├── public/
│   └── questions/                    # Bundled CSV question banks (one per department)
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
│   ├── build-questions-json.mjs      # Compile CSVs → src/data/questions.ts (static bundle)
│   ├── gen-questions.mjs             # Generate department question CSVs
│   └── import-bundled-questions.mjs  # CLI bulk import of all CSVs into Supabase
└── src/
    ├── App.tsx                       # Root — routing + student/admin mode switch
    ├── index.css                     # Global Tailwind base styles
    ├── index.tsx                     # React root mount
    ├── vite-env.d.ts                 # Vite env type declarations
    ├── components/
    │   ├── SpinWheel.tsx             # Animated SVG wheel
    │   ├── CountdownTimer.tsx        # Circular SVG countdown timer
    │   └── Logo.tsx                  # Brand logo
    ├── context/
    │   └── AppContext.tsx            # Global state + Supabase Realtime subscriptions
    ├── data/
    │   └── questions.ts              # Static question map built by build-questions-json.mjs
    ├── lib/
    │   ├── supabase.ts               # Singleton Supabase client
    │   └── database.types.ts         # TypeScript types for all DB tables
    ├── pages/
    │   ├── admin/
    │   │   ├── AdminPanel.tsx        # Admin shell with sidebar navigation
    │   │   ├── DashboardTab.tsx      # Spin control + live stats
    │   │   ├── StudentsTab.tsx       # Student management table
    │   │   ├── SettingsTab.tsx       # Question import + award inventory
    │   │   └── ExportTab.tsx         # Excel export
    │   └── student/
    │       ├── StudentApp.tsx        # Student screen controller
    │       ├── IdleRegistration.tsx  # Idle leaderboard + registration entry point
    │       ├── Registration.tsx      # Registration form
    │       ├── WaitingForSpin.tsx    # Post-registration waiting screen
    │       ├── LockedScreen.tsx      # Max spins reached
    │       ├── ResultQuestion.tsx    # Trivia question result
    │       ├── ResultPitch.tsx       # Elevator pitch timer
    │       ├── ResultResume.tsx      # Resume review screen
    │       ├── ResultFreebee.tsx     # Prize claim screen
    │       └── ResultBetterLuck.tsx  # Better luck screen
    └── services/
        ├── students.ts               # Student CRUD
        ├── session.ts                # active_session operations
        ├── segments.ts               # Segment queries
        ├── questions.ts              # Question CRUD + department filtering
        ├── awards.ts                 # Award CRUD + atomic claim RPC
        └── settings.ts               # Settings read + upsert
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run import:bundled-questions` | CLI import of all bundled question CSVs into Supabase |

> **Offline question bundle:** Run `node scripts/build-questions-json.mjs` to compile all department CSVs into `src/data/questions.ts` for use without a live DB connection.

---

## License

MIT
