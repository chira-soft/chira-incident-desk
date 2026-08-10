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
    url.searchParams.set("sort", "created");
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

  async #searchPullRequests(query) {
    const url = new URL("https://api.github.com/search/issues");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", "updated");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", "10");
    const result = await this.#request(url.toString());
    return result.items ?? [];
  }

  async findLinkedOpenPullRequests(repository, issueNumber, issueUrl) {
    const results = new Map();
    const queries = [
      `repo:${repository} is:pr is:open "${issueUrl}"`,
      `repo:${repository} is:pr is:open "#${issueNumber}"`,
    ];

    for (const query of queries) {
      try {
        const items = await this.#searchPullRequests(query);
        for (const item of items) {
          results.set(item.html_url, {
            number: item.number,
            title: item.title,
            html_url: item.html_url,
            state: item.state,
            updated_at: item.updated_at,
          });
        }
      } catch (error) {
        console.warn(`Linked PR search skipped for ${repository}#${issueNumber}:`, error.message);
      }
    }

    return [...results.values()];
  }
}
