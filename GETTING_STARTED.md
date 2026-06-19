# Getting Started

This document contains quick references for contributors to the Health Academy LMS platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Model](#2-data-model)
3. [Core Design Patterns](#3-core-design-patterns)
4. [Route Map](#4-route-map)

---

## Documentation Hyperlinks

| Document | Contents |
|----------|----------|
| [documentation/API_REFERENCE.md](./documentation/API_REFERENCE.md) | API route handlers, server actions |
| [documentation/SERVICES.md](./documentation/SERVICES.md) | File storage (Tigris/S3), payments (Stripe), security (Arcjet), email (Resend), AI Advisor, authentication |
| [documentation/TESTING_AND_CI.md](./documentation/TESTING_AND_CI.md) | Full testing framework — unit tests (Vitest), integration tests (Vitest), E2E tests (Playwright), test database setup, coverage, bugs found, CI pipeline, environment variables reference |
| [documentation/DATABASE_ERD.md](./documentation/DATABASE_ERD.md) | Full ERD, field reference tables, enum definitions, index documentation |
| [documentation/WP_MIGRATION_AGENT.md](./documentation/WP_MIGRATION_AGENT.md) | WordPress/LearnDash → Next.js migration agent — setup, operation, architecture, post-migration checklist |
| [documentation/deployment.md](./documentation/deployment.md) | End-to-end deployment guide — Neon, Tigris, OAuth, Stripe, Arcjet, Resend, Vercel, custom domain |

---

## 1. Architecture Overview

Health Academy LMS is a monolithic Next.js 16 (App Router) application. There is no separate backend service — all server-side logic (database queries, file handling, payments, auth) runs as Next.js Route Handlers, Server Actions, or React Server Components.

```
HealthAcademyLMS/
│
├── app/                        # Next.js App Router (pages + API routes)
│   ├── (auth)/                 # Route group: login, OTP verify (no shared nav)
│   ├── (public)/               # Route group: landing, course catalog, about, contact
│   ├── admin/                  # Admin panel (role-gated: role = "admin")
│   ├── dashboard/              # Learner portal (auth-gated)
│   ├── chatbot/                # AI Advisor page (auth-gated)
│   ├── quizzes/                # Quiz taking interface (auth-gated)
│   ├── profile/                # User profile (auth-gated)
│   ├── payment/                # Stripe redirect landing pages
│   ├── api/                    # API Route Handlers
│   ├── actions/                # Server Actions (community, quizzes)
│   └── data/                   # Server-only data loaders (Prisma queries)
│
├── components/                 # Shared React components
│   ├── chat/                   # AI Advisor UI
│   ├── community/              # Forum components
│   ├── file-uploader/          # Drag-and-drop uploader
│   ├── rich-text-editor/       # TipTap editor
│   ├── sidebar/                # App sidebar / nav
│   └── ui/                     # Radix/shadcn primitives
│
├── lib/                        # Shared server/client utilities
│   ├── auth.ts                 # better-auth server instance
│   ├── auth-client.ts          # better-auth client instance
│   ├── db.ts                   # Prisma client singleton
│   ├── env.ts                  # Validated env vars (t3-env + Zod)
│   ├── stripe.ts               # Stripe client (server-only)
│   ├── S3Client.ts             # AWS S3 client for Tigris (server-only)
│   ├── arcjet.ts               # Arcjet instance (server-only)
│   ├── resend.ts               # Resend client
│   ├── chat/                   # AI Advisor subsystem
│   ├── utils.ts                # General utilities (cn, etc.)
│   ├── zodSchemas.ts           # Shared Zod validation schemas
│   └── types.ts                # Shared TypeScript types
│
├── hooks/                      # Custom React hooks (client-side)
├── prisma/                     # Schema + migrations
├── tests/                      # All automated tests
│   ├── unit/                   # Vitest unit tests (logic, RBAC, schemas)
│   ├── integration/            # Vitest integration tests (actions, handlers)
│   └── e2e/                    # Playwright E2E + accessibility tests
├── playwright.config.ts        # Playwright configuration
└── docker-compose.test.yml     # Postgres 16 test database
```

**Key architectural decisions:**

- **Server Components by default.** All pages are React Server Components unless `'use client'` is declared. Data is fetched directly in the component tree on the server.
- **Data loaders in `app/data/`.** Prisma queries are isolated in `app/data/**/*.ts` files — pure async functions, server-only, no React. This makes them trivially testable with Vitest and easy to mock.
- **Server Actions in `app/actions/`.** Mutations (create post, delete comment, etc.) use Next.js Server Actions, also isolated and testable.
- **Environment validation at startup.** `lib/env.ts` uses `@t3-oss/env-nextjs` with Zod schemas. If a required env var is missing, the server refuses to start.
- **No `process.env` outside `lib/env.ts`.** All code imports the `env` object from `lib/env.ts`.

---

## 2. Data Model

The database is **PostgreSQL** (hosted on Neon), accessed via **Prisma ORM**. The canonical schema lives at `prisma/schema.prisma`.

The project has **18 models** across 6 domains: Auth & Users, Course Content, Enrollment & Progress, Quizzes, Community Forum, and AI Advisor Chat.

> **Full ERD, field reference tables, enum definitions, and index documentation:** [documentation/DATABASE_ERD.md](./documentation/DATABASE_ERD.md)

---

## 3. Core Design Patterns

### Server Component Data Fetching

Pages are async server components that call data loaders directly:

```typescript
// app/dashboard/page.tsx (example pattern)
import { requireUser } from "@/app/data/user/require-user";
import { getEnrolledCourses } from "@/app/data/user/get-enrolled-courses";

export default async function DashboardPage() {
  const user = await requireUser();           // auth gate
  const courses = await getEnrolledCourses(user.id);  // data loader
  return <CourseList courses={courses} />;
}
```

### Data Loaders (`app/data/`)

Pure async functions that run Prisma queries. They are server-only (`import "server-only"` where needed) and have no React or HTTP dependencies:

```
app/data/
├── admin/          # Admin-only queries (require-admin guard included)
├── community/      # Community page data
├── course/         # Course / lesson / progress data
├── dashboard/      # Dashboard-specific aggregations
├── profile/        # User profile data
├── quiz/           # Quiz attempt, access, and listing
└── user/           # Session helpers (require-user, get-enrolled-courses)
```

### Server Actions (`app/actions/`)

Mutations use Next.js Server Actions. Each action validates the session, runs the mutation, and calls `revalidatePath` to refresh the affected page:

```typescript
// Pattern from app/actions/community/create-post.ts
"use server";

export async function createPost(data: CreatePostInput) {
  const user = await requireUser();
  // ... validate, write to DB ...
  revalidatePath(`/dashboard/${slug}/community`);
}
```

Inline server actions also appear in page files for mutations tightly coupled to a single page (e.g. lesson progress, enrollment).

### Route Groups

Next.js route groups (directories wrapped in parentheses) are used to share layouts without affecting the URL:

| Route group | Purpose |
|-------------|---------|
| `(auth)` | Login and OTP pages with a minimal full-screen layout |
| `(public)` | Marketing pages with the public navbar and footer |

### Component Co-location

Page-specific components live in `_components/` folders adjacent to the page file:

```
app/admin/courses/[courseId]/edit/
├── page.tsx
└── _components/
    ├── CourseStructure.tsx
    ├── EditCourseForm.tsx
    └── ...
```

Shared components used across multiple pages live in the top-level `components/` directory.

### Environment Variable Validation

All environment variables are declared and validated in `lib/env.ts` using `@t3-oss/env-nextjs` and Zod. If any required variable is missing, the Next.js build and dev server will throw at startup with a clear error message:

```typescript
import { env } from "@/lib/env";

// Use validated env vars — never process.env directly
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
```

---

## 4. Route Map

### Public Routes (no auth required)

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/courses` | Public course catalog |
| `/courses/[slug]` | Course details and enrollment button |
| `/about` | About page |
| `/contact` | Contact form |
| `/corporate-wellness` | Corporate wellness landing page |
| `/legal` | Legal / terms page |
| `/login` | Sign-in page (GitHub, Google, Email OTP) |
| `/verify-request` | OTP code entry page |

### Authenticated Learner Routes

| URL | Description |
|-----|-------------|
| `/dashboard` | Enrolled courses and progress overview |
| `/dashboard/[slug]` | Course overview with chapter/lesson sidebar |
| `/dashboard/[slug]/[lessonId]` | Lesson content viewer |
| `/dashboard/[slug]/community` | Per-course community forum |
| `/dashboard/community` | Global community (all courses) |
| `/chatbot` | AI Advisor |
| `/quizzes` | List of quizzes for enrolled courses |
| `/quizzes/[quizId]` | Quiz attempt interface |
| `/profile` | User profile and quiz attempt history |
| `/payment/success` | Post-Stripe-checkout success page |
| `/payment/cancel` | Post-Stripe-checkout cancellation page |

### Admin Routes (role = "admin" required)

| URL | Description |
|-----|-------------|
| `/admin` | Admin dashboard (enrollment stats, recent courses) |
| `/admin/courses` | All courses list |
| `/admin/courses/create` | Create a new course |
| `/admin/courses/[courseId]/edit` | Edit course details and structure (DnD chapter/lesson ordering) |
| `/admin/courses/[courseId]/[chapterId]/[lessonId]` | Edit lesson content (TipTap, video upload, documents) |
| `/admin/courses/[courseId]/delete` | Delete course confirmation |
| `/admin/quizzes` | All quizzes and attempt management |
| `/admin/quizzes/create` | Create a new quiz |
| `/admin/quizzes/[quizId]/edit` | Edit quiz questions and options |
| `/admin/community` | Community moderation (ban users, delete posts) |
| `/not-admin` | Redirect target for non-admin users who attempt admin routes |

---

## 5. End-to-End (Playwright) Tests

E2E tests live in `tests/e2e/` and use [Playwright](https://playwright.dev/) with a real Postgres test database and production Next.js server (`next build` + `next start`).

### Prerequisites

1. Start the test database: `npm run test:db:setup`
2. Copy the example env file: `cp .env.test.example .env.test`
3. Install Chromium (once): `npx playwright install chromium`

### Environment (`.env.test`)

`.env.test` is gitignored. Use `.env.test.example` as the template. Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Test Postgres (`postgresql://test:test@localhost:5433/healthacademy_test`) |
| `BETTER_AUTH_SECRET` | Auth signing secret (min 32 chars) |
| `BETTER_AUTH_URL` | App URL (`http://localhost:3000`) |
| `STRIPE_WEBHOOK_SECRET` | Signs simulated checkout webhooks in enrollment E2E |
| `ARCJET_KEY`, `RESEND_API_KEY`, OAuth keys, S3 vars | Required by `lib/env.ts` at build/runtime |
| `NEXT_PUBLIC_S3_*` | Client-side S3 URLs for image components |

Load locally before running:

```bash
set -a && source .env.test && set +a
npm run build
npm run test:e2e
```

### Commands

| Command | Runs |
|---------|------|
| `npm run test:e2e` | Full Playwright suite (journeys + a11y) |
| `npm run test:e2e:ui` | Playwright UI mode |

`global-setup` resets/seeds the DB and writes auth cookies to `tests/e2e/.auth/` (gitignored).

### What E2E covers

- **Journeys:** enrollment webhook activation, quiz completion, lesson progress
- **Accessibility:** WCAG 2.0/2.1 AA scans on key pages via `@axe-core/playwright`
