# EduWheel — Resend Email Integration (Session Handoff)

## What Was Done

Integrated Resend thank-you emails into the EduWheel career fair app. After every participant finishes a spin result screen (all outcomes: Better Luck, Freebee, Question, Pitch, Resume), a personalised thank-you email is automatically sent to their registered email address using the `eduwheel-thankyou-email.html` template.

### Files Created / Modified

| File | Status | Purpose |
|---|---|---|
| `supabase/functions/send-thankyou-email/index.ts` | **New** | Supabase Edge Function (Deno) — proxies Resend API call |
| `src/services/email.ts` | **New** | Frontend fire-and-forget wrapper using `supabase.functions.invoke` |
| `src/pages/student/StudentApp.tsx` | **Modified** | Calls `sendThankYouEmail()` inside `handleResultComplete` |

All code is committed and pushed to `main` on `simpwae/cdgai_spinWheel` (commit `b94c887`).

---

## What Still Needs to Be Done

The Supabase Edge Function is written and pushed to git, but **not yet deployed to Supabase**. You need to do this once before emails will actually send.

### Credentials / Config

| Key | Value |
|---|---|
| Supabase Project Ref | `vukfqosxholvqgaxifki` |
| Resend API Key | `re_9xgQA6tD_6tPPRBZnYL5MfjyGLBxbpZah` |
| Email sender | `EduWheel <onboarding@resend.dev>` (testing mode) |
| Edge Function name | `send-thankyou-email` |

---

## Deployment — Option A: CLI (Recommended)

Use the Supabase account that **owns** project `vukfqosxholvqgaxifki`.

**1. Generate a personal access token**
Go to: https://supabase.com/dashboard/account/tokens
→ Click **Generate new token** → copy it

**2. Run these commands in PowerShell (one at a time):**

```powershell
# Set the token (replace with your actual token)
$env:SUPABASE_ACCESS_TOKEN = "YOUR_TOKEN_HERE"

# Link the project
npx supabase link --project-ref vukfqosxholvqgaxifki

# Set the Resend API key as a secret
npx supabase secrets set RESEND_API_KEY=re_9xgQA6tD_6tPPRBZnYL5MfjyGLBxbpZah

# Deploy the edge function
npx supabase functions deploy send-thankyou-email --no-verify-jwt --use-api
```

> `--use-api` avoids needing Docker on Windows.
> `--no-verify-jwt` is required — the student kiosk has no Supabase auth session.

---

## Deployment — Option B: Dashboard UI (No CLI needed)

### Step 1 — Set the secret
Go to: https://supabase.com/dashboard/project/vukfqosxholvqgaxifki/settings/functions
→ Add a new secret:
- **Name:** `RESEND_API_KEY`
- **Value:** `re_9xgQA6tD_6tPPRBZnYL5MfjyGLBxbpZah`

### Step 2 — Deploy the function
Go to: https://supabase.com/dashboard/project/vukfqosxholvqgaxifki/functions
→ Click **Deploy a new function**
→ Name: `send-thankyou-email`
→ Paste the full contents of `supabase/functions/send-thankyou-email/index.ts`
→ Toggle **JWT verification OFF**
→ Deploy

---

## Testing After Deployment

Run this in PowerShell (replace the email with your own):

```powershell
Invoke-RestMethod `
  -Uri "https://vukfqosxholvqgaxifki.supabase.co/functions/v1/send-thankyou-email" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name":"Test User","email":"your@email.com"}'
```

Expected response: `{ "success": true, "id": "..." }`

---

## How It Works (Technical Summary)

```
Student registers → Admin spins wheel → Result screen shown
       ↓
Result screen dismissed (handleResultComplete in StudentApp.tsx)
       ↓
sendThankYouEmail(student.name, student.email)  ← fire-and-forget, never blocks UI
       ↓
supabase.functions.invoke("send-thankyou-email", { body: { name, email } })
       ↓
Edge Function (Deno, runs on Supabase servers)
       ↓
fetch("https://api.resend.com/emails", { Authorization: Bearer RESEND_API_KEY })
       ↓
Email delivered to participant
```

**Key design decisions:**
- Email call is fire-and-forget — a failure never breaks the UI flow
- API key is stored in Supabase secrets, never exposed to the browser
- `currentStudentRef.current` is used (not `currentStudent` state) to guarantee the student object is available when the result screen dismisses
- `onboarding@resend.dev` sender works for testing but has deliverability limits — for the live event, verify a custom domain at https://resend.com/domains and update the `from` field in the edge function

---

## Notes for Production

1. **Custom sender domain:** Replace `onboarding@resend.dev` with `noreply@yourdomain.com` after verifying the domain in the Resend dashboard
2. **Multi-spin duplicate emails:** Students with `maxSpins > 1` get one email per spin. If you want only one email per session, add a guard in `src/services/email.ts` (e.g. only send if `student.spinsUsed === 1`)
3. **Resend free tier:** 3,000 emails/month, 100/day — sufficient for a career fair
