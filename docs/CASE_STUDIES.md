# Sanitized Case Studies

These summaries describe delivery patterns and capabilities without exposing client identities, credentials, private repositories, or proprietary business data.

## 1. Guarded private publishing workflow

**Problem:** A content workflow needed to publish media privately while preventing duplicate uploads, expired authorization failures, and accidental public release.

**Work delivered:**

- Approval gates before external side effects
- OAuth refresh handling
- Idempotency controls and publication manifests
- Receipt generation and audit evidence
- Private-by-default publication path
- Failure recovery without duplicate delivery

**Relevant skills:** Node.js, TypeScript, APIs, OAuth, queues, idempotency, auditability, GitHub-based delivery.

## 2. WhatsApp and CRM sales automation

**Problem:** Incoming text and media messages needed automated classification, lead-state updates, human escalation, and business-rule enforcement.

**Work delivered:**

- Webhook ingestion and message normalization
- Intent, media, and confidence classification
- n8n orchestration and CRM field updates
- Rate-limit handling, retries, and duplicate-message protection
- Human handoff rules and conversation resets
- Production migration with test and live environments

**Relevant skills:** n8n, REST APIs, webhooks, CRM integration, LLMs, observability, business rules.

## 3. Docker and VPS service recovery

**Problem:** Multiple services shared a VPS and reverse proxy; one unstable service repeatedly restarted and consumed resources while production workloads had to remain online.

**Work delivered:**

- Container and resource inventory
- Isolation and removal of the failing workload
- Docker network and reverse-proxy validation
- Persistent storage review
- Log retention and disk cleanup
- Deployment plan that avoided disruption to existing services

**Relevant skills:** Docker, Docker Compose, Linux, Caddy/Nginx, PostgreSQL, networking, incident containment.

## 4. Full-stack commerce and inventory systems

**Problem:** A family retail operation required a path from an existing storefront toward structured inventory, product management, and digital sales.

**Work delivered:**

- Frontend/backend repository analysis
- API and data model planning
- Deployment preparation
- Automation opportunities and staged modernization
- Separation of immediate fixes from long-term product scope

**Relevant skills:** JavaScript/TypeScript, frontend frameworks, APIs, databases, e-commerce, architecture, delivery planning.

## 5. Educational Android game MVP

**Problem:** A mathematics game required iterative UI, responsive layout, Android builds, and stakeholder-ready demonstration materials.

**Work delivered:**

- MVP iteration and build validation
- Responsive screen improvements
- Demo packaging
- Product presentation aligned with classroom use
- Technical and commercial framing for institutional buyers

**Relevant skills:** product delivery, Android build review, QA, stakeholder communication, iterative MVP management.
