# Smart Job Tracker

Production-ready full-stack app for tracking job applications end-to-end (pipeline stages, status-history analytics, soft-delete trash, and live company verification via the Brandfetch API).

## Tech stack

### Frontend (`client/`)

| Area | Technology |
|------|----------------|
| UI | React 19, JavaScript (ES modules) |
| Build | Vite 8, `@vitejs/plugin-react` |
| Styling | Tailwind CSS 3 (with custom semantic `text-*` color tokens + `shadow-card` elevation), PostCSS, Autoprefixer |
| Routing | React Router 7 |
| Data fetching / cache | **TanStack Query 5** (`@tanstack/react-query`) |
| HTTP | Axios |
| Motion | Framer Motion 12 |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/utilities` |
| Icons | Lucide React |
| Custom hooks | `useCompanySearch` (debounced Brandfetch lookup) |
| Linting | ESLint 9, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| E2E tests | Playwright (`@playwright/test`) |

### Backend (`server/`)

| Area | Technology |
|------|----------------|
| Runtime | Node.js **18+** (uses native `fetch`), CommonJS |
| HTTP | Express 4 |
| ORM | Prisma 6 + `@prisma/client` |
| Database | PostgreSQL (via `DATABASE_URL`) |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` |
| Validation | Zod (with custom `looksLikeRealName` heuristic refine) |
| Security / logging | Helmet, CORS, Morgan |
| Errors | `express-async-errors`, central error middleware |
| Config | `dotenv` (with required-vars guard at boot) |
| External API | **Brandfetch** Search API (proxied through `/api/companies/verify`) |
| Unit tests | Vitest (service tests with mocked Prisma / bcrypt / JWT helpers) |

### Tooling

- **Prisma Migrate** for schema evolution (three migrations: `init`, `add_status_history`, `add_company_metadata`)
- **Nodemon** for local API dev
- **Docker Compose** — Postgres + API (`docker-compose.yml`, `server/Dockerfile`) for a one-command local stack
- **GitHub Actions** — `.github/workflows/ci.yml` runs client **ESLint**, server **Vitest**, and **Playwright** (with a Postgres service) on push/PR to `main` or `master`

### External services

This project depends on one third-party API:

| Service | Used for | Where it's wired in |
|---------|----------|---------------------|
| **Brandfetch** | Verifying that a company exists before a job is saved + enriching the record with the company's domain and logo | `server/src/services/brandfetch.service.js` (proxy), `client/src/hooks/useCompanySearch.js` (debounced consumer) |

