# Testing, CI, and Configuration

> Part of the [Getting Started](../GETTING_STARTED.md)

---

## Table of Contents

1. [Testing Philosophy and Architecture](#1-testing-philosophy-and-architecture)
2. [Test Infrastructure and Setup](#2-test-infrastructure-and-setup)
3. [Layer 1 — Unit Tests](#3-layer-1--unit-tests)
4. [Layer 2 — Integration Tests](#4-layer-2--integration-tests)
5. [Layer 3 — End-to-End Tests (Playwright)](#5-layer-3--end-to-end-tests-playwright)
6. [Code Coverage](#6-code-coverage)
7. [Bugs Found and Fixes Applied](#7-bugs-found-and-fixes-applied)
8. [CI Pipeline (GitHub Actions)](#8-ci-pipeline-github-actions)
9. [Running Tests Locally](#9-running-tests-locally)
10. [Environment Variables Reference](#10-environment-variables-reference)

---

## 1. Testing Philosophy and Architecture

The testing framework is designed around three distinct layers, each serving a different purpose and running at a different speed:

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 3 — E2E (Playwright)                                      │
│  Real browser · Real app (next build) · Real Postgres            │
│  Purpose: prove critical user journeys work end-to-end           │
│  Speed: slow (~5–10 min) · Count: 3 journeys + 9 a11y audits    │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2 — Integration Tests (Vitest)                            │
│  Real server code (actions, handlers) · Mocked I/O boundaries   │
│  Purpose: verify wiring, auth gates, business rules              │
│  Speed: fast (~1 sec) · Count: 139 tests across 13 files         │
├──────────────────────────────────────────────────────────────────┤
│  Layer 1 — Unit Tests (Vitest)                                   │
│  Pure functions and isolated modules · No I/O                    │
│  Purpose: lock in logic correctness, edge cases, RBAC            │
│  Speed: very fast (<1 sec) · Count: 166 tests across 12 files    │
└──────────────────────────────────────────────────────────────────┘
```

**Why this structure?**

The Health Academy LMS has several categories of logic that require different kinds of verification:

- **Authorization gates** (`requireAdmin`, `requireUser`, `middleware`) are the most security-critical code in the app. Failures here expose admin functionality to arbitrary users or block legitimate access. These are tested exhaustively at the unit level because they are pure, fast to test, and correctness can be verified entirely with mocks.

- **Business flows** (enrollment, quiz grading, community moderation) involve real application logic wired across multiple modules: auth gates, Prisma operations, external APIs (Stripe), Next.js cache invalidation. Integration tests exercise these flows by calling the real handler or action code while mocking only the external boundaries (database, auth session, Stripe). This catches wiring bugs — for example, `requireAdmin()` being called *inside* a try/catch instead of before it, which caused a real auth bypass.

- **User journeys** (enroll → pay → dashboard, take quiz → see score, mark lesson complete) can only be verified by running a real browser against a real application with a real database. Playwright E2E tests cover these.

- **Accessibility** (WCAG 2.0/2.1 AA compliance) is verified via axe-core scans embedded in E2E tests, because it requires a rendered DOM in a real browser.

---

## 2. Test Infrastructure and Setup

### Global Test Mocks (`tests/setup.ts`)

Vitest (unit + integration layers) requires a global setup file that makes Next.js server-side code runnable in a plain Node.js environment. `tests/setup.ts` provides the following mocks, applied to every test file automatically:

| Module | What is mocked | Why |
|--------|----------------|-----|
| `server-only` | Returns empty module | Prevents runtime throw outside Next.js context |
| `next/navigation` | `redirect()` throws `Error("NEXT_REDIRECT")` | Allows tests to assert redirect destination without real navigation |
| `next/navigation` | `notFound()` throws `Error("NEXT_NOT_FOUND")` | Allows tests to assert 404 triggers |
| `next/headers` | `headers()` returns an empty `Headers` object | Prevents "headers only available in server context" crash |
| `next/cache` | `revalidatePath`, `revalidateTag` become no-op spies | Allows asserting cache invalidation calls without real cache |
| `react` | `cache()` replaced with identity function | Disables memoization so each `requireAdmin()` / `requireUser()` re-runs its async logic, enabling per-test session changes |

**Asserting redirects:**

```typescript
await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");
expect(mockRedirect).toHaveBeenCalledWith("/not-admin");
```

### Test Database (`docker-compose.test.yml` + `prisma/seed-test.ts`)

Integration tests that test DB-connected logic (currently mocked), and E2E tests (which use a real database), share a deterministic seeded Postgres instance:

```
postgres:16-alpine
  port:  5433
  user:  test
  pass:  test
  db:    healthacademy_test
  data:  tmpfs (in-memory, wiped on container stop)
```

The seed script (`prisma/seed-test.ts`) uses `upsert` throughout and is idempotent — safe to re-run. It creates:

| Entity | Fixed ID / slug | Purpose |
|--------|-----------------|---------|
| Admin user | `admin-test-001` | E2E admin auth and admin page tests |
| Student user | `student-test-001` | E2E student auth, enrolled journey tests |
| Published course 1 | `test-nutrition-course` | Lesson progress and quiz E2E journeys |
| Published course 2 | `test-advanced-nutrition` | Enrollment E2E journey (student starts unenrolled) |
| Chapter + lesson | Fixed UUIDs | Lesson progress test target |
| Quiz + 2 questions | Fixed UUIDs | Quiz journey test target; correct answers are known |
| Active enrollment | Student → Course 1 | Pre-enrolled so quiz/lesson journeys skip payment step |
| Community post | Fixed cuid | Community action tests |

**Starting the test database locally:**

```bash
npm run test:db:up      # docker compose up -d
npm run test:db:reset   # prisma migrate reset --force (runs migrations)
npm run test:db:setup   # both of the above in sequence
npm run test:db:down    # stop and remove the container
```

### `tests/e2e/helpers/` — Shared E2E Utilities

| File | Purpose |
|------|---------|
| `auth.ts` | Creates Better Auth sessions directly in Postgres; writes `student.json` and `admin.json` storage states |
| `db.ts` | Prisma queries used inside tests (e.g. create pending enrollment, fetch latest quiz attempt) |
| `stripe-webhook.ts` | Constructs and signs a real `checkout.session.completed` Stripe event; POSTs it to the running app |
| `a11y.ts` | Wraps `@axe-core/playwright` with WCAG 2.0/2.1 AA tag scope and formats violation messages |
| `seed-ids.ts` / `fixtures/` | Exports the same fixed IDs from `prisma/seed-test.ts` for use in spec files |

---

## 3. Layer 1 — Unit Tests

**Framework:** Vitest 4, Node environment, no browser  
**Count:** 166 tests across 12 files  
**Run:** `npm run test:unit`

### What is tested and why

#### `tests/unit/rbac/` — Authorization Guards

These are the highest-priority tests in the entire suite. Every admin route, server action, and API handler in the application depends on `requireAdmin()` or `requireUser()` returning correctly or throwing `NEXT_REDIRECT`. A failure here would silently expose protected endpoints.

| File | Code under test | What is verified |
|------|----------------|-----------------|
| `require-admin.test.ts` | `app/data/admin/require-admin.ts` | Unauthenticated → `/login`; role "user" → `/not-admin`; null/empty/wrong-case roles all redirect; case-sensitive role comparison prevents privilege escalation; banned admin still passes (documents intended behaviour); returns full session on success |
| `require-user.test.ts` | `app/data/user/require-user.ts` | Unauthenticated → `/login`; admin + regular user both pass; banned flag does not redirect (enforced downstream per-action) |
| `middleware.test.ts` | `middleware.ts` | Arcjet `createMiddleware` is unwrapped for direct testing; `/admin/*` without session cookie → redirect `/login`; non-admin paths pass through unconditionally; documents that middleware checks cookie *presence* only — role is validated by `requireAdmin()` inside each handler |
| `user-is-enrolled.unit.test.ts` | `app/data/user/user-is-enrolled.ts` | Enrollment status `Active` grants access; `Pending`, `Cancelled`, and missing enrollment all deny |

**Why these tests exist at the unit level:** Authorization failures are silent in production — a mis-placed try/catch or a wrong redirect destination won't crash the app, it just lets the wrong user through. Unit tests lock in the exact redirect destinations, the exact role strings, and the case-sensitivity so these invariants can never silently regress.

#### `tests/unit/rbac/` — Data Loaders

| File | Code under test | What is verified |
|------|----------------|-----------------|
| `admin-data-loaders.unit.test.ts` | `app/data/admin/*` loaders | All admin data loaders redirect non-admins before touching Prisma; happy paths return correct shape |
| `user-data-loaders.unit.test.ts` | `app/data/user/*`, `app/data/course/*`, `app/data/quiz/*` | Unauthenticated → redirect; unenrolled access → `notFound()`; `Pending` enrollment → `notFound()`; `Active` enrollment → content returned; free-preview bypass works |
| `quiz-data-loaders.unit.test.ts` | `app/data/quiz/*` | Quiz access gating: enrolled vs. unenrolled; attempt creation; `allowMultipleAttempts` flag enforcement |
| `community-page-data.unit.test.ts` | `app/data/community/*` | Community page loader auth gate and enrolled-course scoping |

#### `tests/unit/chat/` — AI Advisor Logic

| File | Code under test | What is verified |
|------|----------------|-----------------|
| `prompt.unit.test.ts` | `lib/chat/prompt.ts` | `buildChatMessages` message structure (system → history → user order); all 4 modes (`coach`, `study`, `quick`, `pdf`) produce correct instruction strings; all 3 tones (`supportive`, `direct`, `study`); all 3 response styles (`concise`, `balanced`, `detailed`); `strictSourceUse` and `pdfScope:"focus"` modes; conversation summary included/omitted; excerpts formatted with full location path; user goals/notes included correctly |
| `safety.unit.test.ts` | `lib/chat/safety.ts` | Clean questions produce no flags; urgent patterns (breathing difficulty, chest pain, self-harm crisis) produce override reply that skips LLM; caution patterns (medication, pregnancy, allergy, eating disorder) produce flags without override; `applySafetyPostProcessing` appends clinician reminder when reply lacks one; passes through unchanged when reply already mentions clinician |

**Why these tests exist:** The AI Advisor contains safety-critical logic. If the safety system fails to detect a crisis phrase and forwards the prompt to the LLM, the chatbot might respond to an emergency with nutritional advice instead of directing the user to emergency services. Unit tests lock in these detection patterns against regression.

#### `tests/unit/quiz/` — Quiz Scoring

| File | Code under test | What is verified |
|------|----------------|-----------------|
| `scoring.unit.test.ts` | `app/quizzes/[quizId]/action.ts` — `submitQuizAttempt` | All correct → score 100%, passed; all wrong → score 0%, failed; partial (2/4) → score 50%; `passingScore: 0` → always passed; no questions → structured error, no DB write; time limit exceeded (attempt created 31 min ago, limit 30 min) → expires attempt with score 0, does not grade normally |

#### `tests/unit/schemas/` — Zod Validation

| File | Code under test | What is verified |
|------|----------------|-----------------|
| `chat-request.unit.test.ts` | `chatRequestSchema` in `app/api/chat/route.ts` | Valid minimal body parses; message at exactly 1000 chars passes; 1001 chars fails; missing `conversationId` fails; empty `conversationId` (`min(1)`) fails; invalid enum values for `mode` and `tone` fail; all optional fields omittable |

---

## 4. Layer 2 — Integration Tests

**Framework:** Vitest 4, Node environment  
**Count:** 139 tests across 13 files  
**Run:** `npm run test:integration`

Integration tests import and execute **real application code** — the same server actions, route handlers, and data loaders that run in production — while mocking only external I/O boundaries: the Prisma client, the auth session, and third-party SDKs (Stripe, S3). This tests the wiring between modules, not just individual functions.

> **Note on "real" vs mocked database:** All integration tests mock `@/lib/db` (the Prisma client). They do not talk to Postgres. The test database provisioned by Docker Compose is used by the E2E layer. See [section 5](#5-layer-3--end-to-end-tests-playwright) for the first layer that uses real SQL.

### `tests/integration/rbac/` — Authorization and Business Logic

| File | What it tests | Why integration (not unit) |
|------|--------------|---------------------------|
| `api-routes.test.ts` | All 5 admin-only API route handlers: `POST /api/quizzes`, `PATCH /api/quizzes/[quizId]`, `POST /api/s3/upload`, `DELETE /api/s3/delete`, `POST /api/lesson-documents/upload` | Tests the full handler including request parsing, auth check placement, and response shape — not just the auth function in isolation |
| `server-actions.test.ts` | Admin server actions (lesson CRUD, course CRUD, quiz admin ops) | Verifies actions call `requireAdmin()` before any DB operation, and that the DB write path works for the admin happy path |
| `enroll-action.test.ts` | `enrollInCourseAction` — the public course enrollment server action | Covers unauthenticated soft response (no redirect — public page), rate limiting (Arcjet), existing active enrollment, new customer creation, Stripe session creation, idempotent re-enrollment on existing pending record |
| `community-actions.test.ts` | `createPost`, `createComment`, `toggleLike`, `deleteCommunityPost`, `deleteCommunityComment` | Enrollment gate for writes; owner vs non-owner delete; admin override for deletes; case-insensitive role string handling (`"Admin"` vs `"admin"`) |
| `lesson-actions.test.ts` | `markLessonComplete` server action | Auth gate; enrollment check; DB upsert called; idempotent re-marking behavior |
| `quiz-student-flows.test.ts` | `submitQuizAttempt` (wiring) + `deleteQuizAttempt` (ownership) | Unauthenticated redirect; cross-user ownership enforcement (not just "attempt not found" — no DB writes); admin delete scoping |
| `user-actions-unauthenticated.test.ts` | All student-facing actions and data loaders called with no session | Bulk sweep confirming every protected action redirects to `/login` before executing any code |

### `tests/integration/chat/` — AI Chat API

| File | What it tests |
|------|--------------|
| `api-chat.test.ts` | `POST /api/chat` route handler — authentication redirect; valid JSON returns stored turn; empty message + no PDF returns 400; message over 1000 chars returns Zod 400; safety override path skips `generateNutritionReply`; `mode: "study"` forwarded to `buildChatMessages` and stored in DB |

### `tests/integration/stripe/` — Payment Webhook

| File | What it tests |
|------|--------------|
| `webhook.test.ts` | `POST /api/webhook/stripe` — missing signature header → 400; invalid signature → 400; unhandled event type → 200 ignored; `checkout.session.completed` with missing metadata → 400; user not found by Stripe customer ID → 404; happy path → `enrollment.update` called with `status: "Active"`, 200; duplicate event delivery calls `enrollment.update` twice (idempotency is Stripe's responsibility) |

### `tests/integration/security/` — IDOR and Access Control

These tests verify that ownership and enrollment checks work at the *server action* level — independent of the UI. An attacker who calls server actions directly (e.g. via a crafted HTTP request) should receive the same denial.

| File | What it tests |
|------|--------------|
| `idor-quiz.test.ts` | Student B cannot submit against Student A's quiz attempt; Student B cannot delete Student A's attempt; admin cannot delete another user's attempt (scoping is per-user, not per-role) |
| `idor-community.test.ts` | Student B cannot delete Student A's post; Student B cannot delete Student A's comment; non-admin cannot ban a user via `banUserAction` |
| `enrollment-gate.test.ts` | `getLessonContent` unauthenticated → `/login`; no enrollment → `notFound()`; `Pending` enrollment → `notFound()`; `Active` enrollment → lesson returned |
| `banned-user.test.ts` | `requireUser()` returns banned user without redirecting (auth layer does not gate on ban); `createPost` blocks banned users before DB write; `submitQuizAttempt` for a banned user still reaches the DB layer (quiz submission is not ban-gated — documents current behaviour) |

---

## 5. Layer 3 — End-to-End Tests (Playwright)

**Framework:** Playwright 1.x, Chromium (headless)  
**Run:** `npm run test:e2e`  
**Prerequisite:** `next build` must have run; test database must be running with migrations applied

### How E2E tests are different from integration tests

| | Integration tests | E2E tests |
|-|------------------|-----------|
| Runs against | Node import of real code | Running `next start` server |
| Database | Mocked (no real SQL) | Real Postgres (seeded) |
| Auth | Mocked session objects | Real Better Auth sessions (cookie inserted directly into DB) |
| Browser | None | Chromium (headless) |
| Stripe | Mocked SDK | Signed webhook fired via `fetch` to running app |
| What it catches | Logic wiring bugs | Real UI bugs, navigation bugs, DB persistence bugs |

### Global Setup (`tests/e2e/global-setup.ts`)

Runs once before any test file:

1. Runs `prisma migrate reset --force` against the test database — applies all migrations from scratch.
2. Runs `prisma/seed-test.ts` to populate deterministic fixture data.
3. Inserts two real Better Auth sessions into the `session` table (student, admin).
4. Saves Playwright storage state files (`tests/e2e/.auth/student.json`, `tests/e2e/.auth/admin.json`) by launching a headless browser, injecting the session cookie, and persisting the context.

This means every test starts with an already-authenticated browser context — no OTP flows, no UI login. The student storage state is the default; admin state is used only in admin page a11y tests.

### Journey 1 — Enrollment via Stripe Webhook

**File:** `tests/e2e/journeys/enroll.spec.ts`  
**Auth:** Student (course 2 not yet enrolled)

The enrollment flow is the most architecturally complex journey: it spans a browser navigation, a Stripe-signed webhook POST, a Prisma update, and a Next.js revalidation. Because there is no real Stripe hosted page, the test simulates it:

1. Navigate to `/courses`, assert course catalog renders.
2. Click "Advanced Nutrition" course card.
3. Assert "Enroll Now!" button is visible.
4. Create a `Pending` enrollment record in the DB directly (simulates what `enrollInCourseAction` does before redirecting to Stripe).
5. Fire a properly-signed `checkout.session.completed` Stripe webhook to `POST /api/webhook/stripe` using `stripe.webhooks.generateTestHeaderString`.
6. Navigate to `/dashboard`.
7. Assert "Advanced Nutrition" card appears in "Enrolled Courses".
8. Assert the progress percentage shows `0%`.
9. Before the catalog click, `assertNoA11yViolations` runs against `/courses`.

**Why this test exists:** The Stripe webhook activation path — `checkout.session.completed` → `enrollment.update` status `Active` — is what actually grants a student access to their purchased course. If this path is broken, paying students cannot access their content. No other test layer exercises the full HTTP path of the webhook handler against a real database.

### Journey 2 — Quiz Completion

**File:** `tests/e2e/journeys/quiz.spec.ts`  
**Auth:** Student (pre-enrolled in course 1 via seed)

1. Navigate to the quiz page `/quizzes/{quizId}`.
2. Click "Start Quiz".
3. Assert attempt number badge is visible.
4. Click the button labeled "Carbohydrates" (correct answer for Q1).
5. Click the button labeled "Amino acids" (correct answer for Q2).
6. Click "Submit Quiz".
7. Assert "Passed" badge is visible.
8. Assert `Score: 100%` text is visible.
9. Query the database directly (`getLatestQuizAttempt`) and assert `isComplete: true`, `score: 100`.
10. `assertNoA11yViolations` runs after the quiz loads with questions visible.

**Why this test exists:** The quiz grading pipeline involves state-machine logic (attempt start → answer selection → submission → grading → result display). Errors in the client-side timer, the server action transaction, or the result rendering component would not be caught by unit or integration tests.

### Journey 3 — Lesson Progress

**File:** `tests/e2e/journeys/lesson-progress.spec.ts`  
**Auth:** Student (pre-enrolled in course 1)

1. Navigate to `/dashboard/test-nutrition-course/{lessonId}`.
2. Assert "Mark as Complete" button is visible.
3. `assertNoA11yViolations` runs at this point.
4. Click "Mark as Complete".
5. Assert the button changes to "Completed".
6. Assert the sidebar lesson item shows "Completed" text.
7. Navigate away to `/dashboard/{slug}/community`.
8. Navigate back to the lesson page.
9. Assert the lesson item still shows "Completed" (persistence verified).
10. Assert the progress percentage displayed in the sidebar is greater than 0%.

**Why this test exists:** Progress tracking is a core LMS feature. Persistence errors — where progress updates succeed but are not visible on reload — are only detectable by navigating away and returning. The sidebar `useCourseProgress` hook and `LessonProgress` DB reads must both work for this test to pass.

### Accessibility Audits (`tests/e2e/a11y/pages.spec.ts`)

Each test navigates to a page, waits for network idle, and runs `AxeBuilder` scoped to `wcag2a` and `wcag2aa` tags. Violations fail the test with a formatted message showing the rule ID, description, and offending HTML.

| Page | Auth state | Reason for inclusion |
|------|-----------|---------------------|
| `/` (home) | Anonymous | Public landing page, widest audience reach |
| `/courses` | Anonymous | Main conversion funnel entry point |
| `/login` | Anonymous | Auth flow — screen reader / keyboard nav is critical here |
| `/dashboard` | Student | Main post-login destination |
| `/dashboard/[slug]/[lessonId]` | Student | Primary content consumption page |
| `/quizzes/[quizId]` | Student | Complex interactive form — high a11y risk |
| `/chatbot` | Student | Chat interface — input, messages, keyboard nav |
| `/admin` | Admin | Admin panel starting page |
| `/admin/courses` | Admin | Largest admin data table |

**Inline a11y checks in journey tests:** In addition to the standalone audits, each journey spec calls `assertNoA11yViolations` at its most content-rich state:
- `enroll.spec.ts` — after course catalog renders
- `quiz.spec.ts` — after quiz questions are visible and attempt is active
- `lesson-progress.spec.ts` — after lesson content renders

---

## 6. Code Coverage

Coverage is collected for the unit test suite only (via `npm run test:coverage:unit`). The collection scope is defined in `vitest.config.ts`:

```
app/data/admin/**/*.ts
app/data/user/**/*.ts
app/data/course/**/*.ts
app/data/quiz/**/*.ts
app/data/community/**/*.ts
app/actions/**/*.ts
app/quizzes/**/action.ts
app/dashboard/**/actions.ts
app/(public)/**/actions.ts
middleware.ts
app/admin/**/actions.ts
app/admin/**/route.ts
app/api/**/*.ts
lib/chat/prompt.ts  (implicit via unit tests)
lib/chat/safety.ts  (implicit via unit tests)
```

### Current Coverage Summary

| Metric | Value |
|--------|-------|
| Statements | **76.8%** (245 / 319) |
| Branches | **72.1%** (147 / 204) |
| Functions | **86.5%** (64 / 74) |
| Lines | **77.1%** (236 / 306) |

### Coverage by Area

| Module | Statements | Notes |
|--------|-----------|-------|
| `lib/chat/prompt.ts` | ~98% | Fully covered by unit tests |
| `lib/chat/safety.ts` | ~99% | Fully covered by unit tests |
| `app/data/course/get-lesson-content.ts` | ~95% | Auth and enrollment gate paths covered |
| `app/quizzes/[quizId]/action.ts` | ~64% | Scoring edge cases covered; some Prisma transaction branches incomplete |
| `app/data/admin/**` | ~42% | Several loaders lack happy-path Prisma mock coverage |
| `lib/rethrow-next-redirect.ts` | 0% | Simple utility; not in coverage scope but trivially testable |

### What is not covered by unit tests (and why it's OK)

- **Stripe webhook handler** (`app/api/webhook/stripe/route.ts`) — covered by integration tests and E2E enrollment journey instead.
- **Chat API route** (`app/api/chat/route.ts`) — covered by integration tests.
- **Admin data loaders with complex Prisma queries** — partially covered; deep Prisma result shapes are better tested in E2E where real SQL runs.
- **UI components** — not included in coverage scope; UI correctness is verified by E2E journey tests.

---

## 7. Bugs Found and Fixes Applied

The following bugs were identified during test development across all layers — unit tests, integration tests, and the first full Playwright E2E run. All are now fixed; the tests serve as regression guards.

Bugs are grouped by category. **Severity** reflects user impact if shipped to production.

---

### 7.1 Security and authorization

#### Bug 1 — `requireAdmin()` missing from quiz API routes

**Severity:** Critical (auth bypass)  
**Discovered by:** Integration tests (`tests/integration/rbac/api-routes.test.ts`)  
**Affected routes:** `POST /api/quizzes`, `PATCH /api/quizzes/[quizId]`  
**Symptom:** A logged-in user with `role: "user"` could create and modify quizzes.  
**Root cause:** The route handlers for quiz creation and update were missing the `requireAdmin()` call entirely. Any authenticated request bypassed the admin gate.  
**Fix:** Added `await requireAdmin()` before the business logic in both handlers.  
**Regression test:** `tests/integration/rbac/api-routes.test.ts` — "user" role redirected to `/not-admin`.

#### Bug 2 — `requireAdmin()` inside `try/catch` in S3 upload route

**Severity:** Critical (auth bypass silently returns 500)  
**Discovered by:** Integration tests (`tests/integration/rbac/api-routes.test.ts`)  
**Affected route:** `POST /api/s3/upload`  
**Symptom:** A logged-in user with `role: "user"` who called the S3 presigned URL endpoint received a 500 error instead of a redirect. The `NEXT_REDIRECT` thrown by `requireAdmin()` was caught by the surrounding try/catch and returned as an internal server error.  
**Root cause:** `requireAdmin()` was placed inside a `try { }` block. Next.js redirects work by throwing a special error (`NEXT_REDIRECT`); catching it silently swallows the redirect.  
**Fix:** Moved `requireAdmin()` before the try/catch block in all route handlers.  
**Regression test:** `tests/integration/rbac/api-routes.test.ts` — dedicated regression note in the test file; asserts NEXT_REDIRECT propagates correctly.  
**Design rule enforced:** `requireAdmin()` and `requireUser()` must always be called **before** any try/catch block. The test suite documents this explicitly.

#### Bug 3 — Case-insensitive role comparison in community delete actions

**Severity:** Medium (inconsistent authorization)  
**Discovered by:** Integration tests (`tests/integration/rbac/community-actions.test.ts`)  
**Affected actions:** `deleteCommunityPost`, `deleteCommunityComment`  
**Symptom:** The admin check in community delete actions used `String(role).toLowerCase() === "admin"`, meaning `"Admin"` would pass. However, `requireAdmin()` uses strict `=== "admin"`. The inconsistency was not a security hole but created unpredictable behaviour.  
**Finding:** Test `community-actions.test.ts` documents both `"admin"` and `"Admin"` (uppercase-A) role strings. The `ADMIN_UPPER_SESSION` fixture confirms that the current soft implementation accepts both — this is documented behaviour, not a fix required.  
**Regression test:** `tests/integration/rbac/community-actions.test.ts` — `ADMIN_UPPER_SESSION` fixture with `role: "Admin"`.

---

### 7.2 E2E infrastructure and test environment

These bugs only surfaced when Playwright ran against a real `next start` server and a real Postgres database. Unit and integration tests (mocked I/O) did not catch them.

#### Bug 4 — E2E app connected to the wrong database

**Severity:** Critical (all authenticated E2E tests failed)  
**Discovered by:** Playwright E2E run — journeys redirected to `/login`; `/courses` showed production data instead of seeded test courses  
**Symptom:** `global-setup` created sessions in the test DB (`localhost:5433`), but `next start` read `DATABASE_URL` from the developer's `.env` (Neon/production). Auth cookies pointed at sessions the running app could not find.  
**Root cause:** Playwright's `webServer` inherited the shell environment (or a reused dev server on port 3000) without loading `.env.test`. `reuseExistingServer: !process.env.CI` also allowed an already-running dev server with production config to satisfy health checks.  
**Fix:**
- Added `tests/e2e/load-test-env.ts` — loads `.env.test` / `.env.test.example` before Playwright starts
- `playwright.config.ts` passes explicit test env vars to `webServer.env`
- Set `reuseExistingServer: false` so E2E always starts a fresh server with test config
- `scripts/test-all.sh` exports test env before build and E2E  
**Regression test:** All authenticated E2E journeys and student/admin a11y specs (12/12 passing).

#### Bug 5 — Better Auth session cookies were not signed

**Severity:** Critical (auth bypass in E2E — all logged-in journeys failed)  
**Discovered by:** Playwright E2E — quiz/lesson journeys landed on `/login` despite `storageState` files  
**Symptom:** `tests/e2e/helpers/auth.ts` inserted a raw session token into the `better-auth.session_token` cookie. Better Auth expects `token.hmacSignature` (HMAC-SHA256 with `BETTER_AUTH_SECRET`).  
**Root cause:** Manual DB session seeding without cookie signing.  
**Fix:**
- Added `tests/e2e/helpers/session-cookie.ts` using `makeSignature` from `better-auth/crypto`
- `createAuthStorageStates` now writes properly signed cookies to `tests/e2e/.auth/student.json` and `admin.json`  
**Regression test:** `tests/e2e/journeys/quiz.spec.ts`, `lesson-progress.spec.ts`, and student a11y specs.

#### Bug 6 — Secure cookies blocked on `http://localhost` during E2E

**Severity:** High (auth cookies not sent in E2E)  
**Discovered by:** Playwright E2E (in combination with Bug 5)  
**Symptom:** `next start` runs with `NODE_ENV=production`. Better Auth enables `__Secure-` prefixed cookies and `secure: true` in production, which browsers refuse to send over plain HTTP.  
**Fix:** `lib/auth.ts` sets `advanced.useSecureCookies: false` when `E2E_TEST=true`. Playwright and CI set `E2E_TEST=true` in `webServer.env` and `.env.test.example`.  
**Regression test:** Same authenticated E2E specs as Bug 5.

#### Bug 7 — Prisma client failed to load in Playwright global setup

**Severity:** High (E2E suite could not start)  
**Discovered by:** First local `npm run test:e2e` run  
**Symptom:** `ReferenceError: exports is not defined in ES module scope` when `global-setup.ts` imported `src/generated/prisma/client`.  
**Root cause:** Playwright transpiles test files as CommonJS while the Prisma 6 generated client is ESM (`import.meta`).  
**Fix:** `package.json` `test:e2e` script runs with `NODE_OPTIONS='--import tsx'`. CI sets `NODE_OPTIONS: --import tsx` on the `e2e-tests` job.  
**Regression test:** `global-setup.ts` completes and all 12 E2E specs run.

---

### 7.3 Data and content

#### Bug 8 — Seeded course descriptions crashed the public course page

**Severity:** High (course detail page 500 in E2E)  
**Discovered by:** Playwright enrollment journey — `/courses/test-advanced-nutrition` showed "This page couldn't load"  
**Symptom:** `SyntaxError: Unexpected token 'A', "A second s"... is not valid JSON`  
**Root cause:** `app/(public)/courses/[slug]/page.tsx` calls `JSON.parse(course.description)` expecting TipTap JSON. `prisma/seed-test.ts` stored plain-text descriptions.  
**Fix:** Added `tipTapDescription()` helper in `prisma/seed-test.ts` that wraps seed text in valid TipTap document JSON.  
**Regression test:** `tests/e2e/journeys/enroll.spec.ts` — navigates to course detail and clicks "Enroll Now!".

---

### 7.4 Accessibility (WCAG 2.0/2.1 AA)

Discovered by `@axe-core/playwright` scans in `tests/e2e/a11y/pages.spec.ts` and inline `assertNoA11yViolations` calls in journey specs. Initial E2E run: **12/12 tests failed** on a11y and/or auth; after fixes: **12/12 passing**.

#### Bug 9 — Primary brand color failed contrast on buttons and badges

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe `color-contrast` on home, catalog, login, course cards  
**Symptom:** White text on `#22c55e` (primary green) = **2.27:1** contrast (required 4.5:1). Affected Login, Get Started, Learn More, and level badges site-wide.  
**Fix:** Darkened `--primary` (and matching `--ring`, `--sidebar-primary`, `--chart-1`) in `app/globals.css` to `oklch(0.527 0.154 150)` (~green-700).  
**Regression test:** `tests/e2e/a11y/pages.spec.ts` — public pages (home, catalog, login).

#### Bug 10 — Muted metadata text failed contrast on pills

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe on course catalog cards  
**Symptom:** `#6b7280` on `#f3f4f6` = **4.39:1** (required 4.5:1) on duration/category pills in `PublicCourseCard`.  
**Fix:** Darkened `--muted-foreground` in `app/globals.css` to `oklch(0.48 0.025 264)`.  
**Regression test:** `tests/e2e/a11y/pages.spec.ts` — course catalog; `tests/e2e/journeys/enroll.spec.ts` inline a11y check.

#### Bug 11 — Footer copyright text failed contrast

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe on home and catalog (shared footer)  
**Symptom:** `text-neutral-500` (`#737373`) on `#f7f7f3` = **4.41:1**.  
**Fix:** Changed footer bottom row to `text-neutral-600` in `app/(public)/_components/Footer.tsx`.  
**Regression test:** `tests/e2e/a11y/pages.spec.ts` — home page.

#### Bug 12 — Progress bars had no accessible name

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe `aria-progressbar-name` on dashboard and lesson pages  
**Symptom:** Radix `<Progress>` rendered `role="progressbar"` without `aria-label`.  
**Fix:** `components/ui/progress.tsx` accepts `aria-label` (default `"Progress"`). Call sites pass `"Course progress"` in `CourseSidebar.tsx` and `CourseProgressCard.tsx`.  
**Regression test:** `tests/e2e/a11y/pages.spec.ts` — dashboard, lesson page.

#### Bug 13 — Chat UI icon buttons had no discernible text

**Severity:** Critical (WCAG A violation)  
**Discovered by:** axe `button-name` on `/chatbot`  
**Symptom:** Ghost `size="icon"` buttons in `components/chat/floating-chat.tsx` (close, menu, attach, copy, etc.) had no `aria-label`.  
**Fix:** Added descriptive `aria-label` to every icon-only button in `floating-chat.tsx`. Eyebrow labels changed from `text-primary/80` to `text-muted-foreground` for contrast.  
**Regression test:** `tests/e2e/a11y/pages.spec.ts` — chatbot page.

#### Bug 14 — Sonner success toast description failed contrast

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe in `tests/e2e/journeys/quiz.spec.ts` after "Start Quiz" toast appeared  
**Symptom:** Toast description text `#c0c3c8` on white = **1.76:1**.  
**Fix:** Set `--success-text: var(--foreground)` (and matching bg/border) in `components/ui/sonner.tsx`. Quiz journey waits for toast dismissal before inline a11y scan.  
**Regression test:** `tests/e2e/journeys/quiz.spec.ts`.

#### Bug 15 — Active lesson sidebar labels failed contrast

**Severity:** Serious (WCAG AA violation)  
**Discovered by:** axe on lesson page during lesson-progress journey  
**Symptom:** `text-primary` on `bg-primary/10` for active lesson title and "Currently Watching" label = **4.03:1**.  
**Fix:** Active lesson title uses `text-foreground font-semibold`; "Currently Watching" uses `text-muted-foreground` in `app/dashboard/_components/LessonItem.tsx`.  
**Regression test:** `tests/e2e/journeys/lesson-progress.spec.ts` inline a11y check; `tests/e2e/a11y/pages.spec.ts` — lesson page.

---

### 7.5 Design findings (documented, not bugs)

#### Middleware checks cookie presence only (not role)

**Type:** Design documentation  
**Affected code:** `middleware.ts`  
**Finding:** The Next.js middleware only checks whether a `better-auth.session_token` cookie exists. It does not verify the user's role. A user with `role: "user"` who has a valid session cookie will pass middleware and reach admin route handlers.  
**Why this is intentional:** Role enforcement is the responsibility of `requireAdmin()` inside each handler. Middleware checking the full session would require a database round-trip on every request.  
**Risk:** If a developer adds a new admin route/action and forgets to call `requireAdmin()`, the middleware provides no backstop. The integration tests in `tests/integration/rbac/` act as the backstop.  
**Documented in:** `tests/unit/rbac/middleware.test.ts` header comment.

#### `requireUser()` does not block banned users

**Type:** Design documentation  
**Finding:** `requireUser()` returns the session user regardless of their `banned` flag. Banning is enforced per-action (e.g. `createPost` checks `user.banned`). `submitQuizAttempt` does not check the ban flag.  
**Documented in:** `tests/unit/rbac/require-user.test.ts` and `tests/integration/security/banned-user.test.ts`.

---

### 7.6 E2E test assertion corrections (test code, not app bugs)

These were incorrect Playwright expectations discovered while debugging; the app behaviour was correct.

| Issue | Original assertion | Correction |
|-------|-------------------|------------|
| Quiz attempt badge | `getByText('Attempt #')` matched 2 elements | `getByText('Attempt #1', { exact: true })` |
| Quiz pass result | `getByText('Passed')` matched badge + toast + card | `locator('[data-slot="card-title"]')` with success message |
| Lesson progress | Expected `%` in progress header row | UI shows `1/1 lessons` + `100% complete` in separate elements — assert both strings |

---

## 8. CI Pipeline (GitHub Actions)

**File:** `.github/workflows/test.yml`  
**Trigger:** Every push to `main`, `testing`, or `testing2`; every pull request targeting `main` or `testing2`

### Job sequence

```
push / PR
    │
    ▼
┌─────────────┐
│    lint      │  ESLint + tsc --noEmit
└──────┬──────┘
       │ needs: lint
       ├─────────────────────────┐
       ▼                         ▼
┌─────────────┐           ┌──────────────────┐
│ unit-tests  │           │ integration-tests │
│ + coverage  │           │ + Postgres svc    │
│ + artifact  │           │ + migrate + seed  │
└──────┬──────┘           └────────┬─────────┘
       │         needs: both       │
       └────────────┬──────────────┘
                    ▼
           ┌────────────────┐
           │   e2e-tests    │
           │  Postgres svc  │
           │  next build    │
           │  Playwright    │
           │  + artifact    │
           └────────────────┘
```

### Job: `lint`

1. `npm ci`
2. `npm run lint` — ESLint scoped to `app/`, `components/`, `lib/`, `hooks/`, `tests/`, `middleware.ts`, `prisma/seed-test.ts`
3. `npx tsc --noEmit` — TypeScript strict check across the whole codebase

> Lint must pass before unit or integration tests run. This prevents a category of bugs where TypeScript errors are masked by `ignoreBuildErrors: true` (which has been removed from `next.config.ts`).

### Job: `unit-tests`

1. `npm ci`
2. `npm run test:coverage:unit`
3. Upload coverage report artifact (14 days retention)

### Job: `integration-tests`

1. Starts a `postgres:16-alpine` service container on port 5433
2. `npm ci`
3. `npm run test:db:reset` — runs `prisma migrate reset --force` against the service container
4. `npm run test:integration`

### Job: `e2e-tests`

1. Starts a `postgres:16-alpine` service container on port 5433
2. `npm ci`
3. `npx playwright install --with-deps chromium`
4. `npm run build` — full Next.js production build
5. `npm run test:e2e` — Playwright runs `global-setup` (migrate + seed + auth), then all spec files
6. Upload Playwright HTML report artifact (14 days retention)

**Note on E2E env vars in CI:** All required environment variables for the build and runtime are set directly in the `env:` block of the `e2e-tests` job. Sensitive production values (real Stripe keys, real S3 credentials) are never used in CI — all values are test stubs. The Stripe webhook secret in CI (`whsec_test_e2e_webhook_secret`) matches what `stripe-webhook.ts` uses to sign test events.

---

## 9. Running Tests Locally

### Prerequisites

- Node.js 20+
- Docker Desktop (for the test database)

### Vitest (unit + integration)

```bash
npm test                    # all 305 tests
npm run test:unit           # 166 unit tests
npm run test:integration    # 139 integration tests
npm run test:watch          # watch mode
npm run test:coverage:unit  # unit tests with coverage report
```

No database required for unit or integration tests.

### Playwright E2E

```bash
# 1. Start the test database
npm run test:db:setup

# 2. Create your local .env.test (gitignored)
cp .env.test.example .env.test
# Edit .env.test — at minimum set STRIPE_WEBHOOK_SECRET to any whsec_... value

# 3. Load env vars and build
set -a && source .env.test && set +a
npm run build

# 4. Run E2E tests
npm run test:e2e

# 5. (Optional) Open the HTML report
npx playwright show-report

# 6. Tear down the test database
npm run test:db:down
```

**Interactive mode:**

```bash
npm run test:e2e:ui    # Playwright UI with step-through and trace viewer
```

---

## 10. Environment Variables Reference

All variables are validated in `lib/env.ts` via `@t3-oss/env-nextjs` + Zod. The server refuses to start if any required variable is missing or invalid.

### Server-Side Variables (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon with `?sslmode=require` for production; `postgresql://test:test@localhost:5433/healthacademy_test` for local tests) |
| `BETTER_AUTH_SECRET` | Random secret for better-auth signing (min 32 chars) |
| `BETTER_AUTH_URL` | Full URL of the app (`http://localhost:3000` in development) |
| `AUTH_GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `RESEND_API_KEY` | Resend API key for email OTP delivery |
| `ARCJET_KEY` | Arcjet project key for bot detection and rate limiting |
| `AWS_ACCESS_KEY_ID` | Tigris / AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Tigris / AWS secret key |
| `AWS_ENDPOINT_URL_S3` | Tigris S3 endpoint URL |
| `AWS_ENDPOINT_URL_IAM` | Tigris IAM endpoint URL |
| `AWS_REGION` | AWS region (`auto` for Tigris) |
| `S3_BUCKET_NAME` | Main S3 bucket name (for uploads) |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

### Server-Side Variables (optional — AI Advisor)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_PROVIDER` | `openai` | `"openai"` or `"openrouter"` |
| `OPENAI_API_KEY` | — | If unset, advisor falls back to rule-based replies |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model slug |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | OpenRouter model slug |

### Client-Side Variables (exposed via `NEXT_PUBLIC_` prefix)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES` | S3 bucket name for publicly served images |
| `NEXT_PUBLIC_S3_PUBLIC_URL` | Base public URL for S3 images |

### Setting Up OAuth Providers

**GitHub OAuth App:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Set **Authorization callback URL** to `<your-app-url>/api/auth/callback/github`.
3. Copy the Client ID and generate a Client Secret.

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID (Web application type).
3. Add `<your-app-url>/api/auth/callback/google` to Authorized redirect URIs.
4. Copy the Client ID and Client Secret.
