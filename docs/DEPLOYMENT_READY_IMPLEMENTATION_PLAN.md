# Deployment-Ready Full Implementation Plan

Last updated: April 21, 2026
Status: Active execution plan

## Execution Governance

This document is the single execution source for launch readiness.

- Canonical for launch scope, acceptance criteria, release gates, and sign-off.
- Other docs (`ROADMAP.md`, `CHECKLIST.md`, `FUTURE_DEVELOPMENT_PLAN.md`, etc.) are supporting references and may contain historical context.
- In case of conflict, this document takes precedence.

## 1. Objective

Deliver a fully production-ready Tamil learning platform that is functionally complete, secure, test-gated, observable, recoverable, and documented.

This document defines:

1. What "100% complete and deployment-ready" means for this repository.
2. Current verified baseline capabilities.
3. Remaining implementation gaps.
4. A phased execution plan with release gates.
5. A final Definition of Done (DoD) checklist.

## 2. Definition of "100% Complete"

The platform is considered 100% complete for production when all conditions below are true:

1. Functional: Core learner, admin, and content flows are fully working in production.
2. Quality: Backend and frontend lint, tests, coverage gates, and build gates pass in CI.
3. Security: Auth hardening, route rate limits, lockout, secure headers, and secret management controls are active.
4. Reliability: Health/readiness probes, alerting, and documented incident procedures are in place.
5. Recovery: Backup schedule + verified restore drill with recorded RTO/RPO evidence.
6. Release Safety: Staging validation and production rollout/rollback checklists are completed and signed off.
7. Documentation: Product, API, operations, and deployment docs match actual system behavior.

## 3. Verified Current Baseline (Already Implemented)

## 3.1 Product and Content

- Adaptive Tamil learning flow is implemented in frontend learn components.
- Immersive Study Mode toggle exists and persists in local storage.
- Seed generator currently builds a 10-stage curriculum with 333 lessons.
- Seed validation tests assert stage distribution and quality constraints.

## 3.2 Security and Platform Controls

- JWT auth, protected routes, role-based admin checks.
- Route-specific auth rate limiters (login/forgot/reset).
- Account lockout policy on repeated failed login attempts.
- Helmet security headers and CORS origin controls.
- Request ID propagation and structured request logging.

## 3.3 Reliability and Operations

- Health endpoint (`/api/health`) and readiness endpoint (`/api/readiness`).
- Alert aggregation hooks for 5xx and auth-failure spikes.
- Backup and restore runbook exists in docs.

## 3.4 Testing and CI

- Backend lint + tests + coverage scripts.
- Frontend lint + tests + coverage + build scripts.
- Playwright smoke tests for auth/learn/admin flows.
- CI workflow executes backend and frontend quality gates and audits.

## 4. Historical Gaps and Remaining Items

| Priority | Item | Status | Evidence / completion signal |
|---|---|---|---|
| P0 | Documentation drift (legacy references to 53/304 lessons) | Closed | Active docs aligned to 333-lesson baseline or explicitly legacy-tagged |
| P0 | API contract governance (OpenAPI + contract checks) | Closed | OpenAPI contract and CI contract checks are active |
| P0 | Branch protection enforcement for required checks | Closed | Required checks applied: `backend`, `frontend`, `e2e-smoke` |
| P0 | Release governance (staging checklist + rollback playbook) | Closed | Runbooks and sign-off process published |
| P1 | Performance baseline and load thresholds | Closed | `docs/release-evidence/load-baseline-2026-04-21_04-40-31Z.md` |
| P1 | Backup restore drill evidence in current quarter | Closed | `docs/release-evidence/restore-drill-2026-04-21_04-37-24Z.md` |
| P1 | Frontend crash/error observability verification in staging | Closed | `docs/release-evidence/phase2-staging-verification-2026-04-21.md` |
| P0 | Production rollout + 7-day hypercare completion | Open | Phase 4 launch report approved with stable thresholds for 7 days and zero unresolved Sev-1/Sev-2 |

## 5. Phased Execution Plan

## Phase 0 - Documentation and Scope Freeze (1-2 days)

1. Align all curriculum count references to 333 lessons or tag legacy docs explicitly.
2. Freeze API response structures for critical endpoints until OpenAPI contracts are merged.
3. Publish this plan as the single execution source for launch readiness.

Exit criteria:

- No conflicting lesson-count claims in active docs.
- Engineering + QA agree on the release scope and acceptance criteria.

## Phase 0 Completion Evidence (Implemented)

- [x] Active docs aligned to 333-lesson curriculum or legacy-tagged with supersession notice.
- [x] API response structure freeze policy documented pending OpenAPI contract merge.
- [x] API contract-freeze automation added in backend test suite for critical endpoints.
- [x] This document published as canonical launch-readiness execution source.
- [x] Engineering sign-off recorded.
- [x] QA sign-off recorded.

Sign-off record template:

