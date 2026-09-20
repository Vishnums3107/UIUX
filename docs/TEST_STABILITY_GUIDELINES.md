# Test Stability Guidelines

This document defines flaky-test controls used by this repository and required for launch readiness.

## 1. Retry Policy

- Playwright smoke E2E retries are enabled only in CI:
  - File: `frontend/playwright.config.js`
  - Setting: `retries: isCI ? 2 : 0`
- Unit/integration tests (`node --test`, Vitest) run without global retries by default.
- If a new test is unstable, fix determinism first. Retries are a temporary mitigation, not a permanent substitute.

## 2. Deterministic Fixture Controls

### Backend integration tests

- Use `mongodb-memory-server` with isolated test database names.
- Clear collections in `beforeEach` to prevent state bleed.
- Avoid real network calls or external providers.
- Pin auth and rate-limit environment variables in test setup to prevent incidental throttling.

### Frontend unit/integration tests

- Mock browser-only APIs (`speechSynthesis`, timers, media) in test setup.
- Use fake timers for countdown/timeout behaviors where applicable.
- Use explicit seed data and avoid random generation unless seeded.

### E2E smoke tests

- Use dedicated backend test server bootstrap (`backend/tests/e2e/start-test-server.js`).
- Use fixed base URLs and ports in Playwright config.
- Keep smoke flow short and deterministic (auth, learn, admin happy path).

## 3. Flake Triage Standard

If a test flakes:

1. Capture failure output and identify nondeterministic dependency.
2. Convert unstable dependency to deterministic fixture/mocking.
3. Add or tighten assertions around deterministic state boundaries.
4. Re-run target suite repeatedly before merge.
5. Keep retries only where justified and documented.

## 4. CI Gate Expectations

- Backend gate must pass lint, tests, OpenAPI contract test, and coverage.
- Frontend gate must pass lint, tests, coverage, and build.
- E2E smoke gate must pass with CI retry policy.

These three checks are required for branch protection on `main`:

- `backend`
- `frontend`
- `e2e-smoke`
