# Release validation

The frontend has been migrated to Vue 3 and TypeScript and redesigned against the supplied VSOKO boards. All existing frontend routes are retained. Login includes the notice about passwords being reset after the server move.

Verified locally:

- A clean `pnpm install --frozen-lockfile` in an empty directory succeeds.
- 108 Vitest unit, component, transport, session and route integration tests pass.
- V8 coverage: 89.54% lines, 88.49% statements, 81.35% branches and 82.29% functions. CI enforces minimum coverage thresholds.
- Vue TypeScript checking and the Vite production build pass.
- All 76 Playwright cases pass across desktop and mobile against the actual production bundle with isolated API fixtures.
- Screenshots of all existing application routes are captured as browser-test artifacts. Login, feedback and dark-theme layouts were visually inspected against the supplied design boards.
- GitLab validates `.gitlab-ci.yml` with no errors or warnings.

Release process:

The pipeline repeats coverage, type checking, the build and browser tests before building the production image. The existing protected-branch manual `deploy` job applies the Kubernetes manifests and waits for rollout. Deployment status is tracked in GitLab; local API fixtures are not production acceptance tests.

The previous production image is `f8083174f00fa753de74bca304b2f1f4e1d5b265`. Roll back by applying the manifests with that image SHA through the same deployment process if needed.

UI refinement checks cover the custom menus with keyboard control and inside native dialogs, the single-button theme control, signed-in identity, removal of footer slogans, automatic merge search and dashboard charts. Representative dashboard screenshots use clearly isolated test data.

The feedback API changes pass 185 application unit tests and 66 integration tests against PostgreSQL and Redis. These checks cover server-side ordering before pagination, cache isolation by sort order, invalid sort/paging input and student access restrictions. Deploy the compatible API before publishing the updated frontend sorting controls. No database schema migration is needed.

The Excel import uses a custom file picker and dropzone with file name/size, replacement, extension and 5 MB validation. Browser tests cover picker activation, drag and drop, replacement and oversize rejection. Initial loading uses layout-specific skeletons; browser tests verify delayed response replacement and reduced-motion support on desktop and mobile.
