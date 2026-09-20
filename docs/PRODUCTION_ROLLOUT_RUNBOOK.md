# Production Rollout Runbook

Last updated: April 20, 2026
Owner: DevOps/SRE + Engineering Lead

## 1. Purpose

Execute a controlled production launch with explicit go/no-go checkpoints, clear rollback triggers, and auditable sign-off evidence.

This runbook is the Phase 4 execution guide referenced by `docs/DEPLOYMENT_READY_IMPLEMENTATION_PLAN.md`.

## 2. Required Inputs

Before release-day execution, confirm all inputs are available:

- Release identifier (tag or commit SHA)
- Backend production URL
- Frontend production URL
- On-call roster (engineering, QA, product)
- Incident channel and paging destination
- Latest restore drill evidence (`docs/release-evidence/`)

## 3. Entry Criteria

Do not start rollout unless all entry criteria are true:

- Phase 3 automated gates are green (backend, frontend, e2e smoke).
- Open P0 launch blockers are zero.
- Backup status is healthy and within RPO window.
- Rollback owner is assigned and reachable.
- Hypercare owner is assigned for all 7 days.

## 4. Roles and Responsibilities

| Role | Responsibility |
|---|---|
| Engineering Lead | Final go/no-go decision for technical release readiness |
| QA Lead | Confirms validation status and post-deploy smoke pass |
| DevOps/SRE | Executes deployment, monitors telemetry, leads rollback if needed |
| Product Owner | Business go/no-go and stakeholder communications |

## 5. Rollout Sequence

Use a monitored release window with strict checkpoints.

### 5.1 T-30 Minutes: Pre-Flight

1. Announce release start in incident/release channel.
2. Freeze non-release merges.
3. Confirm production configuration changes are approved.
4. Confirm on-call responders acknowledge readiness.

### 5.2 T-0: Backend Deployment

1. Deploy backend artifact to production.
2. Verify runtime network config logs show expected CORS and `trustProxy` values.
3. Run automated post-deploy verification:

```bash
cd backend
npm run verify:deploy -- --baseUrl https://<backend-domain>
```

Expected result: health and readiness checks both pass.

### 5.3 T+10 Minutes: Frontend Deployment

1. Deploy frontend artifact to production.
2. Validate `VITE_API_URL` points to the production backend.
3. Run smoke checks for register/login/learn/admin path.

### 5.4 T+20 to T+60 Minutes: Monitored Window

At each checkpoint (T+20, T+40, T+60):

1. Review alert stream for `server_5xx_rate`, `auth_failure_rate`, and `frontend_runtime_error_rate`.
2. Confirm no Sev-1 or Sev-2 incidents are open.
3. Confirm no sustained threshold breaches.
4. Record observations in launch report template.

## 6. Rollback Triggers

Trigger rollback immediately when any trigger is true:

- Sev-1 incident declared.
- Repeated Sev-2 incident with no mitigation inside 15 minutes.
- Health/readiness fails after deployment and cannot be stabilized quickly.
- Sustained threshold breach for any production alert type during monitored window.

Rollback execution reference: `docs/ROLLBACK_PLAYBOOK.md`.

## 7. Exit to Hypercare

Move from release window to 7-day hypercare only when all checks pass:

- Deployment verification script passed.
- Smoke checks passed.
- No unresolved Sev-1/Sev-2 incidents.
- Launch report initialized.

Hypercare execution reference: `docs/HYPERCARE_RUNBOOK.md`.

## 8. Release-Day Evidence Checklist

Attach all artifacts to release evidence folder:

- Launch report (`docs/release-evidence/phase4-launch-report-<date>.md`)
- Verification output summary
- Incident timeline (if any)
- Go/no-go decision record
- Rollback timeline (if rollback executed)
