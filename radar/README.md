# Verified Bounty Radar

A conservative GitHub issue scanner for finding **recently created paid work** while rejecting common false positives:

- Closed or archived repositories
- Assigned issues
- Recent active attempts
- Existing open solution pull requests
- Recent claim/reward signals
- Missing payment evidence
- Old or heavily discussed issues
- Work outside the preferred technical stack

## Why this exists

Public bounty dashboards often retain issues that are already closed, assigned, rewarded, or saturated. The radar treats every listing as untrusted and checks the canonical GitHub metadata before ranking it.

It still cannot prove that a sponsor will pay. A human must confirm funding, payout-country eligibility, acceptance criteria, and maintainer approval before any public claim or implementation.

## Run locally

```bash
cd radar
npm run radar
```

Reports are written to:

```text
radar/output/opportunities.md
radar/output/opportunities.json
```

## Token safety

Use a read-only token. Never commit it. The included GitHub Action uses the repository's automatic `GITHUB_TOKEN` and uploads the report as a workflow artifact.

## Scoring is intentionally strict

The default minimum score is 75. A candidate must also have:

- Detected amount at or above the configured minimum
- A recognizable payment signal
- No assignee
- At most one recent attempt
- No recent claim/reward signal
- No linked open pull request

## Known limitations

- A GitHub comment can claim funding without proving escrow.
- Linked-PR search can miss a PR that does not reference the issue.
- Maintainer activity is inferred from GitHub author association.
- Payment-country eligibility must be checked on the platform itself.
- Search results are limited by GitHub API and search-rate limits.

The safe rule remains: **verify directly with the maintainer before beginning**.
