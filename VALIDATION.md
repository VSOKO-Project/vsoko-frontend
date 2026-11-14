# Release validation

The frontend has been migrated to Vue 3 and TypeScript and redesigned against the supplied VSOKO boards. All existing frontend routes are retained. Login includes the notice about passwords being reset after the server move.

Verified locally:

- A clean `pnpm install --frozen-lockfile` in an empty directory succeeds.
- 85 Vitest unit, component, transport, session and route integration tests pass.
- V8 coverage: 90.19% lines, 88.58% statements, 83.35% branches and 82.96% functions. CI enforces minimum coverage thresholds.
- Vue TypeScript checking and the Vite production build pass.
- All 54 Playwright cases pass across desktop and mobile against the actual production bundle with isolated API fixtures.
- Screenshots of all existing application routes are captured as browser-test artifacts. Login, feedback and dark-theme layouts were visually inspected against the supplied design boards.
- GitLab validates `.gitlab-ci.yml` with no errors or warnings.

Release process:

The pipeline repeats coverage, type checking, the build and browser tests before building the production image. The existing protected-branch manual `deploy` job applies the Kubernetes manifests and waits for rollout. Deployment status is tracked in GitLab; local API fixtures are not production acceptance tests.

The previous production image is `358340a9f23920f5e1f56f2a20200f278b5d4677`. Roll back by applying the manifests with that image SHA through the same deployment process if needed.
