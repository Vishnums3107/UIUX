# Hypercare Runbook (Day 0 to Day 7)

Last updated: April 20, 2026
Owner: DevOps/SRE + Engineering Lead

## 1. Purpose

Define the 7-day post-launch monitoring and incident-response process required for Phase 4 closeout.

## 2. Hypercare Exit Criteria

Hypercare can close only when both conditions are true:

1. Stable error rates within configured thresholds for 7 consecutive days.
2. No unresolved Sev-1 or Sev-2 incidents.

## 3. Monitoring Signals

Monitor these production signals continuously:

| Signal | Source | Threshold basis |
|---|---|---|
| 5xx error rate | backend alerting (`server_5xx_rate`) | `ALERT_5XX_THRESHOLD`, `ALERT_5XX_WINDOW_SECONDS` |
| Auth failure rate | backend alerting (`auth_failure_rate`) | `ALERT_AUTH_FAILURE_THRESHOLD`, `ALERT_AUTH_FAILURE_WINDOW_SECONDS` |
| Frontend runtime error rate | frontend telemetry + backend alerting (`frontend_runtime_error_rate`) | `ALERT_FRONTEND_ERROR_THRESHOLD`, `ALERT_FRONTEND_ERROR_WINDOW_SECONDS`, `ALERT_FRONTEND_ERROR_SEVERITIES` |
| Service health | `/api/health` | must remain healthy |
| Service readiness | `/api/readiness` | must remain ready |

Operational references:

- `docs/OBSERVABILITY_RUNBOOK.md`
- `backend/utils/alerting.js`

## 4. Daily Hypercare Cadence

Minimum required cadence for each day (D1-D7):

1. Start-of-day check:
   - review overnight alerts
   - review unresolved incidents
   - run health/readiness checks
2. Midday check:
   - review signal trend and current threshold headroom
   - confirm no emerging regressions in auth/lesson flows
3. End-of-day check:
   - publish daily hypercare summary
   - update open issue backlog with owner and ETA

Use template: `docs/release-evidence/phase4-hypercare-daily-log-template.md`.

## 5. Incident Severity Policy

| Severity | Definition | Required response |
|---|---|---|
| Sev-1 | Major outage, broad production impact, data integrity/security risk | Immediate incident command, rollback decision in <= 15 minutes |
| Sev-2 | Significant feature degradation with material user impact | Mitigation owner assigned immediately, resolution target within same day |
| Sev-3 | Limited impact issue or workaround available | Backlog and schedule fix in standard sprint |

Sev-1 or unresolved Sev-2 blocks hypercare exit.

## 6. Required Daily Evidence

Record for each day:

- count of threshold alerts by type
- peak observed values for monitored signals
- Sev-1/Sev-2 incidents and current status
- mitigations applied
- decision: healthy day or unstable day

If any day is unstable, reset consecutive-day count to zero.

## 7. Day-7 Closeout

At end of Day 7, publish launch closeout report using:

- `docs/release-evidence/phase4-launch-report-template.md`

Closeout report must include:

1. 7-day signal stability table
2. incident summary and final status
3. unresolved issue statement (must show zero unresolved Sev-1/Sev-2)
4. follow-up backlog for non-blocking improvements

## 8. Escalation Matrix

| Escalation Level | Owner |
|---|---|
| Primary on-call | `ALERT_ROUTING_PRIMARY` |
| Secondary on-call | `ALERT_ROUTING_SECONDARY` |
| Management escalation | `ALERT_ROUTING_ESCALATION` |

If ownership env vars are not populated, assign named responders before launch.
