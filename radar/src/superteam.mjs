const BASE_URL = "https://superteam.fun";

const TECH_TERMS = [
  "agent", "ai", "api", "backend", "frontend", "full stack", "full-stack",
  "typescript", "javascript", "node", "python", "java", "react", "angular",
  "docker", "database", "security", "vulnerability", "automation", "webhook",
  "cloud", "sdk", "mcp", "llm", "web app", "dapp", "integration",
];

const SPECIALIST_TERMS = ["rust", "anchor", "smart contract", "on-chain program", "solana program"];
const NON_TECH_TERMS = ["podcast cover", "logo design", "video editing", "meme", "twitter thread", "content bounty"];

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function daysUntil(iso, now = new Date()) {
  const deadline = new Date(iso);
  if (Number.isNaN(deadline.getTime())) return null;
  return (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
}

function searchableText(listing, details) {
  return `${listing?.title ?? ""}\n${listing?.slug ?? ""}\n${JSON.stringify(details ?? {})}`.toLowerCase();
}

function unwrapListings(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function dedupeListings(items) {
  const seen = new Map();
  for (const item of items) {
    if (!item) continue;
    const key = item.id ?? item.slug;
    if (key) seen.set(key, item);
  }
  return [...seen.values()];
}

export function isSuperteamListingActive(listing, now = new Date()) {
  if (!listing || listing.status !== "OPEN") return false;
  if (listing.isWinnersAnnounced === true) return false;
  if (!listing.deadline) return false;
  const deadline = new Date(listing.deadline);
  return !Number.isNaN(deadline.getTime()) && deadline.getTime() > now.getTime();
}

export function scoreSuperteamListing(listing, details, config, now = new Date()) {
  const reasons = [];
  const warnings = [];
  let score = 0;

  const rewardAmount = numberOr(listing.rewardAmount, 0);
  const submissions = numberOr(listing?._count?.Submission, 0);
  const deadlineDays = daysUntil(listing.deadline, now);
  const text = searchableText(listing, details);
  const techMatches = TECH_TERMS.filter((term) => text.includes(term));
  const specialistMatches = SPECIALIST_TERMS.filter((term) => text.includes(term));
  const nonTechMatches = NON_TECH_TERMS.filter((term) => text.includes(term));
  const active = isSuperteamListingActive(listing, now);

  if (active) {
    score += 25;
    reasons.push("listing is open, deadline is in the future, and winners are not announced");
  } else {
    warnings.push("listing is stale, closed, expired, or already has winners");
    score -= 100;
  }

  if (["AGENT_ALLOWED", "AGENT_ONLY"].includes(listing.agentAccess)) {
    score += listing.agentAccess === "AGENT_ONLY" ? 15 : 10;
    reasons.push(`agent access: ${listing.agentAccess}`);
  } else {
    score -= 100;
    warnings.push("agent is not eligible for this listing");
  }

  if (rewardAmount >= 1000) score += 20;
  else if (rewardAmount >= 500) score += 15;
  else if (rewardAmount >= 250) score += 12;
  else if (rewardAmount >= config.minReward) score += 10;
  else warnings.push(`reward below configured minimum: ${rewardAmount}`);

  if (submissions === 0) {
    score += 20;
    reasons.push("no submissions yet");
  } else if (submissions <= 5) {
    score += 15;
    reasons.push("very low competition");
  } else if (submissions <= 15) {
    score += 10;
    reasons.push("low competition");
  } else if (submissions <= 30) {
    score += 5;
    reasons.push("moderate competition");
  } else if (submissions > 75) {
    score -= 20;
    warnings.push(`very high competition: ${submissions} submissions`);
  } else {
    score -= 8;
    warnings.push(`high competition: ${submissions} submissions`);
  }

  if (deadlineDays !== null) {
    if (deadlineDays < 1) {
      score -= 20;
      warnings.push("less than one day remains");
    } else if (deadlineDays <= 3) {
      score -= 5;
      warnings.push("short delivery window");
    } else if (deadlineDays <= 14) {
      score += 5;
      reasons.push("workable deadline");
    } else {
      score += 10;
      reasons.push("comfortable deadline");
    }
  }

  if (techMatches.length >= 2) {
    score += 15;
    reasons.push(`technical fit: ${[...new Set(techMatches)].slice(0, 5).join(", ")}`);
  } else if (techMatches.length === 1) {
    score += 5;
    reasons.push(`possible technical fit: ${techMatches[0]}`);
  } else {
    score -= 10;
    warnings.push("no strong match with CHIRA technical stack detected");
  }

  if (specialistMatches.length > 0) {
    score -= 15;
    warnings.push(`specialist Solana/Rust work detected: ${[...new Set(specialistMatches)].join(", ")}`);
  }

  if (nonTechMatches.length > 0) {
    score -= 25;
    warnings.push(`non-priority content/design work detected: ${[...new Set(nonTechMatches)].join(", ")}`);
  }

  if (listing?.sponsor?.isVerified) {
    score += 5;
    reasons.push("verified sponsor");
  }

  if (listing.type === "project") {
    score += 8;
    reasons.push("project format can reduce winner-takes-all competition");
  } else if (listing.type === "bounty") {
    score += 3;
  }

  score = Math.max(0, Math.min(100, score));
  const actionable =
    active &&
    rewardAmount >= config.minReward &&
    ["AGENT_ALLOWED", "AGENT_ONLY"].includes(listing.agentAccess) &&
    submissions <= config.maxSubmissions &&
    techMatches.length > 0 &&
    nonTechMatches.length === 0 &&
    score >= config.minScore;

  return {
    source: "superteam",
    id: listing.id,
    slug: listing.slug,
    url: `https://superteam.fun/earn/listing/${listing.slug}`,
    title: listing.title,
    type: listing.type,
    rewardAmount,
    token: listing.token ?? "UNKNOWN",
    deadline: listing.deadline,
    deadlineDays: deadlineDays === null ? null : Math.max(0, Math.round(deadlineDays * 10) / 10),
    agentAccess: listing.agentAccess,
    status: listing.status,
    isWinnersAnnounced: Boolean(listing.isWinnersAnnounced),
    submissions,
    comments: numberOr(listing?._count?.Comments, 0),
    sponsor: listing?.sponsor?.name ?? "Unknown",
    sponsorVerified: Boolean(listing?.sponsor?.isVerified),
    techMatches: [...new Set(techMatches)],
    specialistMatches: [...new Set(specialistMatches)],
    score,
    actionable,
    reasons,
    warnings,
  };
}

export class SuperteamClient {
  constructor(apiKey, options = {}) {
    if (!apiKey) throw new Error("SUPERTEAM_AGENT_API_KEY is required");
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request(path) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Superteam API ${response.status}: ${body.slice(0, 300)}`);
    }
    return response.json();
  }

  async listLive({ take = 50, type = null, deadline = null } = {}) {
    const params = new URLSearchParams();
    params.set("take", String(take));
    if (type) params.set("type", type);
    if (deadline) params.set("deadline", deadline);
    return this.request(`/api/agents/listings/live?${params.toString()}`);
  }

  async getDetails(slug) {
    return this.request(`/api/agents/listings/details/${encodeURIComponent(slug)}`);
  }
}

export async function discoverSuperteamOpportunities(apiKey, config, now = new Date()) {
  const client = new SuperteamClient(apiKey);
  const deadline = `${now.getUTCFullYear()}-12-31`;
  const types = [null, "bounty", "project", "hackathon"];
  const batches = [];

  for (const type of types) {
    try {
      const raw = await client.listLive({
        take: config.maxCandidates,
        type,
        deadline,
      });
      batches.push(...unwrapListings(raw));
    } catch (error) {
      console.warn(`Superteam listing query skipped (${type ?? "all"}): ${error.message}`);
    }
  }

  const listings = dedupeListings(batches);
  const active = listings
    .filter((listing) => isSuperteamListingActive(listing, now))
    .sort((a, b) => numberOr(b.rewardAmount) - numberOr(a.rewardAmount));

  const candidates = [];
  for (const listing of active.slice(0, config.maxCandidates)) {
    let details = null;
    try {
      details = await client.getDetails(listing.slug);
    } catch (error) {
      console.warn(`Superteam details skipped for ${listing.slug}: ${error.message}`);
    }
    candidates.push(scoreSuperteamListing(listing, details, config, now));
  }

  return {
    fetched: listings.length,
    staleExcluded: listings.length - active.length,
    candidates,
  };
}
