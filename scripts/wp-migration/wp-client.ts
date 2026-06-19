import type {
  WPCourse,
  WPLesson,
  WPQuestion,
  WPQuiz,
  WPTopic,
  StepsTree,
} from "./state";

const WP_BASE_URL =
  process.env.WP_BASE_URL ?? "https://healthacademy.ca/wp-json";

export class WPClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  static async authenticate(): Promise<string> {
    const username = process.env.WP_USERNAME;
    const password = process.env.WP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "WP_USERNAME and WP_PASSWORD environment variables are required"
      );
    }

    const res = await fetch(`${WP_BASE_URL}/jwt-auth/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`JWT auth failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { token: string };
    if (!data.token) {
      throw new Error("JWT auth response missing token");
    }

    return data.token;
  }

  static async verifyAdmin(token: string): Promise<number> {
    const res = await fetch(`${WP_BASE_URL}/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to verify user (${res.status})`);
    }

    const data = (await res.json()) as { id: number };
    return data.id;
  }

  private async fetchWithAuth<T>(
    path: string,
    reauthFn?: () => Promise<string>
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${WP_BASE_URL}${path}`;

    const doFetch = async (bearer: string) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate, br",
        },
      });

      const text = await res.text();
      // Handle null bytes and stray control chars (gotcha #6)
      const sanitized = text.replace(/\0/g, "");

      if (!res.ok) {
        let parsed: { code?: string } = {};
        try {
          parsed = JSON.parse(sanitized) as { code?: string };
        } catch {
          // ignore parse error
        }

        if (
          (res.status === 401 || parsed.code === "jwt_auth_invalid_token") &&
          reauthFn
        ) {
          const newToken = await reauthFn();
          this.token = newToken;
          return doFetch(newToken);
        }

        throw new Error(`WP API error ${res.status} for ${path}: ${sanitized.slice(0, 200)}`);
      }

      try {
        return JSON.parse(sanitized) as T;
      } catch (err) {
        throw new Error(
          `Failed to parse JSON from ${path}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };

    return doFetch(this.token);
  }

  private reauth = async (): Promise<string> => {
    const token = await WPClient.authenticate();
    this.token = token;
    return token;
  };

  async fetchPaginated<T>(endpoint: string, perPage = 100): Promise<T[]> {
    const separator = endpoint.includes("?") ? "&" : "?";
    const probePath = `${endpoint}${separator}per_page=${perPage}&page=1&status=any`;
    const probeUrl = `${WP_BASE_URL}${probePath}`;

    const headRes = await fetch(probeUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    if (!headRes.ok) {
      throw new Error(`Failed to get pagination headers for ${endpoint}`);
    }

    const total = parseInt(headRes.headers.get("X-WP-Total") ?? "0", 10);
    const totalPages = Math.max(
      1,
      Math.ceil(total / perPage)
    );

    if (total === 0) return [];

    const all: T[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const path = `${endpoint}${separator}per_page=${perPage}&page=${page}&status=any`;
      const items = await this.fetchWithAuth<T[]>(path, this.reauth);
      all.push(...items);
      console.log(
        `  Fetched ${endpoint} page ${page}/${totalPages} (${items.length} items, ${total} total)`
      );
      if (items.length < perPage) break;
    }

    return all;
  }

  async fetchCourses(): Promise<WPCourse[]> {
    return this.fetchPaginated<WPCourse>("/ldlms/v2/sfwd-courses?_embed=true");
  }

  async fetchCourseSteps(courseId: number): Promise<StepsTree> {
    return this.fetchWithAuth<StepsTree>(
      `/ldlms/v2/sfwd-courses/${courseId}/steps`,
      this.reauth
    );
  }

  async fetchLessons(): Promise<WPLesson[]> {
    return this.fetchPaginated<WPLesson>("/ldlms/v2/sfwd-lessons");
  }

  async fetchTopics(): Promise<WPTopic[]> {
    return this.fetchPaginated<WPTopic>("/ldlms/v2/sfwd-topic");
  }

  async fetchQuizzes(): Promise<WPQuiz[]> {
    return this.fetchPaginated<WPQuiz>("/ldlms/v2/sfwd-quiz");
  }

  async fetchQuestions(): Promise<WPQuestion[]> {
    return this.fetchPaginated<WPQuestion>("/ldlms/v2/sfwd-question");
  }

  async fetchQuestionsForQuiz(quizId: number): Promise<WPQuestion[]> {
    try {
      return await this.fetchPaginated<WPQuestion>(
        `/ldlms/v2/sfwd-question?quiz=${quizId}`
      );
    } catch {
      // Some LearnDash versions omit quiz filter — try nested route
      try {
        return await this.fetchWithAuth<WPQuestion[]>(
          `/ldlms/v2/sfwd-quiz/${quizId}/questions`,
          this.reauth
        );
      } catch {
        return [];
      }
    }
  }
}
