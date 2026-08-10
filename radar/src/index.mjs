import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GitHubClient } from "./github.mjs";
import { buildCandidate, loadNumericConfig } from "./scoring.mjs";
import { discoverSuperteamOpportunities } from "./superteam.mjs";

function requiredToken() {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN or GH_TOKEN is required. Use a read-only token and never commit it.");
  return token;
}

function isoDateDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function loadConfig() {
  const preferredLanguages = new Set(
    (process.env.RADAR_PREFERRED_LANGUAGES ?? "TypeScript,JavaScript,Java,Python,PHP,Dockerfile,Shell")
      .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
  return {
    token: requiredToken(),
    superteamApiKey: process.env.SUPERTEAM_AGENT_API_KEY ?? "",
    lookbackDays: loadNumericConfig("RADAR_LOOKBACK_DAYS", 14),
    maxCandidates: loadNumericConfig("RADAR_MAX_CANDIDATES", 30),
    minAmount: loadNumericConfig("RADAR_MIN_AMOUNT", 50),
    minScore: loadNumericConfig("RADAR_MIN_SCORE", 75),
    recentAttemptDays: loadNumericConfig("RADAR_RECENT_ATTEMPT_DAYS", 45),
    requestDelayMs: loadNumericConfig("RADAR_REQUEST_DELAY_MS", 350),
    maxPerRepository: loadNumericConfig("RADAR_MAX_PER_REPOSITORY", 3),
    superteamMinReward: loadNumericConfig("SUPERTEAM_MIN_REWARD", 100),
    superteamMinScore: loadNumericConfig("SUPERTEAM_MIN_SCORE", 75),
    superteamMaxCandidates: loadNumericConfig("SUPERTEAM_MAX_CANDIDATES", 50),
    superteamMaxSubmissions: loadNumericConfig("SUPERTEAM_MAX_SUBMISSIONS", 50),
    preferredLanguages,
    outputDirectory: path.resolve(process.cwd(), "output"),
  };
}

function dedupeIssues(items) {
  const byUrl = new Map();
  for (const item of items) byUrl.set(item.html_url, item);
  return [...byUrl.values()].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

function selectDiverseIssues(items, maxCandidates, maxPerRepository) {
  const selected = [];
  const counts = new Map();
  for (const item of items) {
    const key = item.repository_url ?? item.html_url.split("/issues/")[0];
    const count = counts.get(key) ?? 0;
    if (count >= maxPerRepository) continue;
    selected.push(item);
    counts.set(key, count + 1);
    if (selected.length >= maxCandidates) break;
  }
  return selected;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function amountLabel(candidate) {
  const { amount, currency } = candidate.payment;
  if (amount === null) return "Unknown";
  return `${currency === "UNKNOWN" ? "" : `${currency} `}${amount}`.trim();
}

function competitionLabel(candidate) {
  return `${candidate.recentAttemptUsers.length} attempts / ${candidate.linkedOpenPullRequests.length} PRs / ${candidate.assignees.length} assignees`;
}

function renderGitHubTable(candidates) {
  if (candidates.length === 0) return "_No candidates in this section._\n";
  const rows = candidates.map((candidate) =>
    `| ${candidate.score} | ${escapeCell(amountLabel(candidate))} | ${escapeCell(candidate.payment.fundingStatus)} | ${escapeCell(candidate.repositoryLanguage ?? "Unknown")} | ${escapeCell(competitionLabel(candidate))} | ${candidate.ageDays}d | [${escapeCell(`${candidate.repository}#${candidate.issueNumber}`)}](${candidate.url}) — ${escapeCell(candidate.title)} |`,
  );
  return [
    "| Score | Amount | Funding | Language | Competition | Age | Issue |",
    "|---:|---:|---|---|---|---:|---|",
    ...rows,
    "",
  ].join("\n");
}

function renderSuperteamTable(candidates) {
  if (candidates.length === 0) return "_No active Superteam candidates in this section._\n";
  const rows = candidates.map((candidate) =>
    `| ${candidate.score} | ${escapeCell(`${candidate.token} ${candidate.rewardAmount}`)} | ${escapeCell(candidate.type)} | ${escapeCell(candidate.agentAccess)} | ${candidate.submissions} | ${candidate.deadlineDays ?? "?"}d | ${escapeCell(candidate.sponsor)} | [${escapeCell(candidate.title)}](${candidate.url}) |`,
  );
  return [
    "| Score | Reward pool | Type | Agent access | Submissions | Time left | Sponsor | Listing |",
    "|---:|---:|---|---|---:|---:|---|---|",
    ...rows,
    "",
  ].join("\n");
}

function renderGitHubSections(candidates, config) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const ready = sorted.filter((candidate) => candidate.qualified);
  const preflight = sorted.filter((candidate) => candidate.preflight);
  const watchThreshold = Math.max(50, config.minScore - 20);
  const watch = sorted.filter((candidate) => !candidate.qualified && !candidate.preflight && candidate.score >= watchThreshold);
  const rejected = sorted.filter((candidate) => candidate.score < watchThreshold);

  const details = sorted.slice(0, 15).map((candidate) => {
    const icon = candidate.qualified ? "✅" : candidate.preflight ? "🟡" : "⚠️";
    return `### ${icon} ${candidate.repository}#${candidate.issueNumber} — ${candidate.score}/100

- **Issue:** [${candidate.title}](${candidate.url})
- **Amount:** ${amountLabel(candidate)}
- **Funding status:** ${candidate.payment.fundingStatus}
- **Payment signals:** ${candidate.payment.signals.join(", ") || "None detected"}
- **Recent attempts:** ${candidate.recentAttemptUsers.join(", ") || "None detected"}
- **Recent claims/rewards:** ${candidate.recentClaimUsers.join(", ") || "None detected"}
- **Linked open PRs:** ${candidate.linkedOpenPullRequests.map((pr) => `#${pr.number}`).join(", ") || "None detected"}
- **Reasons:** ${candidate.reasons.join("; ") || "None"}
- **Warnings:** ${candidate.warnings.join("; ") || "None"}
`;
  }).join("\n");

  return `## GitHub bounty radar

### Ready — funding appears confirmed (${ready.length})

${renderGitHubTable(ready)}
### Payment/funding preflight (${preflight.length})

These are promising leads, but **do not start implementation yet**. Confirm that the bounty is funded/active and that we are eligible or delegated to claim it.

${renderGitHubTable(preflight)}
### Watchlist (${watch.length})

${renderGitHubTable(watch)}
### Rejected by score (${rejected.length})

${renderGitHubTable(rejected.slice(0, 20))}
### GitHub candidate details

${details || "_No GitHub candidates found._\n"}
`;
}

function renderSuperteamSections(superteam, config) {
  if (!superteam.enabled) {
    return `## Superteam Agent radar\n\n_Disabled: SUPERTEAM_AGENT_API_KEY is not configured._\n`;
  }
  if (superteam.error) {
    return `## Superteam Agent radar\n\n⚠️ Superteam scan failed: ${escapeCell(superteam.error)}\n`;
  }

  const sorted = [...superteam.candidates].sort((a, b) => b.score - a.score);
  const actionable = sorted.filter((candidate) => candidate.actionable);
  const watch = sorted.filter((candidate) => !candidate.actionable && candidate.score >= Math.max(50, config.superteamMinScore - 20));

  const details = sorted.slice(0, 12).map((candidate) => `### ${candidate.actionable ? "✅" : "⚠️"} Superteam — ${candidate.score}/100 — ${candidate.title}

- **Reward pool:** ${candidate.token} ${candidate.rewardAmount}
- **Type:** ${candidate.type}
- **Agent access:** ${candidate.agentAccess}
- **Submissions:** ${candidate.submissions}
- **Deadline:** ${candidate.deadline} (${candidate.deadlineDays ?? "?"} days left)
- **Sponsor:** ${candidate.sponsor}${candidate.sponsorVerified ? " (verified)" : ""}
- **Technical matches:** ${candidate.techMatches.join(", ") || "None detected"}
- **Reasons:** ${candidate.reasons.join("; ") || "None"}
- **Warnings:** ${candidate.warnings.join("; ") || "None"}
- **Listing:** ${candidate.url}
`).join("\n");

  return `## Superteam Agent radar

The API may return stale records marked OPEN, so CHIRA independently requires a future deadline and no announced winner before scoring them.

- Listings fetched: ${superteam.fetched}
- Stale/expired/winner-announced excluded before scoring: ${superteam.staleExcluded}
- Minimum reward pool: ${config.superteamMinReward}
- Maximum submissions for actionable status: ${config.superteamMaxSubmissions}

### Actionable agent opportunities (${actionable.length})

${renderSuperteamTable(actionable)}
### Superteam watchlist (${watch.length})

${renderSuperteamTable(watch)}
### Superteam candidate details

${details || "_No active agent-eligible Superteam listings found._\n"}
`;
}

function renderMarkdown(githubCandidates, superteam, config) {
  return `# CHIRA Income Radar

Generated: ${new Date().toISOString()}

This is a conservative discovery report. **Human review is required before claiming, submitting, spending money, signing a wallet transaction, or starting implementation.**

## Configuration

- GitHub lookback: ${config.lookbackDays} days
- GitHub minimum amount: ${config.minAmount}
- GitHub minimum score: ${config.minScore}
- GitHub maximum candidates: ${config.maxCandidates}
- GitHub maximum per repository: ${config.maxPerRepository}
- Superteam minimum reward: ${config.superteamMinReward}
- Superteam minimum score: ${config.superteamMinScore}

${renderGitHubSections(githubCandidates, config)}
${renderSuperteamSections(superteam, config)}
`;
}

async function scanGitHub(config) {
  const client = new GitHubClient(config.token, config.requestDelayMs);
  const since = isoDateDaysAgo(config.lookbackDays);
  const queries = [
    `is:issue is:open updated:>=${since} label:bounty`,
    `is:issue is:open updated:>=${since} in:title bounty`,
    `is:issue is:open updated:>=${since} in:comments \"/bounty\"`,
    `is:issue is:open updated:>=${since} in:title reward`,
    `is:issue is:open updated:>=${since} in:body USDC`,
  ];

  const discovered = [];
  for (const query of queries) {
    console.log(`GitHub search: ${query}`);
    discovered.push(...await client.searchIssues(query, 100));
  }

  const issues = selectDiverseIssues(dedupeIssues(discovered), config.maxCandidates, config.maxPerRepository);
  console.log(`Evaluating ${issues.length} GitHub candidates.`);
  const candidates = [];

  for (const [index, issue] of issues.entries()) {
    console.log(`[GitHub ${index + 1}/${issues.length}] ${issue.html_url}`);
    try {
      const [repository, comments] = await Promise.all([
        client.getRepository(issue.repository_url),
        client.getComments(issue.comments_url),
      ]);
      const linkedPullRequests = await client.findLinkedOpenPullRequests(repository.full_name, issue.number);
      candidates.push(buildCandidate(issue, repository, comments, linkedPullRequests, config));
    } catch (error) {
      console.error(`GitHub candidate skipped: ${issue.html_url}`, error.message);
    }
  }
  return candidates;
}

async function scanSuperteam(config) {
  if (!config.superteamApiKey) {
    return { enabled: false, error: null, fetched: 0, staleExcluded: 0, candidates: [] };
  }

  try {
    const result = await discoverSuperteamOpportunities(config.superteamApiKey, {
      minReward: config.superteamMinReward,
      minScore: config.superteamMinScore,
      maxCandidates: config.superteamMaxCandidates,
      maxSubmissions: config.superteamMaxSubmissions,
    });
    return { enabled: true, error: null, ...result };
  } catch (error) {
    console.error("Superteam scan failed:", error.message);
    return { enabled: true, error: error.message, fetched: 0, staleExcluded: 0, candidates: [] };
  }
}

async function main() {
  const config = loadConfig();
  const githubCandidates = await scanGitHub(config);
  const superteam = await scanSuperteam(config);

  await mkdir(config.outputDirectory, { recursive: true });
  const jsonPath = path.join(config.outputDirectory, "opportunities.json");
  const markdownPath = path.join(config.outputDirectory, "opportunities.md");
  const payload = {
    generatedAt: new Date().toISOString(),
    github: githubCandidates,
    superteam,
  };

  await writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(markdownPath, renderMarkdown(githubCandidates, superteam, config), "utf8");

  const githubReady = githubCandidates.filter((candidate) => candidate.qualified).length;
  const githubPreflight = githubCandidates.filter((candidate) => candidate.preflight).length;
  const superteamActionable = superteam.candidates.filter((candidate) => candidate.actionable).length;
  console.log(`Done. GitHub ready=${githubReady}, preflight=${githubPreflight}; Superteam actionable=${superteamActionable}; Superteam stale excluded=${superteam.staleExcluded}`);
  console.log(markdownPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
