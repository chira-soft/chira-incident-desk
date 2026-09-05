# VYXARA — Api18 commercial review evidence (lab-only)

Review date: 2026-09-05
Scope: Api18 provider, controlled local/test validation only
Supported human decision: `approved` for tightly capped lab validation
Production/commercial launch approval: NO

## Public evidence reviewed

- https://api18.dev/
- https://api18.dev/about
- https://api18.dev/legal/terms

## Findings

1. Api18 describes pay-as-you-go pricing in USD per call with no subscription or minimum.
2. Api18 lists Hera 1.0 Text-to-Image at USD 0.056 per image.
3. Api18 states that failed jobs are refunded automatically.
4. Api18 states that API use requires paid balance and that supported top-ups use USDT.
5. The public terms do not establish a production SLA or negotiated enterprise commitment.

## Lab-only conclusion

The published pricing and billing model are sufficient for a small, explicitly capped local/test validation. Any production rollout, recurring/open-ended spend, pricing change, model change, or different payment arrangement requires a fresh commercial review.

Recommended review record:
- reviewScope: `commercial`
- decision: `approved`
- reasonCode: `lab_commercial_review_completed`
- validUntil: `2026-11-30T23:59:00-05:00`
