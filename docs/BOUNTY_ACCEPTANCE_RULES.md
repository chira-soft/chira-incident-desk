# Paid-Issue Acceptance Rules

A funded issue is not automatically a good opportunity. Public bounty indexes frequently retain closed, assigned, already rewarded, or heavily contested tasks.

## Mandatory preflight

A candidate must pass every item below before implementation begins:

1. The canonical GitHub issue is currently open.
2. The funding signal is current and attributable to the maintainer or a recognized platform.
3. The payout method supports the contributor's country and account.
4. No maintainer has assigned the issue to another contributor.
5. No open or recently merged pull request already solves the issue.
6. Recent comments do not show multiple active attempts or claims.
7. Acceptance criteria and required tests are explicit.
8. The repository is maintained and the maintainer has responded recently.
9. The stack matches current capabilities.
10. The expected value remains positive after model, infrastructure, and human-review costs.

## Scorecard

| Criterion | Weight |
|---|---:|
| Current funding evidence | 20 |
| Stack match | 20 |
| No assignment | 15 |
| No active competing attempt | 15 |
| No linked solution PR | 10 |
| Recent maintainer activity | 10 |
| Reproducible acceptance criteria | 10 |

A score below 75 is rejected. A score of 75 or higher is still subject to direct maintainer confirmation.

## Automatic rejection

- Closed or completed issue
- Existing rewarded claim
- More than one recent active attempt
- Existing solution pull request
- Unclear payout method
- Unresponsive maintainer
- Vague feature request without tests
- Required stack is materially outside current expertise
- Estimated effort makes the expected hourly return unattractive
