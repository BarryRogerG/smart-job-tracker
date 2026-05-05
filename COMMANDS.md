# Smart Job Tracker — Command Cheat Sheet

Quick reference for daily development. For first-time setup (env vars,
Brandfetch key, Prisma migrations) see `README.md`.

> Project root: `C:\Users\bgold\new-practise-folder\smart-job-tracker`
>
> `client/` and `server/` are **siblings**. Open one terminal per service.

---

## 1. Daily startup (most common)

Two terminals, two commands.

**Terminal 1 — backend (Express + Prisma)**

```bash
cd C:/Users/bgold/new-practise-folder/smart-job-tracker/server
npm run dev
```

→ API on `http://localhost:5000/api` (health check: `/health`)

**Terminal 2 — frontend (Vite + React)**

```bash
cd C:/Users/bgold/new-practise-folder/smart-job-tracker/client
npm run dev
```

→ App on `http://localhost:5173`

Stop either with `Ctrl+C` in its terminal.

---

## 2. First-time / fresh-clone setup

Run **once** when you clone, pull big dependency changes, or reset
`node_modules`. Order matters — backend before frontend.

```bash
# from smart-job-tracker/
cd server
npm install
npm run prisma:generate
npm run prisma:migrate          # applies init + add_status_history + add_company_metadata
cd ../client
npm install
```

Don't forget:

- `server/.env` — copy from `server/.env.example`, fill in `DATABASE_URL`,
  `JWT_SECRET`, and **`BRANDFETCH_API_KEY`** (server won't boot without it).
- `client/.env` (optional) — only if API isn't at `http://localhost:5000`.

---

## 3. Database / Prisma

Run from `server/`.

| Goal | Command |
|------|---------|
| Regenerate Prisma client (after `schema.prisma` edits) | `npm run prisma:generate` |
| Create + apply a new migration | `npm run prisma:migrate -- --name <change_name>` |
| Open Prisma Studio (DB GUI) | `npx prisma studio` |
| Reset DB (destroys data, re-runs all migrations) | `npx prisma migrate reset` |

---

## 4. Tests

| Goal | From | Command |
|------|------|---------|
| Backend unit tests (Vitest) | root | `npm run test:server` |
| Backend tests in watch mode | root | `npm run test:server:watch` |
| Frontend E2E (Playwright, Chromium) | root | `npm run test:e2e` |
| Playwright UI mode | root | `npm run test:e2e:ui` |
| Install Playwright browsers (one-time) | `client/` | `npx playwright install chromium` |

`npm run test:e2e` boots its own API + Vite — close the dev servers from
section 1 first, or it'll **reuse** them if they're already up.

---

## 5. Lint

```bash
cd client
npm run lint
```

(No server-side lint script; rely on Vitest + manual review.)

---

## 6. Docker (Postgres + API in one shot)

From `smart-job-tracker/`:

```bash
npm run docker:up        # = docker compose up --build
npm run docker:down      # add -v to also drop the Postgres volume
```

Frontend is **not** dockerized — still run `cd client && npm run dev` locally,
pointing `VITE_API_URL` at `http://localhost:5000/api`.

---

## 7. Build / preview production frontend

```bash
cd client
npm run build            # outputs to client/dist
npm run preview          # serve the built bundle locally
```

> Known issue on Windows: Vite 8's Rolldown bundler can OOM during `build`.
> If it crashes with "Rolldown panicked", stick to `npm run dev` for local
> work and let CI handle production builds.

---

## 8. Windows troubleshooting one-liners

| Symptom | Fix |
|---------|-----|
| `EPERM: rename ... query_engine-windows.dll.node.tmp` during Prisma | `taskkill //F //IM node.exe` then re-run |
| Port 5000 or 5173 already in use | `taskkill //F //IM node.exe` (nukes all Node procs) |
| Server crashes on boot with `BRANDFETCH_API_KEY` missing | Add it to `server/.env` and **save the file** before re-running |
| `Cannot read properties of null (reading 'location')` from npm | `npm cache clean --force`, then retry |
| Prisma command "not found" | You're in the wrong dir — `cd` into `server/` first |

---

## 9. Quick `cd` reference

From anywhere, paste-able:

```bash
cd C:/Users/bgold/new-practise-folder/smart-job-tracker          # root
cd C:/Users/bgold/new-practise-folder/smart-job-tracker/server   # backend
cd C:/Users/bgold/new-practise-folder/smart-job-tracker/client   # frontend
```
