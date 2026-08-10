/**
 * Minimal, dependency-free GitHub API client.
 */
export class GitHubClient {
  #token;
  #delayMs;

  constructor(token, delayMs) {
    this.#token = token;
    this.#delayMs = delayMs;
  }

  async #pause() {
    if (this.#delayMs <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, this.#delayMs));
  }

  async #request(url) {
    await this.#pause();
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.#token}`,
        "User-Agent": "chira-verified-bounty-radar/0.1",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");
      const body = await response.text();
      throw new Error(
        `GitHub API ${response.status} for ${url}. Remaining=${remaining ?? "?"}, reset=${reset ?? "?"}. ${body.slice(0, 500)}`,
      );
    }

    return response.json();
  }

  async searchIssues(query, perPage = 100) {
    const url = new URL("https://api.github.com/search/issues");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", "updated");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(Math.min(perPage, 100)));
    const result = await this.#request(url.toString());
    return result.items.filter((item) => !item.pull_request && item.state === "open");
  }

  async getComments(commentsUrl) {
    const url = new URL(commentsUrl);
    url.searchParams.set("per_page", "100");
    return this.#request(url.toString());
  }

  async getRepository(repositoryUrl) {
    return this.#request(repositoryUrl);
  }

  async getIssueTimeline(repository, issueNumber) {
    const url = new URL(`https://api.github.com/repos/${repository}/issues/${issueNumber}/timeline`);
    url.searchParams.set("per_page", "100");
    return this.#request(url.toString());
  }

  async findLinkedOpenPullRequests(repository, issueNumber) {
    const results = new Map();
    try {
      const timeline = await this.getIssueTimeline(repository, issueNumber);
      for (const event of timeline) {
        if (event.event !== "cross-referenced") continue;
        const sourceIssue = event.source?.issue;
        if (!sourceIssue?.pull_request || sourceIssue.state !== "open") continue;
        const sourceRepo = sourceIssue.repository?.full_name;
        if (sourceRepo && sourceRepo !== repository) continue;
        results.set(sourceIssue.html_url, {
          number: sourceIssue.number,
          title: sourceIssue.title,
          html_url: sourceIssue.html_url,
          state: sourceIssue.state,
          updated_at: sourceIssue.updated_at,
        });
      }
    } catch (error) {
      console.warn(`Linked PR timeline check skipped for ${repository}#${issueNumber}:`, error.message);
    }
    return [...results.values()];
  }
}
