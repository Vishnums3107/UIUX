# Backup and Restore Runbook - Adaptive Tamil Learning Platform

Last updated: March 11, 2026

## 1. Purpose

This runbook documents:

- How to create MongoDB backups for production data.
- How to restore backups safely in non-production and production.
- How to execute and record a restore drill with a measured Recovery Time Objective (RTO).

## 2. Scope

- Database: MongoDB (Atlas or self-hosted).
- Collections: `users`, `lessons`, `lessonattempts` (and any future collections in the same database).
- Excluded data: none by default.

## 3. Backup Strategy

Use a layered strategy:

1. Atlas snapshots (daily) for baseline recovery.
2. Logical dump (`mongodump`) for portable point-in-time exports.
3. Offsite encrypted storage for dumps (S3/GCS/Azure Blob).

Target backup objectives:

- RPO (Recovery Point Objective): <= 24 hours for daily backups.
- RTO (Recovery Time Objective): <= 60 minutes (validate with restore drill).

## 4. Prerequisites

- MongoDB Database Tools installed (`mongodump`, `mongorestore`).
- Service account or user with read permission for backup and write permission for restore.
- Secure secret storage for DB credentials (never commit plain credentials).

## 5. Backup Procedures

### 5.1 Atlas Snapshot Backups

1. In Atlas: enable cloud backups for production cluster.
2. Configure daily snapshot schedule and retention (recommended: 14-30 days).
3. Enable alerts for failed snapshot jobs.

### 5.2 Logical Backup with `mongodump`

Run from a secure CI runner or operations host:

```bash
export MONGODB_URI='mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority'
export BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"
mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/tamil-learning.archive.gz"
sha256sum "$BACKUP_DIR/tamil-learning.archive.gz" > "$BACKUP_DIR/sha256.txt"
```

Optional per-collection dumps:

```bash
mongodump --uri="$MONGODB_URI" --db=tamil-learning --collection=users --gzip --archive=users.archive.gz
```

### 5.3 Store and Retain

- Upload backup archive + checksum to encrypted object storage.
- Enforce lifecycle retention:
  - Daily backups: 30 days
  - Weekly backups: 12 weeks
  - Monthly backups: 12 months

## 6. Restore Procedures

### 6.1 Non-Production Restore (Drill/Validation)

```bash
export TARGET_URI='mongodb://127.0.0.1:27017/tamil-learning-restore-drill'
export BACKUP_ARCHIVE='./backups/2026-03-11_09-00-00/tamil-learning.archive.gz'

mongorestore --uri="$TARGET_URI" --gzip --archive="$BACKUP_ARCHIVE" --drop
```

Validation checklist after restore:

1. Count documents in key collections:
```bash
mongosh "$TARGET_URI" --eval "db.users.countDocuments(); db.lessons.countDocuments(); db.lessonattempts.countDocuments();"
```
2. Verify API boot with restored database.
3. Run backend integration tests against restored DB.

### 6.2 Production Restore (Incident)

1. Declare incident and freeze write traffic (maintenance mode or API write block).
2. Pick restore source (latest valid snapshot or logical backup).
3. Restore to staging first and validate data integrity.
4. Restore production target with controlled cutover.
5. Run post-restore verification:
   - Auth login/register
   - Lesson fetch/submit
   - Admin analytics endpoint
6. Re-enable write traffic.
7. Publish incident summary and timeline.

## 7. Restore Drill Procedure (Required Quarterly)

1. Select a recent backup (< 7 days old).
2. Start timer when restore begins.
3. Restore into dedicated drill database.
4. Perform validation checklist.
5. Stop timer when app verification is complete.
6. Record achieved RTO and issues.

## 8. RTO Drill Record Template

- Drill date:
- Operator:
- Backup source timestamp:
- Backup type: Atlas snapshot / logical archive
- Restore target:
- Start time:
- End time:
- Duration (RTO achieved):
- Document count checks:
- API validation results:
- Issues found:
- Follow-up actions:

## 9. Suggested Automation

- Schedule nightly logical backup via CI cron.
- Store artifact checksum and retention metadata.
- Trigger alert if backup job fails or no backup appears within 26 hours.

## 10. Security Notes

- Encrypt backups at rest and in transit.
- Use least-privilege DB credentials for backup jobs.
- Rotate backup credentials every 90 days.
- Never log secrets or raw connection strings.