A free Brandfetch developer key (from [brandfetch.com/developers](https://brandfetch.com/developers)) is required to run the app — see the env setup below.

## Docker (Postgres + API)

From the monorepo root (requires [Docker](https://docs.docker.com/get-docker/) with Compose v2):

```bash
docker compose up --build
```

Or: `npm run docker:up` from `smart-job-tracker/`. This starts **Postgres 16** and the **Node API** (migrations run on container start). Check the API with `http://127.0.0.1:5000/health`.

- **Custom secrets (recommended if the API is exposed):**
  ```bash
  JWT_SECRET=your-long-random-string \
  BRANDFETCH_API_KEY=your-brandfetch-key \
  docker compose up --build
  ```
- **Stop:** `docker compose down` (or `npm run docker:down`). Add `-v` to remove the Postgres volume.
- **Frontend:** the React app is not in this compose file. Run it locally with `cd client && npm run dev`, using `VITE_API_URL=http://localhost:5000/api` (see `client/.env.example`).

Ports **5432** (Postgres) and **5000** (API) must be free on the host.

## CI / GitHub Actions

After you push this repo to GitHub, the workflow in `.github/workflows/ci.yml` runs on pushes and pull requests targeting **`main`** or **`master`**:

| Job | What runs |
|-----|-----------|
| `client-lint` | `npm ci` + `npm run lint` in `client/` |
| `server-test` | `npm ci` + `npm test` (Vitest) in `server/` |
| `e2e` | Postgres service container, `prisma migrate deploy`, Playwright Chromium install, `npm run test:e2e` in `client/` |

Rename your default branch to `main` or `master`, or extend the `on:` branches in the workflow file if you use another name.

> CI also needs `BRANDFETCH_API_KEY` available as a repository secret if the e2e job exercises the company-verification flow.

## Automated testing

**Testing strategy:** **Vitest** exercises backend services in isolation (mocked data layer). **Playwright** runs Chromium against the real API and Vite dev server so critical paths (register → login → create job) stay trustworthy as you refactor. Together they are a practical "unit + E2E" setup employers and reviewers often look for on portfolio projects.

**Important — working directory:** `server` and `client` are **siblings** under `smart-job-tracker/`. Commands that use `cd server` only work if your shell is already in **`smart-job-tracker`** (the folder that contains both). If you are inside `client/`, there is no `server` subfolder — use `cd ../server` instead, or `cd ..` first to go to the monorepo root.

### Unit tests (backend — Vitest)

`auth.service` and `job.service` are covered with **Vitest**; Prisma is mocked so tests do not need a live database.

**Option A — from monorepo root** (`smart-job-tracker/`, same level as `client` and `server`):

```bash
cd server
npm install
npm test
npm run test:watch
```

**Option B — stay at root** (after you have run `npm install` inside `server/` at least once):

```bash
npm run test:server
npm run test:server:watch
```

Tests live under `server/src/services/*.test.mjs` (ESM `import` from Vitest + `createRequire` for the CommonJS services). Configuration: `server/vitest.config.cjs`.

### End-to-end tests (frontend — Playwright)

**Playwright** (Chromium) drives a real browser: it registers a user via the **HTTP API**, signs in through `/login`, then creates a job from the dashboard form and asserts the new company name appears in the list.

**From monorepo root** (after `server/.env` exists so the API can start, and `npm install` has been run in `client/`):

```bash
cd client
npm install
npx playwright install chromium
npm run test:e2e
```

Or from root (after `client` deps are installed):

```bash
npm run test:e2e
```

Optional UI mode: `npm run test:e2e:ui` (from `client/`) or `npm run test:e2e:ui` from root.

Specs: `client/e2e/*.spec.js`. Config: `client/playwright.config.cjs` — launches the **API** and **Vite** before tests (or **reuses** servers already listening on `127.0.0.1:5000` / `:5173` when not in CI). You need a working **`server/.env`**, **`npm install` in both `server/` and `client/`**, and **PostgreSQL available** for `DATABASE_URL` so the API can start; otherwise the web-server wait may time out.

If the API is not on `http://127.0.0.1:5000`, set **`PLAYWRIGHT_API_BASE`** for the test's `request` calls.

### If `npm` prints `Cannot read properties of null (reading 'location')`

That usually comes from the **npm CLI** (or cache), not from this repo's scripts. Try, in order: run the command from **`smart-job-tracker`** or `server/` / `client/` as documented above; **`npm cache clean --force`**; upgrade **Node** and **npm** to current LTS; on Windows, run the terminal **as Administrator** once if installs were failing. If it persists, check the log path npm prints under `AppData\Local\npm-cache\_logs\`.

## Features

- **Auth.** Register, login, JWT-protected job API; client auth context with logout.
- **Jobs CRUD.** Create, list, edit, and delete jobs (company, role, status, dates, link, notes, plus enriched `companyDomain` + `companyLogo`).
- **Company verification & enrichment.** The "Add Job" form is a debounced typeahead that hits the Brandfetch Search API through a backend proxy. The submit button stays disabled until the user picks a verified company from the dropdown; the chosen company's logo and domain are saved with the job.
- **Status history.** Every status transition is timestamped in a dedicated `StatusHistory` table, enabling time-in-stage analytics.
- **Dashboard.** Summary tiles by stage (drag-droppable), modal **Add Job** dialog, search, and a three-way **List / Compact / Kanban** density toggle.
- **Drag-and-drop.** Move cards with **@dnd-kit** between Kanban columns, onto matching dashboard status tiles (custom collision / trash priority), and to **Deleted Items** in the sidebar.
- **Trash / restore.** Sidebar drop-to-delete and a **Deleted Items** view backed by **localStorage** with restore.
- **Analytics.** Conversion funnel, status distribution donut, applications-per-week chart, and "Applied → Interview velocity" card derived from `StatusHistory`. Empty-state placeholder encourages first job creation.
- **UX polish.** Skeleton loaders during initial fetch, optimistic updates with rollback/toasts, Framer Motion springs on cards and hover, custom delete confirm (no `window.confirm`).
- **Accessibility.** WCAG AA-compliant text contrast via custom semantic `text-text-{primary,body,muted,hint}` Tailwind tokens; `aria-label`s on icon-only buttons; `aria-hidden` on decorative icons.

## Monorepo structure

```txt
smart-job-tracker/
  client/
  server/
```

## Step-by-step setup (start with backend)

### 1. Backend environment

Copy `server/.env.example` to `server/.env` and fill in the required variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | no | Defaults to `7d` |
| `BRANDFETCH_API_KEY` | **yes** | Get a free key at [brandfetch.com/developers](https://brandfetch.com/developers). The server **will not boot without it.** |
| `PORT` | no | Defaults to `5000` |

### 2. Create database schema

From `server/`:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

The repo currently has three migrations that ship as part of the schema history:

- `init` — initial `User` + `Job` tables
- `add_status_history` — adds the `StatusHistory` model that backs status-change analytics
- `add_company_metadata` — adds `companyDomain` and `companyLogo` columns to `Job` for Brandfetch enrichment

`prisma migrate dev` applies all of them in order on a fresh database.

> **Windows tip:** if `prisma generate` or `migrate dev` fails with `EPERM: rename ... query_engine-windows.dll.node.tmp`, stop running Node processes first: `taskkill //F //IM node.exe`, then retry.

### 3. Run backend

From `server/`:

```bash
npm run dev
```

API base URL: `http://localhost:5000/api`

### 4. Run frontend

From `client/`:

```bash
npm install
# Optional — only if your API isn't at the default localhost:5000:
cp .env.example .env
npm run dev
```

### 5. Use the app

- Register / login at `/register` and `/login`.
- Add a job — start typing a company name, pick it from the verified dropdown, fill in the rest, submit.
- Drag cards between stages, into the Deleted Items sidebar, or onto matching dashboard tiles.

## Backend API

### Auth

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/auth/register` | |
| `POST` | `/api/auth/login` | Returns JWT |

### Jobs (JWT required)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/jobs` | List all jobs for the authed user |
| `POST` | `/api/jobs` | Body validated by Zod + `looksLikeRealName` refine |
| `GET` | `/api/jobs/:id` | |
| `PATCH` | `/api/jobs/:id` | Status changes append a `StatusHistory` row in the same transaction |
| `DELETE` | `/api/jobs/:id` | |
| `GET` | `/api/jobs/metrics/funnel` | Stage counts + conversion percentages |
| `GET` | `/api/jobs/metrics/time-in-status` | Average / min / max days from Applied → Interviewing |

### Companies (JWT required)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/companies/verify?name=Apple` | Proxies Brandfetch Search; returns `{ results: [{ name, domain, logo, verified }] }` |

## Notes

- Backend uses clean layering: **routes → controllers → services**. The Brandfetch integration follows the same pattern (`companies.routes` → `companies.controller` → `brandfetch.service`).
- **Zod handles input validation**, with a small custom `looksLikeRealName` refine (in `server/src/utils/nameValidation.js`) that rejects gibberish like `hjhjkhjk` even if a caller bypasses the form.
- **Central error middleware** handles consistent API error responses; the Brandfetch proxy maps upstream 401/403/404/429 into friendly `HttpError`s.
- Frontend uses an **API abstraction layer** (`client/src/services/`) and a small set of **custom hooks** (`useCompanySearch`) so components stay declarative.
- TanStack Query owns server-state caching for jobs and metrics; Context only holds local UI state.
