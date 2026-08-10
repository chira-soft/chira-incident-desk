# Pilot Pricing

These are starting ranges for early validation. Final pricing depends on reproducibility, repository size, environment complexity, test coverage, urgency, and access constraints.

| Package | Includes | Starting price |
|---|---|---:|
| Diagnostic | Evidence review, reproduction attempt, cause hypothesis, repair recommendation | USD 45–75 |
| Small Fix | Diagnostic, focused patch, tests, pull request, delivery notes | USD 120–250 |
| Integration Repair | API/webhook/OAuth/n8n/CI repair, tests, operational notes | USD 250–500 |
| Production Incident | Containment, root cause, repair, rollback plan, verification | Scoped |

## Payment rules

- Diagnosis is paid before investigation begins.
- Larger repairs may use milestones.
- Open-source bounties are attempted only when funding and payout eligibility are verified.
- Crypto payments use a dedicated receiving wallet; the operational automation wallet never stores the main balance.
- No seed phrase or private key is ever placed in source code, n8n, logs, prompts, or GitHub secrets intended for third-party workflows.
