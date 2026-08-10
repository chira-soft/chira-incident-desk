import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { GitHubClient } from "./github.mjs";
import { buildCandidate, loadNumericConfig } from "./scoring.mjs";

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
    lookbackDays: loadNumericConfig("RADAR_LOOKBACK_DAYS", 14),
    maxCandidates: loadNumericConfig("RADAR_MAX_CANDIDATES", 30),
    minAmount: loadNumericConfig("RADAR_MIN_AMOUNT", 50),
    minScore: loadNumericConfig("RADAR_MIN_SCORE", 75),
    recentAttemptDays: loadNumericConfig("RADAR_RECENT_ATTEMPT_DAYS", 45),
    requestDelayMs: loadNumericConfig("RADAR_REQUEST_DELAY_MS", 350),
    maxPerRepository: loadNumericConfig("RADAR_MAX_PER_REPOSITORY", 3),
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

function renderTable(candidates) {
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

function renderMarkdown(candidates, config) {
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

  return `# Verified Bounty Radar

Generated: ${new Date().toISOString()}

This is a conservative discovery report. **Do not claim or implement a task until funding, payout eligibility, assignment, competing pull requests, and maintainer acceptance are verified.**

## Configuration

- Lookback: ${config.lookbackDays} days
- Minimum amount: ${config.minAmount}
- Minimum score: ${config.minScore}
- Maximum candidates: ${config.maxCandidates}
- Maximum per repository: ${config.maxPerRepository}

## Ready — funding appears confirmed (${ready.length})

${renderTable(ready)}
## Payment/funding preflight (${preflight.length})

These are promising leads, but **do not start implementation yet**. Confirm that the bounty is funded/active and that we are eligible or delegated to claim it.

${renderTable(preflight)}
## Watchlist (${watch.length})

${renderTable(watch)}
## Rejected by score (${rejected.length})

${renderTable(rejected.slice(0, 20))}
## Candidate details

${details || "_No candidates found._\n"}
`;
}

async function main() {
  const config = loadConfig();
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
    console.log(`Searching: ${query}`);
    discovered.push(...await client.searchIssues(query, 100));
  }

  const issues = selectDiverseIssues(dedupeIssues(discovered), config.maxCandidates, config.maxPerRepository);
  console.log(`Evaluating ${issues.length} unique candidates.`);
  const candidates = [];

  for (const [index, issue] of issues.entries()) {
    console.log(`[${index + 1}/${issues.length}] ${issue.html_url}`);
    try {
      const [repository, comments] = await Promise.all([
        client.getRepository(issue.repository_url),
        client.getComments(issue.comments_url),
      ]);
      const linkedPullRequests = await client.findLinkedOpenPullRequests(repository.full_name, issue.number);
      candidates.push(buildCandidate(issue, repository, comments, linkedPullRequests, config));
    } catch (error) {
      console.error(`Candidate skipped: ${issue.html_url}`, error.message);
    }
  }

  await mkdir(config.outputDirectory, { recursive: true });
  const jsonPath = path.join(config.outputDirectory, "opportunities.json");
  const markdownPath = path.join(config.outputDirectory, "opportunities.md");
  await writeFile(jsonPath, JSON.stringify(candidates, null, 2), "utf8");
  await writeFile(markdownPath, renderMarkdown(candidates, config), "utf8");

  const ready = candidates.filter((candidate) => candidate.qualified).length;
  const preflight = candidates.filter((candidate) => candidate.preflight).length;
  console.log(`Done. Ready=${ready}, preflight=${preflight}, evaluated=${candidates.length}`);
  console.log(markdownPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