| Role | Owner | Decision | Date | Notes |
|---|---|---|---|---|
| Engineering Lead | msvis | Approved | 2026-04-21 | Scope freeze criteria verified against canonical plan and current evidence artifacts. |
| QA Lead | msvis | Approved | 2026-04-21 | Validation and contract controls reviewed; no blocking scope discrepancies. |

Sign-off artifact location: `docs/PHASE0_SCOPE_SIGNOFF.md`

## Phase 1 - Contract and Test Hardening (2-4 days)

1. Author OpenAPI specification for critical routes:
   - Auth (`register`, `login`, `profile`, password reset flows)
   - Lessons and attempts
   - Admin analytics and lesson management
2. Add contract tests that validate key response payloads against spec.
3. Enforce Playwright smoke E2E as a required status check on the protected release branch (`main` or current default branch).
4. Ensure flaky-test controls (`retries`, deterministic fixtures) are documented.

Exit criteria:

- Contract validation passes in CI.
- E2E smoke runs automatically and is required for merge.

## Phase 1 Completion Evidence (Implemented)

- [x] OpenAPI contract published for critical routes: `docs/openapi/critical-endpoints.openapi.json`
- [x] OpenAPI response validation tests added: `backend/tests/integration.openapi-contract.test.js`
- [x] Contract check added to backend CI gate (`npm run test:contracts`)
- [x] CI job names aligned with required branch checks: `backend`, `frontend`, `e2e-smoke`
- [x] Branch protection policy file added: `.github/branch-protection/main.json`
- [x] Flaky-test controls documented: `docs/TEST_STABILITY_GUIDELINES.md`
- [x] Branch protection policy applied in repository settings for default branch `codex/review-calendar-history` (required checks: `backend`, `frontend`, `e2e-smoke`)

## Phase 2 - Production Hardening and Operational Safety (2-4 days)

1. Finalize secret rotation procedure for JWT/SMTP credentials with ownership and cadence.
2. Confirm production CORS allowlist and proxy settings in deployment environment.
3. Add explicit operational thresholds and alert routing destination ownership.
4. Add error tracking for frontend runtime failures and map severity levels.

Exit criteria:

- Security and observability controls verified in staging and documented.

## Phase 2 Completion Evidence (Completed)

- [x] Secret rotation runbook added with ownership + cadence: `docs/SECRET_ROTATION_RUNBOOK.md`
- [x] JWT rotation grace-window support implemented (`JWT_SECRET_PREVIOUS` accepted for token verification)
- [x] CORS allowlist + trust-proxy runtime verification logging added (`runtime_network_config`)
- [x] Operational alert thresholds and routing ownership documented: `docs/OBSERVABILITY_RUNBOOK.md`
- [x] Frontend runtime error telemetry added (global handlers + React error boundary + backend ingestion endpoint)
- [x] Staging verification evidence captured for security and observability controls: `docs/release-evidence/phase2-staging-verification-2026-04-21.md`

## Phase 3 - Release Candidate Validation (1-2 days)

1. Deploy release candidate to staging.
2. Run full validation suite:
   - Backend lint/tests/coverage
   - Frontend lint/tests/coverage/build
   - Playwright smoke E2E
   - Manual exploratory pass for auth, learn flow, dashboard, admin
3. Execute backup restore drill in non-production and record measured RTO.

Exit criteria:

- All release gates pass.
- Restore drill evidence attached to release notes.

## Phase 3 Completion Evidence (Completed)

- [x] Backend validation gates executed (`npm run lint`, `npm test`, `npm run test:contracts`, `npm run test:coverage`)
   - Result: 55/55 tests passed, coverage gate passed (`All files`: 89.93% statements, 73.31% branches, 91.77% functions, 89.93% lines)
- [x] Frontend validation gates executed (`npm run lint`, `npm test`, `npm run test:coverage`, `npm run build`)
   - Result: 30/30 tests passed, coverage report generated, production build successful
- [x] Playwright smoke E2E passed for auth + learn + admin flows (`npm run e2e`)
   - Result: 3/3 tests passed after stabilizing learn flow selector contract in `frontend/e2e/smoke.spec.js`
- [x] Non-production restore drill executed with measured RTO using MongoDB Database Tools
   - Automation: `backend/scripts/restoreDrill.js` (`npm run drill:restore`)
   - Latest evidence: `docs/release-evidence/restore-drill-2026-04-21_04-37-24Z.md`
   - Achieved RTO: 0.703s (target <= 60 minutes)
- [x] Manual exploratory staging pass recorded (auth, learn, dashboard, admin): `docs/release-evidence/manual-exploratory-staging-pass-2026-04-21.md`
- [x] Consolidated Phase 3 validation report recorded: `docs/release-evidence/phase3-rc-validation-2026-04-21.md`

## Phase 4 - Production Rollout and Hypercare (launch + 7 days)

