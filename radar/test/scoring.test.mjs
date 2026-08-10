import assert from "node:assert/strict";
import test from "node:test";
import { buildCandidate, extractPaymentEvidence } from "../src/scoring.mjs";

test("extracts an Algora-style bounty command", () => {
  const result = extractPaymentEvidence(["/bounty $250", "Algora funded"]);
  assert.equal(result.amount, 250);
  assert.equal(result.currency, "USD");
  assert.ok(result.signals.includes("/bounty command"));
  assert.ok(result.signals.includes("Algora reference"));
});

test("prefers the largest explicit amount", () => {
  const result = extractPaymentEvidence(["Initial bounty: $50", "Updated budget: 200 USDC"]);
  assert.equal(result.amount, 200);
  assert.equal(result.currency, "USDC");
});

test("does not treat x402 as a 402 USDC bounty", () => {
  const result = extractPaymentEvidence(["USDC payments on Base via x402"]);
  assert.equal(result.amount, null);
  assert.ok(result.signals.includes("USDC reference"));
});

test("extracts currency-first payment amounts", () => {
  const result = extractPaymentEvidence(["Reward: USDC 175 after acceptance"]);
  assert.equal(result.amount, 175);
  assert.equal(result.currency, "USDC");
});

test("does not invent an amount", () => {
  const result = extractPaymentEvidence(["A funded issue with no explicit price"]);
  assert.equal(result.amount, null);
});

test("rejects digest or aggregator issues even when they mention USDC", () => {
  const now = new Date("2026-08-10T14:00:00Z");
  const issue = {
    number: 1037,
    title: "GitHub discovery digest: 2026-W33",
    body: "A router supports USDC payments through x402",
    html_url: "https://github.com/example/repo/issues/1037",
    created_at: "2026-08-10T13:30:00Z",
    updated_at: "2026-08-10T13:30:00Z",
    user: { login: "maintainer" },
    assignees: [],
    labels: [{ name: "github-discovery" }],
    comments: 0,
  };
  const repository = { full_name: "example/repo", language: "Python", archived: false, disabled: false };
  const config = { minAmount: 50, minScore: 75, recentAttemptDays: 45, preferredLanguages: new Set(["python"]) };
  const candidate = buildCandidate(issue, repository, [], [], config, now);
  assert.equal(candidate.qualified, false);
  assert.equal(candidate.payment.amount, null);
  assert.equal(candidate.isAggregator, true);
});

test("rejects an assigned candidate despite payment", () => {
  const now = new Date("2026-08-09T12:00:00Z");
  const issue = {
    number: 42,
    title: "Bounty: fix TypeScript webhook retries",
    body: "Steps to reproduce... /bounty $200",
    html_url: "https://github.com/example/repo/issues/42",
    created_at: "2026-08-08T12:00:00Z",
    updated_at: "2026-08-08T12:00:00Z",
    user: { login: "maintainer" },
    assignees: [{ login: "other-dev" }],
    labels: [{ name: "bounty" }],
    comments: 0,
  };
  const repository = {
    full_name: "example/repo",
    language: "TypeScript",
    archived: false,
    disabled: false,
  };
  const config = {
    minAmount: 50,
    minScore: 75,
    recentAttemptDays: 45,
    preferredLanguages: new Set(["typescript"]),
  };
  const candidate = buildCandidate(issue, repository, [], [], config, now);
  assert.equal(candidate.qualified, false);
  assert.ok(candidate.warnings.some((warning) => warning.includes("assigned")));
});
