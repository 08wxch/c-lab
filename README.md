# C LAB

A small interactive C course: lesson on the left, editor + console in the centre, AI tutor on the right. The AI receives the current lesson, question, code, stdin, stdout, and stderr.

## Run locally

```bash
cd c-course
./start.sh
# open http://127.0.0.1:8787/login.html
```

The default `.env` runs in **demo mode**: click “เข้าโหมดตัวอย่าง” on the login page. Demo data lives in `data/demo.json` and is safe to reset.

## Supabase (real accounts)

1. Create a Supabase project.
2. Open SQL Editor and run:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (5 starter lessons)
3. In `Authentication → Providers`, enable Email. For local testing, turn off “Confirm email”.
4. Put the project values in `.env`:

```env
DEMO_MODE=0
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=you@example.com
```

`SUPABASE_SERVICE_ROLE_KEY` is **server-only**. Never put it in browser code or commit `.env`.

5. Sign up with `ADMIN_EMAIL`. The API treats that email as admin on `/api/me`; promote other admins in the console.
6. Restart `node server.js` and log in.

## AI key

Open `/admin.html` → **ตั้งค่า AI**.

- Base URL: `https://api.deepseek.com`
- Model: `deepseek-chat`
- Paste a DeepSeek API key and save.

The key is encrypted with AES-256-GCM using `APP_SECRET` before being stored. It is never returned to the browser; the settings API only returns a masked hint. The AI receives only the active lesson/question/code/run context, not the whole database.

## C runner

Docker is preferred:

```bash
docker build -t c-course-runner:latest runner/
# restart server
```

If the image is available, `/api/run` runs GCC inside a no-network, 128 MB, 0.5 CPU container with a 3-second timeout. If Docker or the image is unavailable, it falls back to local `clang` (clearly shown in the UI). The local fallback is for development only; do not expose it to an untrusted network.

## Routes

- `/` landing
- `/login.html`
- `/learn.html` learning dashboard
- `/lesson.html?id=les-1` lesson workspace
- `/admin.html` admin console

## Current machine note

This machine has Apple clang but **no Docker**. The UI will use the local fallback until Docker is installed and the image is built. Build the image before exposing the runner to other people.
