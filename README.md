# VSOKO Frontend

Vue 3 + TypeScript + Vite. The frontend uses the existing VSOKO API and is deployed to https://vsoko.tech through GitLab CI, Docker, nginx and Kubernetes.

The interface uses Golos Text, compact layouts, teal controls, neutral surfaces, numeric ratings and a light/dark toggle that initially follows the system theme. Dropdown menus use accessible Reka UI components. The header displays the current account from the existing JWT name claim. Fonts are served locally; their license is included in `public/fonts/LICENSE.txt`.

## Development

Requires Node 24+ and pnpm 10.30.3. Docker and CI use Node 24.

```sh
corepack enable
corepack prepare pnpm@10.30.3 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Set `VITE_API_BASE_URL` to the API root, such as `https://api.vsoko.tech/api`. It defaults to `/api`. `VITE_DEFAULT_PAGE_SIZE` defaults to 10. The API URL is embedded at build time. Set `VITE_SHOW_PASSWORD_RESET_NOTICE=false` to hide the reset notice above the login card; it defaults to true and is passed through Docker and GitLab CI builds.

## Functionality

- Login, refresh rotation, cross-tab session locking, logout and forced password change. Existing `vsoko.auth.v1` sessions are retained.
- Student workloads, criteria-based feedback, device-local drafts isolated by account and workload, feedback history, editing and deletion during open periods.
- Admin feedback starts with choosing a discipline or teacher. Date and average-grade sorting is applied by the API before pagination; creation timestamps are displayed when available.
- Administrator overview with period-filtered statistics, semester feedback charts, grade distribution and low-grade disciplines; teacher/discipline results, feedback, editable catalogs, live search when merging records, criteria, AI summaries, PDF reports and period management.
- Excel import with explicit add/update/synchronize modes, before/after differences, validation issues, protected workload deletions, semester export with stable catalog IDs and credential downloads. A changed plan requires confirmation again; the final report retains counts, changes and warnings. Deploy with the API version supporting `mode` and `previewToken` (see `vsoko-api/docs/import-workflow.md`).
- The administrator's Export page (`/export`) downloads student credentials for selected or all groups. Import retains a contextual credential download only after a successful import, scoped to the groups in its result.
- Responsive navigation, system/light/dark themes, keyboard rating controls, native modal focus management, loading/error/empty states and 404.

The frontend only displays data and capabilities supplied by the existing API. The mockup's additional features (faculty/department filtering, semester-comparison reports, CSV, anonymity thresholds and comment redaction) need backend contracts and are not represented as implemented guarantees.

## Validation

```sh
pnpm test:coverage                     # unit, component, session, API and route integration tests
VITE_API_BASE_URL=/api pnpm build       # Vue TypeScript check and production bundle
pnpm exec playwright install chromium
pnpm test:e2e                          # desktop + mobile, actual dist bundle with isolated API fixtures
```

Browser tests serve the built `dist/` files through Playwright request interception at `https://vsoko.test`; no listening dev server is required. API fixtures only exist in test files. Run the build again before browser tests after source edits. This suite covers frontend behavior; it does not replace validation against the production API.

CI runs unit/integration tests, type checking, the production build and browser tests before building a production container. The existing protected-branch manual `deploy` job applies Kubernetes manifests and waits for rollout. Browser reports and failure traces are retained as CI artifacts.

## Production

```sh
docker build --build-arg VITE_API_BASE_URL=https://api.vsoko.tech/api -t vsoko-frontend .
docker run --rm -p 8001:80 vsoko-frontend
```

Deploy the tested default-branch pipeline with its existing manual `deploy` job. Roll back by deploying the preceding known-good image SHA through the same Kubernetes manifests. The updated feedback browser requires the accompanying API sorting changes to be deployed first. No infrastructure or database schema changes are required.

Confirmations use the shared app dialog. Background refreshes retain existing data and discard stale responses; changing accounts clears private data. The saved color theme is applied in the HTML head before the app starts.

## System guide

[Product, architecture, integration and operations](https://gitlab.com/vsoko/specs).

## Local mock preview

```sh
pnpm dev:mock
```

Open the printed localhost URL. Sign in as `student` or `admin` with any non-empty password. This mode serves an in-memory API inside Vite with sample workloads, feedback, catalogs and ratings. Feedback and catalog edits last until the server restarts. Import uses static test fixtures; file exports and AI generation are not simulated fully. Unknown endpoints return an explicit error. No production API is contacted, and the mock middleware is enabled only by the development `mock` mode.

The admin navigation groups catalogs, ratings and feedback inside Teachers and Disciplines, with List / Ratings / Feedback tabs. Existing `/ratings`, `/teachers/rating`, `/disciplines/rating` and `/feedback` URLs redirect to these sections. The Dashboard (Сводка) consumes `GET /api/Dashboard`; deploy the accompanying API endpoint before the frontend. Its trend uses equal-weight discipline averages on a fixed 1–5 scale and leaves missing semesters as gaps.

### Анализ отзывов

Страница `/summaries` и сводки в рейтингах используют структурированный отчёт API:
покрытие обработки, темы с количествами и цитатами, отдельные серьёзные сообщения,
предложения категорий. Ссылка на каждый источник ведёт на `/feedback/{id}` и
загружает полный отзыв через авторизованный API. Администратор может добавить
категорию и сохранить статус рассмотрения сообщения с заметкой.
