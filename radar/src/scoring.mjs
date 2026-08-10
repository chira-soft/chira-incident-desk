const DAY_MS = 24 * 60 * 60 * 1000;

const STACK_TERMS = [
  "typescript", "javascript", "node.js", "nodejs", "nestjs", "express", "fastify",
  "java", "spring boot", "api", "webhook", "oauth", "n8n", "postgres", "postgresql",
  "mysql", "redis", "docker", "docker compose", "github actions", "laravel", "php",
  "react", "next.js", "vue", "angular", "mcp", "llm",
];

const REPRO_TERMS = [
  "steps to reproduce", "how to reproduce", "reproduction", "expected behavior",
  "actual behavior", "failing test", "test case", "acceptance criteria", "definition of done",
];

const ATTEMPT_PATTERNS = [
  /\/attempt\b/i,
  /\bi(?:'|’)m working on (?:this|it)\b/i,
  /\bi will work on (?:this|it)\b/i,
  /\bworking on it now\b/i,
  /\bcan (?:i|you) (?:be assigned|assign)\b/i,
  /\bi(?:'|’)d like to work on this\b/i,
];

const CLAIM_PATTERNS = [
  /\/claim\b/i,
  /\breward(?:ed)?\b/i,
  /\bbounty (?:was )?(?:paid|awarded|claimed)\b/i,
  /\bwinner announced\b/i,
  /\bpayment (?:sent|completed)\b/i,
];

function parseNumber(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadNumericConfig(name, fallback) {
  return parseNumber(process.env[name], fallback);
}

function daysSince(iso, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

function isRecent(iso, days, now = new Date()) {
  return now.getTime() - new Date(iso).getTime() <= days * DAY_MS;
}

function textMatchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function unique(values) {
  return [...new Set(values)];
}

export function extractPaymentEvidence(texts) {
  const signals = [];
  const amounts = [];

  for (const raw of texts) {
    const text = raw ?? "";
    if (/\/bounty\b/i.test(text)) signals.push("/bounty command");
    if (/algora/i.test(text)) signals.push("Algora reference");
    if (/\bescrow\b/i.test(text)) signals.push("escrow reference");
    if (/\bfunded\b/i.test(text)) signals.push("funded reference");
    if (/\bUSDC\b/i.test(text)) signals.push("USDC reference");

    for (const match of text.matchAll(/\/bounty\s+(?:\$|USD\s*)?(\d+(?:\.\d{1,2})?)/gi)) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount)) amounts.push({ amount, currency: "USD" });
    }
    for (const match of text.matchAll(/\$\s*(\d{2,6}(?:\.\d{1,2})?)(?!\d)/g)) {
      const amount = Number(match[1]);
      if (Number.isFinite(amount)) amounts.push({ amount, currency: "USD" });
    }
    for (const match of text.matchAll(/(\d+(?:\.\d{1,2})?)\s*(USDC|USD)\b/gi)) {
      const amount = Number(match[1]);
      const currency = match[2]?.toUpperCase() === "USDC" ? "USDC" : "USD";
      if (Number.isFinite(amount)) amounts.push({ amount, currency });
    }
  }

  const best = amounts.sort((a, b) => b.amount - a.amount)[0];
  return {
    amount: best?.amount ?? null,
    currency: best?.currency ?? "UNKNOWN",
    signals: unique(signals),
  };
}

export function buildCandidate(issue, repository, comments, linkedOpenPullRequests, config, now = new Date()) {
  const issueText = `${issue.title}\n${issue.body ?? ""}`;
  const recentComments = comments.filter((comment) =>
    isRecent(comment.created_at, config.recentAttemptDays, now),
  );

  const recentAttemptUsers = unique(
    recentComments
      .filter((comment) => textMatchesAny(comment.body ?? "", ATTEMPT_PATTERNS))
      .map((comment) => comment.user.login)
      .filter((login) => !/\[bot\]$/.test(login)),
  );

  const recentClaimUsers = unique(
    recentComments
      .filter((comment) => textMatchesAny(comment.body ?? "", CLAIM_PATTERNS))
      .map((comment) => comment.user.login),
  );

  const maintainerRecent = recentComments.some((comment) =>
    ["OWNER", "MEMBER", "COLLABORATOR"].includes(comment.author_association),
  );

  const texts = [issueText, ...comments.map((comment) => comment.body ?? "")];
  const payment = extractPaymentEvidence(texts);
  const labels = issue.labels.map((label) => typeof label === "string" ? label : label.name);
  if (labels.some((label) => /bounty|reward|funded/i.test(label))) {
    payment.signals.push("bounty/reward label");
    payment.signals = unique(payment.signals);
  }

  const reasons = [];
  const warnings = [];
  let score = 0;
  const ageDays = daysSince(issue.created_at, now);
  const language = repository.language;

  if (language && config.preferredLanguages.has(language.toLowerCase())) {
    score += 20;
    reasons.push(`preferred language: ${language}`);
  } else if (language) {
    warnings.push(`non-preferred primary language: ${language}`);
  } else {
    warnings.push("repository language not detected");
  }

  if (STACK_TERMS.some((term) => issueText.toLowerCase().includes(term))) {
    score += 5;
    reasons.push("issue text matches the delivery stack");
  }

  if ((issue.assignees ?? []).length === 0) {
    score += 15;
    reasons.push("unassigned");
  } else {
    warnings.push(`assigned to ${issue.assignees.map((user) => user.login).join(", ")}`);
    score -= 30;
  }

  if (recentAttemptUsers.length === 0) {
    score += 15;
    reasons.push("no recent attempt signal");
  } else if (recentAttemptUsers.length === 1) {
    score += 3;
    warnings.push(`one recent attempt: ${recentAttemptUsers[0]}`);
  } else {
    score -= 25;
    warnings.push(`${recentAttemptUsers.length} recent attempt users`);
  }

  if (linkedOpenPullRequests.length === 0) {
    score += 10;
    reasons.push("no linked open solution PR detected");
  } else {
    score -= 35;
    warnings.push(`${linkedOpenPullRequests.length} linked open PR(s)`);
  }

  if (ageDays <= 3) {
    score += 15;
    reasons.push("created within 3 days");
  } else if (ageDays <= 7) {
    score += 10;
    reasons.push("created within 7 days");
  } else if (ageDays <= 14) {
    score += 5;
    reasons.push("created within 14 days");
  } else if (ageDays > 30) {
    score -= 15;
    warnings.push(`old issue: ${ageDays} days`);
  }

  if (payment.signals.length > 0) {
    score += 15;
    reasons.push(`payment signals: ${payment.signals.join(", ")}`);
  } else {
    warnings.push("no recognizable funding signal");
  }

  if (payment.amount !== null) {
    if (payment.amount >= 500) score += 15;
    else if (payment.amount >= 250) score += 12;
    else if (payment.amount >= 100) score += 10;
    else if (payment.amount >= config.minAmount) score += 5;
    else warnings.push(`amount below configured minimum: ${payment.amount}`);
  } else {
    warnings.push("amount not detected");
  }

  const hasReproductionEvidence = REPRO_TERMS.some((term) =>
    issueText.toLowerCase().includes(term),
  );
  if (hasReproductionEvidence) {
    score += 10;
    reasons.push("reproduction or acceptance evidence present");
  } else {
    warnings.push("reproduction/acceptance criteria not detected");
  }

  if (maintainerRecent) {
    score += 10;
    reasons.push("recent maintainer activity");
  } else {
    warnings.push("no recent maintainer comment detected");
  }

  if (issue.comments > 30) {
    score -= 10;
    warnings.push(`high discussion volume: ${issue.comments} comments`);
  }

  if (recentClaimUsers.length > 0) {
    score -= 35;
    warnings.push(`recent claim/reward signal from: ${recentClaimUsers.join(", ")}`);
  }

  if (repository.archived || repository.disabled) {
    score -= 100;
    warnings.push("repository is archived or disabled");
  }

  score = Math.max(0, Math.min(100, score));

  const amountPass = payment.amount !== null && payment.amount >= config.minAmount;
  const qualified =
    score >= config.minScore &&
    amountPass &&
    payment.signals.length > 0 &&
    (issue.assignees ?? []).length === 0 &&
    recentAttemptUsers.length <= 1 &&
    recentClaimUsers.length === 0 &&
    linkedOpenPullRequests.length === 0 &&
    !repository.archived &&
    !repository.disabled;

  return {
    repository: repository.full_name,
    issueNumber: issue.number,
    title: issue.title,
    url: issue.html_url,
    issueAuthor: issue.user.login,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    ageDays,
    repositoryLanguage: language,
    assignees: (issue.assignees ?? []).map((user) => user.login),
    labels,
    commentCount: issue.comments,
    recentAttemptUsers,
    recentClaimUsers,
    linkedOpenPullRequests,
    maintainerRecent,
    hasReproductionEvidence,
    payment,
    score,
    qualified,
    reasons,
    warnings,
  };
}