1. Execute production launch using `docs/PRODUCTION_ROLLOUT_RUNBOOK.md`.
2. Verify post-deploy health and readiness with `backend/scripts/verifyDeployment.js` (`npm run verify:deploy -- --baseUrl https://<backend-domain>`).
3. Monitor 5xx, auth failures, and frontend crash telemetry for 7 days using `docs/HYPERCARE_RUNBOOK.md` and `docs/OBSERVABILITY_RUNBOOK.md`.
4. Publish launch report and daily hypercare logs using templates in `docs/release-evidence/`.
5. If launch-risk triggers are hit, execute `docs/ROLLBACK_PLAYBOOK.md`.

Exit criteria:

- Stable error rates within thresholds for 7 consecutive days.
- No unresolved Sev-1/Sev-2 issues.

## Phase 4 Completion Evidence (Runbook Ready, Execution Pending)

- [x] Production rollout runbook published: `docs/PRODUCTION_ROLLOUT_RUNBOOK.md`
- [x] Rollback playbook published: `docs/ROLLBACK_PLAYBOOK.md`
- [x] Hypercare runbook published: `docs/HYPERCARE_RUNBOOK.md`
- [x] Phase 4 evidence templates published:
   - `docs/release-evidence/phase4-launch-report-template.md`
   - `docs/release-evidence/phase4-hypercare-daily-log-template.md`
- [ ] Production rollout executed in monitored window
- [ ] 7-day hypercare evidence captured with stable thresholds
- [ ] No unresolved Sev-1/Sev-2 at day-7 closeout
- [ ] Phase 4 launch report approved

## 6. Release Gates (Must Pass)

## 6.1 Code and CI Gates

- Backend: lint, tests, coverage threshold, dependency audit.
- Frontend: lint, tests, coverage threshold, build, dependency audit.
- E2E smoke: auth + learn + admin happy paths.

## 6.2 Runtime Gates

- `/api/health` returns healthy.
- `/api/readiness` returns ready (DB + email checks as required).
- Alert hooks verified by controlled test signal.

## 6.3 Operational Gates

- Backup exists within RPO window.
- Latest restore drill result meets RTO target.
- Rollback procedure validated in staging.

## 6.4 Documentation Gates

- Deployment, environment, API, and runbook docs match the shipped code.
- Changelog or release notes summarize user-visible and infra changes.

## 7. Implementation Checklist

Use this checklist as the execution tracker for completion.

## 7.1 Completed Baseline

- [x] Adaptive learning core + admin flow implemented
- [x] 333-lesson seed generator and validation tests in place
- [x] Security baseline (helmet, auth rate limits, lockout)
- [x] Health/readiness endpoints implemented
- [x] Request ID logging + alert thresholds implemented
- [x] CI lint/test/coverage/build/audit baseline in place
- [x] Playwright smoke E2E job added to CI workflow
- [x] Backup/restore runbook documented

## 7.2 Remaining for 100% Deployment Ready

- [x] Resolve documentation drift (legacy lesson counts and outdated narratives)
- [x] Freeze critical API response structures with automated contract tests until OpenAPI merge
- [x] Publish OpenAPI contract and enforce contract checks in CI
- [x] Apply required status checks in GitHub branch protection (`backend`, `frontend`, `e2e-smoke`)
- [x] Finalize release checklist and rollback runbook sign-off process
- [x] Add frontend crash/error observability integration
- [x] Record and attach latest restore drill evidence
- [x] Record load baseline and threshold evidence
- [ ] Execute monitored production rollout and attach Phase 4 launch report
- [ ] Close 7-day hypercare with stable thresholds and zero unresolved Sev-1/Sev-2
- [ ] Approve launch readiness report

## 8. Validation Command Runbook

```bash
# Backend gates
cd backend
npm ci
npm run lint
npm test
npm run test:contracts
npm run test:coverage

# Frontend gates
cd ../frontend
npm ci
npm run lint
npm test
npm run test:coverage
npm run build

# E2E smoke
npm run e2e:install
npm run e2e

# Performance baseline evidence
npm run baseline:load
```

Runtime checks after deployment:

```bash
cd backend
npm run verify:deploy -- --baseUrl https://<backend-domain>

curl https://<backend-domain>/api/health
curl https://<backend-domain>/api/readiness
```

## 9. Ownership and Reporting

Required owners (assign names before execution):

1. Engineering lead: delivery and technical acceptance.
2. QA lead: automation quality and release verification.
3. DevOps/SRE owner: deployment safety, monitoring, and recovery.
4. Product owner: scope lock and go-live approval.

Reporting cadence:

- Daily: progress against remaining checklist.
- Release day: gate pass/fail report.
- Post-launch day 7: hypercare closeout report.

## 10. Success Criteria

This plan is successful when:

1. All P0 items are closed.
2. All release gates pass in CI and staging.
3. Production rollout completes with no critical regressions.
4. Documentation and operational evidence prove the platform is maintainable in production.
