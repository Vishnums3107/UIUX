# Branch Protection Policy

Launch branch protection for the protected release branch must enforce these required status checks:

- `backend`
- `frontend`
- `e2e-smoke`

These names match the CI job names in `.github/workflows/ci.yml`.

## Source-of-Truth Config

- Policy file: `.github/branch-protection/main.json`

Current repository note:

- The current default branch is `codex/review-calendar-history`.
- If `main` does not exist yet, apply this policy to the default branch first.

## Apply via GitHub CLI

Run this from repository root:

```bash
gh api --method PUT \
  "repos/<owner>/<repo>/branches/<branch>/protection" \
  --input ".github/branch-protection/main.json"
```

## Verify Applied Protection

```bash
gh api "repos/<owner>/<repo>/branches/<branch>/protection/required_status_checks"
```

Expected contexts should include:

- `backend`
- `frontend`
- `e2e-smoke`

## UI Path (Manual Alternative)

1. GitHub repository Settings.
2. Branches.
3. Add/Edit branch protection rule for your release branch (`main` or current default branch).
4. Enable `Require status checks to pass before merging`.
5. Mark required checks:
   - `backend`
   - `frontend`
   - `e2e-smoke`
6. Enable `Require branches to be up to date before merging`.
7. Save rule.
