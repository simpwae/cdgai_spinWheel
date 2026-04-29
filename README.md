# EduWheel

An interactive spin wheel experience for career fair events. Students register, spin a wheel, and get assigned one of several challenges (trivia question, elevator pitch, resume review, freebee prize, or better luck). A real-time leaderboard tracks scores and an admin panel manages the full event.

---

## Features

### Student Side
- **Registration** — students register with name, student ID, faculty, department, email, and phone (guest registration also supported)
- **Spin Wheel** — animated wheel that randomly lands on a segment
- **Result Screens** — unique outcome for each segment:
  - **Question** — answer a trivia question for points
  - **Pitch** — deliver an elevator pitch, scored by admin
  - **Resume** — get your resume reviewed, scored by admin
  - **Freebee** — claim a physical prize from the award pool
  - **Better Luck** — try again on next spin
- **Countdown Timer** — time-limited challenges
- **Idle Leaderboard** — displays live rankings when no student is active

### Admin Panel (`?mode=admin`)
- **Dashboard** — live stats (students registered, spins used, questions answered) and manual segment trigger
- **Students** — search, filter, ban/unban, edit remaining tries, award manual scores
- **Settings** — manage the question bank (import per-department CSV or a combined CSV), manage physical awards inventory, configure participation rules
- **Export** — export student data and results

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide React |
| Backend / DB | Supabase (PostgreSQL + Realtime) |
| CSV Parsing | SheetJS (xlsx) |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/simpwae/cdgai_spinWheel.git
cd cdgai_spinWheel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the full contents of [`supabase-setup.sql`](./supabase-setup.sql)
3. Copy your project URL and anon key from **Project Settings → API**

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

- **Student view** — `http://localhost:5173/`
- **Admin panel** — `http://localhost:5173/?mode=admin`

### 6. Build for production

```bash
npm run build
```

---

## Database Schema

The `supabase-setup.sql` file creates the following tables:

| Table | Purpose |
|-------|---------|
| `students` | Registered participants, scores, spin history |
| `awards` | Physical prizes with quantity tracking |
| `segments` | Wheel segments (name + colour) |
| `questions` | Question bank, organised by department |
| `active_session` | Singleton row — current student on screen + last spin result |

> **Realtime** is enabled on `students` and `active_session` so the leaderboard and admin dashboard update live.

---

## Importing Questions

Questions are imported via CSV in **Admin → Settings → Question Bank**.

Each CSV must have these columns (header row required):

```
category,department,text,option_a,option_b,option_c,option_d,correct_answer_index
```

Sample CSVs for each department are included in [`public/sample-questions/`](./public/sample-questions/).

---

## Project Structure

```
src/
├── components/         # Shared UI (SpinWheel, Leaderboard, CountdownTimer, Logo)
├── context/            # AppContext — global state + Supabase subscriptions
├── lib/                # Supabase client + generated DB types
├── pages/
│   ├── admin/          # AdminPanel, DashboardTab, StudentsTab, SettingsTab, ExportTab
│   └── student/        # StudentApp, Registration, result screens, IdleLeaderboard
└── services/           # Thin Supabase query functions (students, questions, awards, …)
```

---

## License

MIT
