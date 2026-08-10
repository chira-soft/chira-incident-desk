# CHIRA Incident Desk

**Production incident diagnosis and repair for APIs, automations, integrations, databases, CI/CD, and AI-enabled systems.**

CHIRA Incident Desk helps software teams turn a reproducible failure into a tested fix, a clear root-cause explanation, and a reviewable pull request.

## Best-fit incidents

- Node.js, TypeScript, JavaScript, NestJS, Express, Fastify
- Java and Spring Boot APIs
- REST APIs, webhooks, OAuth, rate limits, retries, and idempotency
- n8n and automation workflow failures
- PostgreSQL, MySQL, Redis, migrations, and query defects
- Docker, Docker Compose, reverse proxies, VPS deployment, and GitHub Actions
- React, Next.js, Vue, Angular, and backend/frontend integration defects
- LLM, agent, MCP, and third-party API integrations

## Delivery model

1. **Triage:** reproduce the incident, inspect evidence, and isolate the likely cause.
2. **Scope:** agree on acceptance criteria, price, and delivery boundary before implementation.
3. **Repair:** implement the smallest safe change and add or update tests.
4. **Verification:** run the relevant test, lint, build, and security checks.
5. **Delivery:** provide a pull request, root-cause summary, validation evidence, and deployment notes.

## Pilot pricing

| Service | Starting range |
|---|---:|
| Root-cause diagnosis | USD 45–75 |
| Small, reproducible correction | USD 120–250 |
| API, webhook, workflow, or CI integration repair | USD 250–500 |
| Complex production incident | Scoped after diagnosis |

The diagnosis fee covers investigation and is credited toward the repair when both parties approve the implementation scope.

## Request an incident review

Open an **Incident Request** using the repository issue form. Never include passwords, API keys, private customer data, wallet seed phrases, production database dumps, or unredacted logs.

For private repositories, provide temporary least-privilege access only after scope and payment terms are agreed.

## What you receive

- Reproduction notes
- Root-cause explanation
- Proposed and implemented change
- Automated or manual verification evidence
- Pull request or patch
- Deployment and rollback notes
- Remaining risks and assumptions

## Public proof of work

See [Case Studies](docs/CASE_STUDIES.md). The examples are sanitized summaries of real delivery patterns; no customer secrets or proprietary source code are exposed.

## Paid open-source work

CHIRA Incident Desk also evaluates funded GitHub issues and bounties. A task is accepted only after a preflight check confirms that it is still open, funded, unassigned, not already solved by an active pull request, compatible with the technical stack, and payable in the contributor's jurisdiction.

The included [Verified Bounty Radar](radar/README.md) helps identify candidates, but **no automated score replaces maintainer confirmation**.

## Security

Read [SECURITY.md](SECURITY.md) before sharing evidence or granting repository access.
