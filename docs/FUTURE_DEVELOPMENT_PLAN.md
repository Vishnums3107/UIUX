# Future Development Plan - Adaptive Tamil Learning Platform

Last updated: March 11, 2026

## 1. Purpose

This document lists:

- What still needs to be developed before strong production maturity.
- What to build next for product growth, scale, and long-term differentiation.

It complements the existing `ROADMAP.md` and `CHECKLIST.md`, which mostly track completed implementation.

## 2. Current State Snapshot

The platform is feature-rich and test-backed:

- Core auth, adaptive lessons, attempts, dashboard, leaderboard, admin analytics, and lesson CMS are implemented.
- Backend integration tests exist for auth/attempts, admin analytics/progress, security flows, and lesson-admin CMS.
- Frontend UI tests exist for Learn and AdaptiveLesson behavior.
- SMTP-based password reset support and provider setup docs are present.

The next stage should focus on production hardening, reliability, and growth features.

## 3. Required Development (High Priority)

These items are the most important remaining work.

### P0 - Production Readiness and Risk Reduction

1. Observability baseline (must-have)
- Add structured logging (request id, user id, route, latency, status, error code).
- Add error tracking and alerting (backend exceptions, frontend crashes).
- Add health + readiness checks for DB and email transport.
- Acceptance criteria:
  - Every API request is traceable with a correlation id.
  - Alert triggers on repeated 5xx spikes and auth failure spikes.

2. Security hardening
- Add stricter rate limits for auth-sensitive routes:
  - `/api/auth/login`
  - `/api/auth/forgotpassword`
  - `/api/auth/resetpassword/:resettoken`
- Add account lockout policy after repeated failed logins.
- Add security headers (`helmet`) and explicit CORS allowlist in production.
- Add secret rotation playbook for JWT and SMTP credentials.
- Acceptance criteria:
  - Brute-force attempts are throttled and visible in logs.
  - Security headers validated in production response headers.

3. Data protection and recovery
- Add scheduled MongoDB backups and restore runbook.
- Perform restore drill in non-production and record Recovery Time Objective.
- Add data retention policy for attempts/analytics snapshots.
- Acceptance criteria:
  - Backup job verified.
  - Restore drill completed and documented.

4. CI quality gates expansion
- Add lint + formatting checks for backend and frontend.
- Add test coverage reporting and minimum threshold gate.
- Add dependency vulnerability scan in CI.
- Acceptance criteria:
  - PR fails if lint/tests/coverage/security checks fail.

### P1 - User Experience Stability

1. End-to-end user journey tests (Playwright/Cypress)
- Auth flow: register/login/forgot/reset.
- Learn flow: category select -> lesson session -> submit/retry/timeout paths.
- Admin flow: analytics page + lesson CMS create/edit/delete.
- Acceptance criteria:
  - Nightly E2E pass rate >= 95%.
  - At least one smoke E2E run on every merge to main.

2. API contract stability
- Add OpenAPI schema and contract tests for critical endpoints.
- Add response validation in tests for auth, attempts, admin analytics, lesson CMS.
- Acceptance criteria:
  - Breaking API response changes are caught in CI.

3. Email reliability improvements
- Add HTML + text templates for reset emails.
- Add retry strategy (queue/background job) for email send failures.
- Add basic delivery diagnostics endpoint/admin metrics.
- Acceptance criteria:
  - Transient SMTP failures do not silently drop reset requests.

## 4. Future Development Roadmap

### Phase A (0-3 months): Learning Quality Improvements

1. Adaptive engine v2
- Include topic-level mastery (not just global score).
- Track confidence bands per category and difficulty.
- Adjust next-question selection using mastery + recent error patterns.

2. Spaced repetition system
- Re-serve weak questions at optimized intervals.
- Add "review queue" mode on dashboard.

3. Better answer evaluation
- Introduce fuzzy matching for text answers (Tamil transliteration tolerance).
- Add typo-aware feedback instead of binary wrong/correct only.

### Phase B (3-6 months): Content and Teaching Depth

1. Content expansion
- Add guided micro-courses by goal:
  - Basic reading
  - Conversational Tamil
  - Grammar essentials
- Increase advanced sentence and composition lessons.

2. Teacher/admin tooling
- Bulk import/export lessons (CSV/JSON).
- Version history for lessons with rollback.
- Approval workflow for content edits.

3. Pronunciation practice
- Add speech recording and pronunciation scoring for key sounds.
- Add minimal pairs for difficult Tamil phonemes.

### Phase C (6-12 months): Scale and Platform Expansion

1. Mobile-first expansion
- PWA offline lesson support for basic practice.
- Optional React Native app sharing API layer.

2. Social and retention features
- Weekly challenges and streak recovery mechanics.
- Classroom mode / cohort leaderboard.
- Referral and invite flows.

3. Performance and scaling
- Add Redis cache for frequently accessed lesson/category endpoints.
- Add asynchronous job queue for analytics rollups and email.
- Add DB indexing review and query performance dashboard.

## 5. Suggested Execution Order

Recommended sequence:

1. P0 production hardening.
2. P1 stability automation (E2E + contracts + email reliability).
3. Phase A learning-quality upgrades.
4. Phase B content and teaching depth.
5. Phase C scale and expansion.

## 6. Delivery Tracking Template

Use this template for each new work item:

- Title:
- Priority: P0 / P1 / P2
- Owner:
- Scope:
- Risks:
- Dependencies:
- Acceptance criteria:
- Target release date:
- Status: Not started / In progress / Done

## 7. Immediate Next Sprint (Recommended)

Sprint focus (2 weeks):

1. Add structured logging + correlation id.
2. Add auth route-specific rate limits + lockout policy.
3. Add Playwright smoke E2E for auth + learn + admin.
4. Add CI lint/coverage/security gates.
5. Document backup + restore runbook and execute one restore drill.

Success definition for the sprint:

- No critical blind spots in production monitoring.
- Core user paths protected by automated smoke E2E.
- Security and recovery baselines in place for safer production operation.
