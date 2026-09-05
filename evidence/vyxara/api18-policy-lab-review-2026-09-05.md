# VYXARA — Api18 policy review evidence (lab-only)

Review date: 2026-09-05
Scope: Api18 provider, controlled local/test validation only
Supported human decision: `approved` for lab-only validation
Production approval: NO
Legal opinion: NO

## Public evidence reviewed

- https://api18.dev/legal/terms
- https://api18.dev/legal/privacy
- https://api18.dev/about

## Findings

1. Api18 states that users must be of legal age and that lawful adult/+18 use is permitted.
2. Api18 prohibits illegal content, including child sexual abuse material, non-consensual intimate imagery, content depicting real identifiable people without consent, and content intended to defraud, harass, or harm.
3. Api18 states that integrators exposing generation to end users are responsible for age-gating and moderating user-supplied input.
4. Api18 states that API keys should remain secret and server-side.
5. Api18 states that prompts and generated outputs are processed to provide the service and that generated files are retained temporarily.
6. Api18's Terms and Privacy pages describe themselves as starting templates that should be reviewed by qualified legal counsel.

## Lab-only conclusion

The public provider policy is compatible with a tightly controlled, non-production VYXARA validation restricted to lawful synthetic-adult use under VYXARA's independent safety and consent controls.

This is not production legal sign-off. Production remains subject to separate legal/privacy review for the applicable jurisdiction and distribution model.

Recommended review record:
- reviewScope: `policy`
- decision: `approved`
- reasonCode: `lab_policy_review_completed`
- validUntil: `2026-11-30T23:59:00-05:00`
