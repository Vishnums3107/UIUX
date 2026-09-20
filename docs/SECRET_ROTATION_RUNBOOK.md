# Secret Rotation Runbook

This runbook defines ownership, cadence, and safe execution steps for rotating authentication and email secrets.

## Ownership

| Secret Group | Primary Owner | Secondary Owner | Approval Required |
|---|---|---|---|
| JWT signing secrets (`JWT_SECRET`, `JWT_SECRET_PREVIOUS`) | Engineering Lead | DevOps/SRE | Engineering + QA |
| SMTP credentials (`SMTP_USER`, `SMTP_PASS`) | DevOps/SRE | Engineering Lead | DevOps/SRE + Product Owner |

## Rotation Cadence

| Secret Group | Cadence | Immediate Rotation Triggers |
|---|---|---|
| JWT signing secrets | Every 90 days | Incident response, credential leak, departing privileged engineer |
| SMTP credentials | Every 90 days (or provider policy) | Incident response, provider key compromise, sender-domain change |

## Pre-Rotation Checklist

- Confirm staging and production deployment windows.
- Confirm rollback contact and on-call owner are available.
- Capture baseline metrics: auth success rate, reset-password success rate, 401/429 trends.
- Announce maintenance notice to engineering and QA channel.

## JWT Rotation Procedure

1. Generate new random 64-byte secret.
2. Set new value as `JWT_SECRET`.
3. Move old active value into `JWT_SECRET_PREVIOUS`.
4. Deploy backend.
5. Validate:
   - New login returns valid token.
   - Existing active sessions continue working.
6. Wait for one full token TTL (`JWT_EXPIRE`) plus safety buffer (recommended: +1 hour).
7. Remove expired fallback value from `JWT_SECRET_PREVIOUS`.
8. Redeploy backend and re-run auth smoke tests.

## SMTP Rotation Procedure

1. Create new SMTP credential/API key in provider console.
2. Update `SMTP_USER` and `SMTP_PASS` in secret manager/deployment platform.
3. Deploy backend.
4. Validate:
   - `/api/readiness` returns email ready.
   - Forgot-password flow succeeds.
5. Revoke old SMTP credential in provider console.

## Rollback

If post-rotation validation fails:

1. Restore previous secrets in deployment platform.
2. Redeploy backend.
3. Confirm health/readiness and auth/reset flows recover.
4. Record incident summary and corrective actions.

## Evidence Recording

Store each completed rotation record in release notes or ops tracker with:

- Rotation date/time (UTC)
- Trigger (scheduled/incidental)
- Owners who executed and approved
- Validation evidence links (CI runs, readiness checks, smoke tests)
- Rollback action (if any)
