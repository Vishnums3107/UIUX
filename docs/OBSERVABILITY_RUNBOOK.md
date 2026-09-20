# Observability and Alert Routing Runbook

This runbook defines explicit operational thresholds, severity levels, and alert ownership routing for backend and frontend runtime failures.

## Alert Routing Ownership

Set these deployment variables in each environment:

- `ALERT_ROUTING_PRIMARY`
- `ALERT_ROUTING_SECONDARY`
- `ALERT_ROUTING_ESCALATION`
- `ALERT_WEBHOOK_URL` (optional, recommended in staging/production)

Ownership recommendation:

| Routing Field | Suggested Value |
|---|---|
| `ALERT_ROUTING_PRIMARY` | `oncall-backend` |
| `ALERT_ROUTING_SECONDARY` | `oncall-frontend` |
| `ALERT_ROUTING_ESCALATION` | `eng-manager` |

## Thresholds

| Alert Type | Environment Variables | Default |
|---|---|---|
| Backend 5xx rate | `ALERT_5XX_THRESHOLD`, `ALERT_5XX_WINDOW_SECONDS` | 20 in 300s |
| Auth failure rate | `ALERT_AUTH_FAILURE_THRESHOLD`, `ALERT_AUTH_FAILURE_WINDOW_SECONDS` | 25 in 600s |
| Frontend runtime error rate | `ALERT_FRONTEND_ERROR_THRESHOLD`, `ALERT_FRONTEND_ERROR_WINDOW_SECONDS`, `ALERT_FRONTEND_ERROR_SEVERITIES` | 10 in 300s, severities `high,critical` |
| Telemetry ingest guardrail | `FRONTEND_TELEMETRY_RATE_LIMIT_WINDOW_MINUTES`, `FRONTEND_TELEMETRY_RATE_LIMIT_MAX` | 60 events in 5 minutes per IP |
| Alert cooldown | `ALERT_COOLDOWN_SECONDS` | 300s |

## Frontend Runtime Error Severity Mapping

Frontend telemetry endpoint: `POST /api/telemetry/frontend-error`

Severity levels:

- `low`: browser noise events (example: `ResizeObserver loop limit exceeded`)
- `medium`: generic runtime errors without outage indicators
- `high`: chunk-load failures, script loading failures, unhandled promise rejections
- `critical`: memory exhaustion and crash-level failures

## Alert Payload Expectations

Each emitted alert payload includes:

- `alertType`
- `severity`
- threshold/window metadata
- `routing.primary`
- `routing.secondary`
- `routing.escalationPolicy`
- `routing.destination` (`webhook` or `logs_only`)

## Staging Verification Checklist

Run this checklist before production rollout:

1. Confirm backend logs include `runtime_network_config` with expected CORS origins and trust proxy value.
2. Trigger a controlled frontend telemetry event and verify `frontend_runtime_error` log appears.
3. Trigger threshold crossing in a non-production environment and verify:
   - `threshold_alert_triggered` log is emitted.
   - webhook destination receives payload (if configured).
   - routing metadata fields are present.
4. Confirm `/api/readiness` is healthy and deployment docs are updated with current owners.

## Operational Response

When an alert triggers:

1. Primary owner acknowledges within on-call SLA.
2. Secondary owner joins if unresolved within 10 minutes.
3. Escalate using `ALERT_ROUTING_ESCALATION` path for sustained/severity-critical events.
4. Create incident record with trigger metrics, timeline, and corrective actions.
