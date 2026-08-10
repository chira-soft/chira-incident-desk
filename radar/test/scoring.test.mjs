import assert from "node:assert/strict";
import test from "node:test";
import { buildCandidate, extractPaymentEvidence } from "../src/scoring.mjs";

const config = {
  minAmount: 50,
  minScore: 75,
  recentAttemptDays: 45,
  preferredLanguages: new Set(["typescript", "python"]),
};

test("extracts an Algora-style bounty command", () => {
  const result = extractPaymentEvidence(["/bounty $250", "Algora funded"]);
  assert.equal(result.amount, 250);
  assert.equal(result.currency, "USD");
  assert.ok(result.signals.includes("/bounty command"));
  assert.ok(result.signals.includes("Algora reference"));
  assert.equal(result.fundingStatus, "confirmed");
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

test("marks a DevAsign bounty as pending when sponsor is told to fund escrow", () => {
  const result = extractPaymentEvidence([
    "DevAsign Bounty — your bounty of $325 USDC is being created. Next, fund the escrow to activate it. Funds are locked in a Stellar USDC escrow after activation.",
  ]);
  assert.equal(result.amount, 325);
  assert.equal(result.currency, "USDC");
  assert.equal(result.fundingStatus, "pending");
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
  const candidate = buildCandidate(issue, repository, [], [], config, now);
  assert.equal(candidate.qualified, false);
  assert.equal(candidate.preflight, false);
  assert.equal(candidate.payment.amount, null);
  assert.equal(candidate.isAggregator, true);
});

test("does not use unrelated Freelancer price ranges from long issue comments", () => {
  const now = new Date("2026-08-10T14:00:00Z");
  const issue = {
    number: 141,
    title: "Autonomous tested patch submission, capability recovery and maintainer loop",
    body: "Build an autonomous submission loop. Never count revenue until independently verified.",
    html_url: "https://github.com/example/os/issues/141",
    created_at: "2026-07-26T17:33:17Z",
    updated_at: "2026-08-10T13:50:12Z",
    user: { login: "maintainer" },
    assignees: [],
    labels: [],
    comments: 100,
  };
  const comments = [{
    body: "Found a Freelancer WordPress listing priced $284 - $852. Bounties canoniques retenues: 0.",
    created_at: "2026-08-10T13:00:00Z",
    author_association: "OWNER",
    user: { login: "maintainer" },
  }];
  const repository = { full_name: "example/os", language: "Python", archived: false, disabled: false };
  const candidate = buildCandidate(issue, repository, comments, [], config, now);
  assert.equal(candidate.payment.amount, null);
  assert.equal(candidate.qualified, false);
  assert.equal(candidate.preflight, false);
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
  const repository = { full_name: "example/repo", language: "TypeScript", archived: false, disabled: false };
  const candidate = buildCandidate(issue, repository, [], [], config, now);
  assert.equal(candidate.qualified, false);
  assert.ok(candidate.warnings.some((warning) => warning.includes("assigned")));
});
