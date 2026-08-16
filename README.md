# VSOKO / Frontend

> Part of the **VSOKO** education quality assessment system.
> 📖 [Full project description and architecture →](https://github.com/VSOKO-Project)

Web UI for the VSOKO platform: students submit feedback on teachers and
disciplines, admins manage criteria, review ratings, generate PDF reports,
and read AI-generated summaries.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- **TanStack Query** — server-state fetching/caching against the backend API
- **Zustand** — client-side state (auth session, UI state)
- **React Router** — routing between student/admin areas
- **Axios** — HTTP client
- **Recharts** — rating/report charts
- **lucide-react** — icons

## Pages

**Student:** submit feedback (`FeedbackFormPage`), view own submitted
feedback (`MyFeedbackPage`), browse workloads (`WorkloadsPage`)

**Admin:** dashboard, feedback list, criteria management, teacher/discipline
ratings, reports, AI-generated summaries

## Running locally

```bash
cp .env.example .env   # VITE_API_BASE_URL, VITE_DEFAULT_PAGE_SIZE
npm install
npm run dev             # http://localhost:3000
```

Environment variables:

| Var | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | backend API base URL | `http://localhost:8000/api` |
| `VITE_DEFAULT_PAGE_SIZE` | default page size for paged lists | `10` |

## Docker

Multi-stage build (node → nginx), API URL baked in at build time:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000/api -t vsoko-frontend .
docker run --rm -p 8001:80 vsoko-frontend
```

## Docker Compose

`docker-compose.yml` runs the image with Traefik labels (host
`vsoko.semao0.ru`, TLS via `semao0resolver`). Requires the external network
`web_network`.

## CI/CD (GitLab)

`.gitlab-ci.yml` follows the same convention as the backend: build/typecheck,
then SSH deploy to staging (`stage` branch) / production (`main` branch) via
`docker compose pull && up -d`.
