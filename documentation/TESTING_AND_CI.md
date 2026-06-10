# Testing, CI, and Configuration

> Part of the [Getting Started](../GETTING_STARTED.md)

---

## 1. Testing

Tests use [Vitest](https://vitest.dev/) with two projects: `unit` and `integration`.

### Test Structure

```
tests/
├── setup.ts                    # Global mocks (server-only, next/navigation, next/headers, next/cache, React.cache)
├── unit/
│   └── rbac/                   # Unit tests for data loaders and auth helpers
│       ├── admin-data-loaders.unit.test.ts
│       ├── community-page-data.unit.test.ts
│       ├── middleware.test.ts
│       ├── quiz-data-loaders.unit.test.ts
│       ├── require-admin.test.ts
│       ├── require-user.test.ts
│       ├── user-data-loaders.unit.test.ts
│       └── user-is-enrolled.unit.test.ts
└── integration/
    └── rbac/                   # Integration tests for auth-gated flows
        ├── api-routes.test.ts
        ├── community-actions.test.ts
        ├── enroll-action.test.ts
        ├── lesson-actions.test.ts
        ├── quiz-student-flows.test.ts
        ├── server-actions.test.ts
        └── user-actions-unauthenticated.test.ts
```

### Running Tests

| Command | Runs |
|---------|------|
| `npm test` | All tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:watch` | Watch mode (re-runs on file save) |
| `npm run test:coverage:unit` | Unit tests with coverage report |

Coverage is collected for: `app/data/**`, `app/actions/**`, `app/api/**`, `middleware.ts`.

### Global Test Mocks (`tests/setup.ts`)

The setup file configures mocks that make Next.js server-only code testable in a Node.js environment:

| Module | Mock behaviour |
|--------|---------------|
| `server-only` | Returns empty module (prevents throw) |
| `next/navigation` | `redirect()` throws `Error("NEXT_REDIRECT")` with the target URL in `.digest` |
| `next/navigation` | `notFound()` throws `Error("NEXT_NOT_FOUND")` |
| `next/headers` | `headers()` returns empty `Headers` object |
| `next/cache` | `revalidatePath` / `revalidateTag` are no-op spies |
| `react` | `cache()` is replaced with identity function |

**Asserting redirects in tests:**

```typescript
await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
```

---

## 2. Environment Variables Reference

All variables are validated in `lib/env.ts`. Server-side variables are never exposed to the browser.

### Server-Side Variables (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon connection string with `?sslmode=require`) |
| `BETTER_AUTH_SECRET` | Random secret for better-auth (min 32 chars recommended) |
| `BETTER_AUTH_URL` | Full URL of the app (e.g. `http://localhost:3000` or production URL) |
| `AUTH_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `ARCJET_KEY` | Arcjet project key |
| `AWS_ACCESS_KEY_ID` | Tigris / AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Tigris / AWS secret key |
| `AWS_ENDPOINT_URL_S3` | Tigris S3 endpoint URL |
| `AWS_ENDPOINT_URL_IAM` | Tigris IAM endpoint URL |
| `AWS_REGION` | AWS region (use `auto` for Tigris) |
| `S3_BUCKET_NAME` | Main S3 bucket name (for uploads) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Server-Side Variables (optional — AI Advisor)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_PROVIDER` | `openai` | `"openai"` or `"openrouter"` |
| `OPENAI_API_KEY` | — | OpenAI API key. If unset, falls back to rule-based replies. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model slug |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | OpenRouter model slug |

### Client-Side Variables (exposed to browser via `NEXT_PUBLIC_` prefix)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES` | S3 bucket name for publicly served images |
| `NEXT_PUBLIC_S3_PUBLIC_URL` | Base public URL for S3 images (e.g. `https://health-academy-lms.fly.storage.tigris.dev`) |

### Setting Up OAuth Providers

**GitHub OAuth App:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Set **Homepage URL** to your app URL.
3. Set **Authorization callback URL** to `<your-app-url>/api/auth/callback/github`.
4. Copy the Client ID and generate a Client Secret.

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID (Web application type).
3. Add `<your-app-url>/api/auth/callback/google` to Authorized redirect URIs.
4. Copy the Client ID and Client Secret.

---

## 3. CI and GitHub Actions

The CI pipeline (`.github/workflows/test.yml`) runs automatically on every push to `main` and `testing`, and on pull requests targeting `main`.

### Jobs

**`unit-tests`:**
1. Checks out the repository.
2. Sets up Node.js 20.
3. Runs `npm ci` (which also runs `prisma generate` via the `postinstall` script — no database connection required).
4. Runs `npm run test:coverage:unit`.
5. Uploads the coverage report as an artifact (retained 14 days).

**`integration-tests`:**
1. Checks out the repository.
2. Sets up Node.js 20.
3. Runs `npm ci`.
4. Runs `npm run test:integration`.

> **Note:** Integration tests currently do not require a live database connection — they mock the Prisma client. If real-database integration tests are added in the future, a test database connection string will need to be added as a GitHub Actions secret.

### Running Linting

```bash
npm run lint
```

ESLint is configured in `eslint.config.mjs`. Note: linting and TypeScript errors are currently set to non-blocking in `next.config.ts` (`ignoreDuringBuilds: true`) — enabling these for production builds is recommended.
