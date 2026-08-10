# Security Policy

## Never share in public issues

- Passwords, access tokens, API keys, OAuth refresh tokens
- Wallet seed phrases or private keys
- Production database dumps
- Private customer or employee data
- Unredacted infrastructure logs containing secrets

## Reporting a security concern

If an incident contains sensitive information, do not paste it into a public GitHub issue. Open a sanitized request first and agree on a private transfer channel before sharing additional evidence.

## Repository access

For private repositories, grant the minimum access required for the agreed scope and revoke access when the incident is complete.

## Production changes

CHIRA Incident Desk does not require unrestricted production credentials. Prefer reproduction in an isolated environment and deploy reviewed changes through the client's normal release process.

## Wallet and payment safety

Payment addresses may be shared publicly. Seed phrases and private keys must never be shared. Automated agents, CI jobs, n8n workflows, prompts, or public repositories must not hold treasury keys.
