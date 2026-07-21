# Services and Integrations

> Part of the [Getting Started](../GETTING_STARTED.md)

---

## Table of Contents

1. [File Storage (Tigris / S3)](#1-file-storage-tigris--s3)
2. [Payments (Stripe)](#2-payments-stripe)
3. [Authentication and Authorization](#3-authentication-and-authorization)
4. [Security (Arcjet)](#4-security-arcjet)
5. [Email (Resend)](#5-email-resend)
6. [AI Advisor Subsystem](#6-ai-advisor-subsystem)

---

## 1. File Storage (Tigris / S3)

All user-uploaded files (course thumbnails, lesson videos, lesson documents, community post images) are stored in [Tigris](https://www.tigrisdata.com/), an S3-compatible object storage service.

### S3 Client

The client is initialized in `lib/S3Client.ts`:

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const S3 = new S3Client({
  region: "auto",
  endpoint: env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: false,
});
```

### Upload Flow

Files are uploaded directly from the browser using presigned URLs:

1. Client calls `POST /api/s3/upload` with `{ filename, contentType, size }`.
2. The server generates and returns a presigned PUT URL (short TTL).
3. The client PUTs the file directly to S3 using the presigned URL — no file bytes pass through the Next.js server.
4. The client stores the returned `fileKey` (S3 object key) in the database via a Server Action.

### Image Display

Public image URLs are served from Tigris. The bucket hostname is configured in `next.config.ts` so Next.js `<Image>` can optimize and serve them:

```
https://health-academy-lms.fly.storage.tigris.dev
https://health-academy-lms.t3.tigrisfiles.io
```

`NEXT_PUBLIC_S3_PUBLIC_URL` holds the base URL. Use `hooks/use-construct-url.ts` to build full image URLs from a file key.

### Deletion

Files are deleted via `POST /api/s3/delete` with `{ key }`. This is called alongside database record deletion to keep storage in sync.

---

## 2. Payments (Stripe)

Course purchases use [Stripe Checkout](https://stripe.com/docs/payments/checkout).

### Purchase Flow

1. User clicks **Enroll Now** on a course detail page.
2. A Server Action creates a `Pending` `Enrollment` record in the database.
3. The action creates a Stripe Checkout session with the course's `stripePriceId`, attaches `courseId` and `enrollmentId` as metadata, and redirects the user to Stripe.
4. On successful payment, Stripe fires a `checkout.session.completed` webhook to `POST /api/webhook/stripe`.
5. The webhook handler validates the Stripe signature, finds the user by `stripeCustomerId`, and updates the `Enrollment` status to `Active`.
6. The user is redirected to `/payment/success`.

### Stripe Webhook (Local Dev)

In local development, Stripe webhooks cannot reach `localhost`. Use the Stripe CLI to forward them:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

The CLI will print your local `STRIPE_WEBHOOK_SECRET` — set this in `.env`.

### Course Pricing

- `Course.price` — stored in cents (e.g. `2999` for $29.99).
- `Course.stripePriceId` — the Stripe Price ID. This must be created in the Stripe dashboard and added to the course record.

### Admin Self-Enrollment

Admins can enroll in courses for free via the **Enroll** button in the admin course view (`app/admin/courses/_components/AdminSelfEnrollButton.tsx`). This bypasses Stripe entirely and creates an `Active` enrollment directly.

---

## 3. Authentication and Authorization

Authentication is handled by [better-auth](https://www.better-auth.com/). The server instance is in `lib/auth.ts`; the client helper is in `lib/auth-client.ts`.

**Supported sign-in methods:**
- GitHub OAuth
- Google OAuth
- Email OTP (magic code via Resend)

**better-auth plugins enabled:**
- `emailOTP` — sends a 6-digit OTP via Resend on sign-in.
- `admin` — adds `role`, `banned`, `banReason`, `banExpires` to the `User` model and enforces site-wide bans on new sessions.

### Auth API Route

better-auth registers all its own endpoints under `/api/auth/[...all]` via `app/api/auth/[...all]/route.ts`.

### Session Resolution

Server-side session access pattern (used in data loaders and server actions):

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({
  headers: await headers(),
});
```

### Authorization Helpers

Two cached server-only helpers are used throughout the application:

**`app/data/user/require-user.ts`** — returns the session user or redirects to `/login`.

```typescript
export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/login");
  return session.user;
});
```

**`app/data/admin/require-admin.ts`** — checks for `role === "admin"`, redirects to `/not-admin` if not.

```typescript
export const requireAdmin = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/login");
  if (session.user.role !== "admin") return redirect("/not-admin");
  return session;
});
```

Both functions are wrapped in React `cache()` so the session is only fetched once per request even when called from multiple components in the same render.

### Middleware

`middleware.ts` runs on every request (excluding static files and the auth API):

- Applies Arcjet bot detection globally.
- Redirects unauthenticated users to `/login` for all `/admin/*` routes.

```typescript
// Route protection is currently applied to /admin/* only.
// Dashboard, chatbot, and profile routes redirect via requireUser() inside the component tree.
```

> **Note:** The middleware currently only hard-redirects `/admin/*`. Other protected routes (`/dashboard`, `/chatbot`, `/quizzes`, `/profile`) use `requireUser()` inside their page/layout components instead.

---

## 4. Security (Arcjet)

[Arcjet](https://arcjet.com/) provides request-level security. The instance is in `lib/arcjet.ts` and the middleware integration is in `middleware.ts`.

**Rules configured:**

- **`shield`** (LIVE mode) — blocks common attack patterns (SQLi, XSS, etc.) on all routes.
- **`detectBot`** (LIVE mode, in middleware) — blocks automated bots while allowing search engines, monitors, preview crawlers, and Stripe webhook delivery.

Additional Arcjet rules exported from `lib/arcjet.ts` for use in specific route handlers:
- `fixedWindow` / `slidingWindow` — rate limiting
- `protectSignup` — signup form abuse prevention
- `sensitiveInfo` — detects PII in request bodies

---

## 5. Email (Resend)

[Resend](https://resend.com/) is used to deliver contact form submissions.

The Resend client is initialized in `lib/resend.ts` and called from
`app/(public)/contact/actions/send-contact-email.ts`.

> **Note:** Authentication is Google-only — there is no email/OTP sign-in, so
> Resend is not on the login path. The `from` address `onboarding@resend.dev`
> is a Resend sandbox sender that only delivers to the Resend account owner's
> email; for production, verify a custom sending domain in the Resend dashboard
> and update the `from` address in the contact email action.

---

## 6. AI Advisor Subsystem

The AI Advisor is a course-grounded nutrition chatbot.

### Architecture

```
FloatingChat (client component)
    │
    ├─ POST /api/chat            → app/api/chat/route.ts
    ├─ GET  /api/chat/history    → app/api/chat/history/route.ts
    └─ GET/POST /api/chat/conversations → app/api/chat/conversations/route.ts
               │
               ├─ requireUser()               (session gate)
               ├─ resolveChatUserContext()    → lib/chat/user-context.ts
               ├─ getAccessibleCoursesForUser() → lib/chat/course-context.ts
               ├─ findRelevantCourseExcerpts() (keyword scorer)
               ├─ buildChatMessages()         → lib/chat/prompt.ts
               ├─ generateNutritionReply()    → lib/chat/openai.ts → LLM
               └─ appendConversationTurn()    → lib/chat/store.ts → Prisma
```

### Key Files

| File | Role |
|------|------|
| `app/chatbot/page.tsx` | Page entry (auth-gated, server-loads bootstrap data) |
| `components/chat/floating-chat.tsx` | Full chat UI (~1,000 lines) |
| `app/api/chat/route.ts` | Main message POST handler |
| `lib/chat/config.ts` | Resolves provider / API key / model from env |
| `lib/chat/openai.ts` | LLM client (OpenAI or OpenRouter, with rule-based fallback) |
| `lib/chat/prompt.ts` | System prompt builder |
| `lib/chat/user-context.ts` | Builds user context from Prisma |
| `lib/chat/course-context.ts` | Loads enrolled courses and keyword-scores excerpts |
| `lib/chat/store.ts` | Postgres-backed conversation persistence |
| `lib/chat/safety.ts` | Pre/post safety processing |
| `lib/chat/pdf.ts` | Server-side PDF text extraction |
| `lib/chat/types.ts` | TypeScript types for the chat subsystem |

### Provider Configuration

The chat provider is selected via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_PROVIDER` | `openai` | `"openai"` or `"openrouter"` |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model slug |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | OpenRouter model slug |

If neither API key is configured, the advisor uses a rule-based fallback (`buildFallbackReply` in `lib/chat/openai.ts`) — useful for local development without incurring API costs.

### Chat Modes and Response Styles

| Mode | Behaviour |
|------|-----------|
| `coach` (default) | Practical next steps, encouragement |
| `study` | Teaching tone, concept recall |
| `quick` | Shortest useful answer first |
| `pdf` | Prioritizes uploaded PDF content |

Response styles: `concise` · `balanced` · `detailed`
