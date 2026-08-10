import assert from "node:assert/strict";
import test from "node:test";
import { isSuperteamListingActive, scoreSuperteamListing } from "../src/superteam.mjs";

const config = { minReward: 100, minScore: 75, maxSubmissions: 50 };
const now = new Date("2026-08-10T16:00:00Z");

function listing(overrides = {}) {
  return {
    id: "x",
    rewardAmount: 500,
    deadline: "2026-08-20T18:00:00Z",
    type: "bounty",
    title: "Build an AI agent API automation",
    token: "USDC",
    slug: "build-ai-agent-api",
    isWinnersAnnounced: false,
    agentAccess: "AGENT_ONLY",
    status: "OPEN",
    _count: { Comments: 1, Submission: 3 },
    sponsor: { name: "Verified Sponsor", isVerified: true },
    ...overrides,
  };
}

test("rejects an expired listing even when API says OPEN", () => {
  const item = listing({ deadline: "2026-07-01T00:00:00Z" });
  assert.equal(isSuperteamListingActive(item, now), false);
  assert.equal(scoreSuperteamListing(item, null, config, now).actionable, false);
});

test("rejects a listing with winners already announced", () => {
  const item = listing({ isWinnersAnnounced: true });
  assert.equal(isSuperteamListingActive(item, now), false);
});

test("marks a low-competition technical agent-only bounty actionable", () => {
  const result = scoreSuperteamListing(listing(), { description: "TypeScript backend API and automation agent" }, config, now);
  assert.equal(result.actionable, true);
  assert.ok(result.score >= 75);
});

test("does not prioritize crowded specialist Rust work", () => {
  const item = listing({ title: "Rebuild backend as on-chain Rust programs", rewardAmount: 1000, _count: { Comments: 20, Submission: 155 } });
  const result = scoreSuperteamListing(item, { description: "Solana smart contract Rust Anchor" }, config, now);
  assert.equal(result.actionable, false);
  assert.ok(result.warnings.some((warning) => warning.includes("specialist")));
});
