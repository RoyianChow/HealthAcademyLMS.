# Health Academy LMS

> A full-featured Learning Management System (LMS) for health and nutrition courses.
>
> Original WordPress Website: [https://healthacademy.ca/](https://healthacademy.ca/)

---

## Table of Contents

1. [Documentation](#documentation)
2. [Project Overview](#project-overview)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [Development Requirements](#development-requirements)
   - [Prerequisites](#prerequisites)
   - [Quick Start](#quick-start)
   - [Setting Up Stripe for Local Development](#setting-up-stripe-for-local-development)
   - [Granting Admin Access](#granting-admin-access)
6. [Instructions for Use](#instructions-for-use)
7. [GitHub Workflow](#github-workflow)
8. [Coding Standards and Guidelines](#coding-standards-and-guidelines)
9. [Licenses](#licenses)

---

## Documentation

- **Getting Started:** See [GETTING_STARTED.md](./GETTING_STARTED.md) for architecture overview, design patterns, and route map.
- **API Reference:** See [documentation/API_REFERENCE.md](./documentation/API_REFERENCE.md) for all API route handlers and server actions.
- **Services & Integrations:** See [documentation/SERVICES.md](./documentation/SERVICES.md) for file storage, payments, auth, security, email, and the AI Advisor.
- **Testing & CI:** See [documentation/TESTING_AND_CI.md](./documentation/TESTING_AND_CI.md) for the full testing framework — unit, integration, and E2E tests; setup; coverage; bugs found; and CI pipeline.
- **Database Schema & ERDs:** See [documentation/DATABASE_ERD.md](./documentation/DATABASE_ERD.md) for full entity relationship diagrams and field reference.
- **WordPress Migration Agent:** See [documentation/WP_MIGRATION_AGENT.md](./documentation/WP_MIGRATION_AGENT.md) for migrating course content from the WordPress/LearnDash site into this LMS.

---

## Project Overview

Health Academy LMS is a web platform that lets administrators create and manage structured health/nutrition courses (with video lessons, rich-text content, downloadable documents, and quizzes), and lets learners purchase, enroll in, and complete those courses. It includes a course-community forum per course and an AI-powered nutrition advisor that answers questions grounded in the learner's enrolled course content.

---

## Key Features

- **Course catalog** — public browsing of courses with descriptions, level, duration, and pricing.
- **Stripe-gated enrollment** — users pay via Stripe checkout; enrollment is activated on payment confirmation via webhook.
- **Structured course content** — courses are divided into chapters, which contain lessons. Each lesson supports multiple videos (uploaded or YouTube), downloadable documents, rich-text body content, and an optional interactive script.
- **Progress tracking** — per-lesson and per-course completion tracked in the database.
- **Quizzes** — admins create quizzes attached to chapters; learners attempt them, scores are stored.
- **Community forum** — per-course discussion board with posts, comments, and likes. Admin moderation with user-ban support.
- **AI Advisor** — course-grounded nutrition chatbot (OpenAI / OpenRouter backend) that answers questions using the user's enrolled course content and any PDFs they upload.
- **Admin dashboard** — course CRUD, lesson editor (TipTap rich-text), quiz builder, enrollment stats, community moderation.
- **Authentication** — GitHub OAuth, Google OAuth, and Email OTP (magic code), all via better-auth.
- **Security** — Arcjet bot protection, rate limiting, and shield rules on all routes.

---

## Tech Stack


| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Framework        | Next.js 16 (App Router), React 19, TypeScript |
| Styling          | Tailwind CSS v4, Radix UI (shadcn/ui)         |
| Database         | PostgreSQL (Neon) via Prisma ORM              |
| Authentication   | better-auth (GitHub, Google, Email OTP)       |
| File Storage     | AWS S3 / Tigris                               |
| Payments         | Stripe                                        |
| Email            | Resend                                        |
| Security         | Arcjet                                        |
| AI Chatbot       | OpenAI or OpenRouter (`gpt-4o-mini` default)  |
| Rich-text editor | TipTap                                        |
| Testing          | Vitest (unit + integration), Playwright (E2E) |
| CI               | GitHub Actions                                |


---

## Development Requirements

See [GETTING_STARTED.md](./GETTING_STARTED.md) for architecture overview, design patterns, and route map.

### Prerequisites

- Node.js v20+
- npm
- A PostgreSQL database (Neon recommended)
- A Stripe account
- An AWS S3 / Tigris account
- A GitHub OAuth App and/or Google OAuth credentials
- A Resend account (for email OTP)
- An Arcjet account

### Quick Start

1. **Clone the repository:**

```bash
git clone https://github.com/RoyianChow/HealthAcademyLMS..git
cd HealthAcademyLMS.
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Copy the example below into a `.env` file at the project root and fill in your values:

```ini
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# better-auth
BETTER_AUTH_SECRET=generate-a-random-secret-here
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend (contact form emails)
RESEND_API_KEY=

# Arcjet (security)
ARCJET_KEY=

# AWS / Tigris (file storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_ENDPOINT_URL_S3=
AWS_ENDPOINT_URL_IAM=
AWS_REGION=auto
S3_BUCKET_NAME=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Public S3 (for Next.js Image component)
NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES=
NEXT_PUBLIC_S3_PUBLIC_URL=

# AI Advisor (optional — falls back to rule-based replies if unset)
# CHAT_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

4. **Run database migrations:**

```bash
npx prisma migrate dev
```

5. **Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Setting Up Stripe for Local Development

Enrolled courses will not appear under a user's dashboard until the Stripe webhook fires. In local development, run both commands in separate terminals simultaneously:

```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Obtain your `STRIPE_WEBHOOK_SECRET` from the output of the `stripe listen` command and set it in `.env`.

> **Note:** Enrollment amounts are stored in cents (Stripe standard). An amount of `2999` = $29.99.

### Granting Admin Access

Admin access is controlled by the `role` field on the `User` model. Set it to `"admin"` directly in the database or via the better-auth admin plugin:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Instructions for Use

### Accessing the Application as an Admin

1. Sign in at `/login` (GitHub, Google, or Email OTP).
2. Your account must have `role = "admin"` set in the database (see [Granting Admin Access](#granting-admin-access)).
3. Click **Dashboard** in the top navigation bar.
4. Click **Admin Dashboard** in the left sidebar to enter the admin panel.
5. From here you can:
  - View and create courses via **View All Courses**.
  - Click the lighthouse icon on a course card to view it, and use **Enroll** to self-enroll without payment.
  - Create and manage quizzes via the Quizzes section.
  - Moderate the community forum.

### Accessing the Application as a Regular User

1. Sign in at `/login`.
2. Browse courses on the public **Courses** page.
3. Click **Learn More** on a course, then **Enroll Now** to initiate Stripe checkout.
4. Complete the Stripe payment. You will be redirected back to the dashboard.
5. Under **Enrolled Courses**, click **Continue** to start learning.
6. Use the **AI Advisor** (sidebar link under Dashboard) to ask nutrition questions grounded in your courses.

---

## GitHub Workflow

- Development happens on feature branches.
- Pull requests are reviewed and merged into the main integration branch.
- The GitHub Actions CI pipeline runs lint, type-checking, unit tests, integration tests, and Playwright E2E tests automatically on every push and pull request to `main`. See [documentation/TESTING_AND_CI.md](./documentation/TESTING_AND_CI.md) for the full pipeline details.

---

## Coding Standards and Guidelines

- **Branching:** All work happens on feature branches. Direct commits to `main` are prohibited.
- **Code reviews:** All pull requests require at least one peer review before merging.
- **Server vs. client:** Data loaders in `app/data/` and server actions in `app/actions/` are server-only. Client components use the `'use client'` directive.
- **Environment variables:** All environment variables are validated at startup via `lib/env.ts` (t3-env + Zod). Never access `process.env` directly outside of `lib/env.ts`.
- **Type safety:** TypeScript strict mode is enabled. Avoid `any`.

---

## Licenses

This project is **private**. All code is proprietary and should not be shared outside the scope of this project.
