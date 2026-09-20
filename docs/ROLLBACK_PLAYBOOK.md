# Rollback Playbook

Last updated: April 20, 2026
Owner: DevOps/SRE

## 1. Purpose

Provide a fast, deterministic procedure to restore service when a production rollout introduces critical regressions.

Use this playbook together with:

- `docs/PRODUCTION_ROLLOUT_RUNBOOK.md`
- `docs/BACKUP_RESTORE_RUNBOOK.md`
- `docs/OBSERVABILITY_RUNBOOK.md`

## 2. Rollback Trigger Conditions

Start rollback when one or more conditions are met:

- Sev-1 incident declared (service unavailable, widespread auth failures, data integrity risk).
- Sev-2 incident persists beyond mitigation target during rollout window.
- Post-deploy health/readiness checks fail and rapid fix is not viable.
- Alert thresholds are repeatedly breached with user-facing impact.

## 3. Immediate Stabilization Actions (First 5 Minutes)

1. Declare incident and assign incident commander.
2. Pause new deployments and merge activity.
3. Communicate customer impact and investigation status in release/incident channel.
4. Capture current release identifier and previous known-good release identifier.

## 4. Rollback Procedure

### 4.1 Backend Rollback

1. Re-deploy previous known-good backend version.
2. Confirm environment variables did not regress (JWT, CORS, telemetry, readiness settings).
3. Run verification:

```bash
cd backend
npm run verify:deploy -- --baseUrl https://<backend-domain>
```

### 4.2 Frontend Rollback

1. Re-deploy previous known-good frontend build.
2. Confirm frontend points to the intended backend API.
3. Execute smoke checks for auth, lesson submission, and admin analytics.

### 4.3 Data Recovery (Only if Needed)

If rollback requires data restoration:

1. Follow `docs/BACKUP_RESTORE_RUNBOOK.md`.
2. Execute non-destructive validation first.
3. Record measured RTO/RPO and data reconciliation outcome.

## 5. Post-Rollback Validation

Rollback is complete only when all checks pass:

- `/api/health` returns `status: ok`.
- `/api/readiness` returns `status: ready`.
- Alert volume returns below configured thresholds.
- Critical user flows pass smoke validation.
- No unresolved Sev-1/Sev-2 incident remains.

## 6. Communication and Reporting

Before closing the incident:

1. Publish rollback summary with start/end timestamps.
2. Document impact scope, affected users, and mitigation timeline.
3. Open follow-up backlog items for permanent fixes.
4. Link incident summary in launch report.

## 7. Required Evidence

Store in `docs/release-evidence/`:

- rollback execution log
- verification results
- incident timeline and severity decisions
- corrective action backlog references
