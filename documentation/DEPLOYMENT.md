# Deployment Guide

End-to-end guide for setting up the Health Academy LMS from a fresh clone through production deployment on Vercel.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Install](#2-clone-and-install)
3. [Database — Neon (PostgreSQL)](#3-database--neon-postgresql)
4. [File Storage — Tigris (S3)](#4-file-storage--tigris-s3)
5. [Authentication — Better Auth](#5-authentication--better-auth)
6. [GitHub OAuth](#6-github-oauth)
7. [Google OAuth](#7-google-oauth)
8. [Payments — Stripe](#8-payments--stripe)
9. [Security — Arcjet](#9-security--arcjet)
10. [Email — Resend](#10-email--resend)
11. [AI Advisor — OpenAI / OpenRouter (Optional)](#11-ai-advisor--openai--openrouter-optional)
12. [Complete `.env` File Reference](#12-complete-env-file-reference)
13. [Running Locally](#13-running-locally)
14. [Database Migrations](#14-database-migrations)
15. [Deploy to Vercel](#15-deploy-to-vercel)
16. [Custom Domain](#16-custom-domain)
17. [WordPress Content Migration (Optional)](#17-wordpress-content-migration-optional)
18. [Post-Deployment Checklist](#18-post-deployment-checklist)

---

## 1. Prerequisites

| Tool | Minimum version | Install |
|------|-----------------|---------|
| Node.js | 18.x | [nodejs.org](https://nodejs.org/) |
| npm | 9.x (bundled with Node) | — |
| Git | Any recent | [git-scm.com](https://git-scm.com/) |

You also need free (or paid) accounts on:

- [Neon](https://neon.tech/) — Postgres database
- [Tigris](https://www.tigrisdata.com/) — S3-compatible object storage
- [GitHub](https://github.com/) — OAuth provider + code host
- [Google Cloud Console](https://console.cloud.google.com/) — OAuth provider
- [Stripe](https://stripe.com/) — payments
- [Arcjet](https://arcjet.com/) — security
- [Resend](https://resend.com/) — transactional email
- [Vercel](https://vercel.com/) — hosting and CI/CD

---

## 2. Clone and Install

```bash
git clone https://github.com/your-org/HealthAcademyLMS.git
cd HealthAcademyLMS
npm install
```

`npm install` automatically runs `prisma generate` via the `postinstall` script, which generates the Prisma client from `prisma/schema.prisma`. No database connection is needed for this step.

---

## 3. Database — Neon (PostgreSQL)

Neon is a serverless Postgres platform that provides a **pooled connection URL** (via PgBouncer) for the app and a **direct URL** for Prisma migrations.

### Step-by-step

1. Go to [neon.tech](https://neon.tech/) and sign up or log in.
2. Click **New Project**. Choose a region close to your Vercel deployment region (e.g. `us-east-1`).
3. Give the project a name (e.g. `health-academy-lms`) and click **Create Project**.
4. On the project dashboard, open the **Connection Details** panel.
5. Select the **Pooled connection** tab — copy this as `DATABASE_URL`.
6. Select the **Direct connection** tab — copy this as `DIRECT_URL`.

The two values look like:

```
# Pooled (used by the running app — add ?pgbouncer=true&connection_limit=1 if shown)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Direct (used by Prisma migrate and prisma db push — no PgBouncer)
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> Neon's free tier includes one project with 0.5 GB storage and 190 compute hours per month — sufficient for development and small production workloads.

### Environment variables

```env
DATABASE_URL=postgresql://...          # pooled connection
DIRECT_URL=postgresql://...            # direct connection (no pooler)
```

`DIRECT_URL` is consumed by `prisma/schema.prisma` via `directUrl = env("DIRECT_URL")` and by `lib/env.ts` through the `DIRECT_DATABASE_URL` alias.

---

## 4. File Storage — Tigris (S3)

Tigris is S3-compatible object storage used for course thumbnails, lesson videos, lesson PDFs, community post images, and any media uploaded by the WordPress migration.

### Step-by-step

1. Go to [tigrisdata.com](https://www.tigrisdata.com/) and sign up.
2. From the dashboard, click **Create Bucket**.
3. Name the bucket (e.g. `health-academy-lms`) and choose a region. Take note of the bucket name.
4. After creation, open the bucket and go to **Settings → Access**.
5. Set the bucket access to **Public** if you want uploaded files (course thumbnails, images) to be publicly accessible without signed URLs. This is recommended for a public-facing LMS.
6. Go to **Access Keys** (in the left sidebar or account settings) and click **Create Access Key**.
7. Copy the **Access Key ID** and **Secret Access Key** — these are only shown once.
8. Note your **endpoint URLs**. Tigris provides two:
   - `https://<bucket>.fly.storage.tigris.dev` — S3 API endpoint (for SDK uploads)
   - `https://<bucket>.t3.tigrisfiles.io` — Public CDN URL (for browser image display)

### Environment variables

```env
AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=auto
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_ENDPOINT_URL_IAM=https://fly.iam.storage.tigris.dev
S3_BUCKET_NAME=your-bucket-name

# Client-side variables (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES=your-bucket-name
NEXT_PUBLIC_S3_PUBLIC_URL=https://your-bucket-name.t3.tigrisfiles.io
```

> **`AWS_ENDPOINT_URL_S3`** is the base Tigris endpoint (not bucket-specific). The SDK appends the bucket name automatically.
>
> **`NEXT_PUBLIC_S3_PUBLIC_URL`** must be the `.t3.tigrisfiles.io` CDN hostname, not the `.fly.storage.tigris.dev` API hostname. Browser image requests go to the CDN.

### Update `next.config.ts`

Add your Tigris bucket hostnames to the `images.remotePatterns` array so Next.js `<Image>` can optimize them:

```typescript
// next.config.ts
remotePatterns: [
  {
    protocol: "https",
    hostname: "your-bucket-name.fly.storage.tigris.dev",
  },
  {
    protocol: "https",
    hostname: "your-bucket-name.t3.tigrisfiles.io",
  },
],
```

---

## 5. Authentication — Better Auth

[Better Auth](https://www.better-auth.com/) handles sessions, OAuth, and email OTP. It needs a secret key and the canonical base URL of your application.

### Generate a secret

```bash
openssl rand -base64 32
```

Copy the output — this is your `BETTER_AUTH_SECRET`.

### Environment variables

```env
BETTER_AUTH_SECRET=your-32-character-or-longer-random-string
BETTER_AUTH_URL=https://your-production-domain.com
```

In local development, set `BETTER_AUTH_URL=http://localhost:3000`.

> `BETTER_AUTH_SECRET` must be at least 32 characters. The same secret must be set in both local `.env` and Vercel environment variables — changing it invalidates all active sessions.

---

## 6. GitHub OAuth

GitHub OAuth is used as a social sign-in provider.

### Step-by-step

1. Go to [github.com/settings/developers](https://github.com/settings/developers) and click **New OAuth App**.
2. Fill in:
   - **Application name:** Health Academy LMS
   - **Homepage URL:** `https://your-production-domain.com`
   - **Authorization callback URL:** `https://your-production-domain.com/api/auth/callback/github`
3. Click **Register application**.
4. On the app page, copy the **Client ID**.
5. Click **Generate a new client secret** and copy the value.

For local development, create a **separate** GitHub OAuth app with callback URL `http://localhost:3000/api/auth/callback/github`.

### Environment variables

```env
AUTH_GITHUB_CLIENT_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
```

---

## 7. Google OAuth

Google OAuth is used as a social sign-in provider.

### Step-by-step

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a new project (or select an existing one).
2. Navigate to **APIs & Services → Credentials**.
3. Click **Create Credentials → OAuth client ID**.
4. If prompted, configure the **OAuth consent screen** first:
   - User type: **External**
   - App name: Health Academy LMS
   - Add your domain to **Authorized domains**
   - Add scopes: `email`, `profile`, `openid`
5. Back in **Create OAuth client ID**, choose **Web application**.
6. Under **Authorized redirect URIs**, add:
   - `https://your-production-domain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
7. Click **Create** and copy the **Client ID** and **Client Secret**.

### Environment variables

```env
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 8. Payments — Stripe

Stripe Checkout handles course purchases. You need a secret API key, a webhook signing secret, and a Stripe Price ID for each course.

### Step-by-step

1. Sign up at [stripe.com](https://stripe.com/) and complete identity verification for live payments.
2. From the **Developers → API Keys** page, copy your **Secret key** (`sk_live_...` for production, `sk_test_...` for testing).

#### Webhook secret

3. Go to **Developers → Webhooks → Add endpoint**.
4. Set the endpoint URL to `https://your-production-domain.com/api/webhook/stripe`.
5. Under **Events to listen to**, select `checkout.session.completed`.
6. Click **Add endpoint**, then reveal and copy the **Signing secret** (`whsec_...`).

#### Local development webhook forwarding

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

The CLI prints a local `whsec_...` secret — use this as `STRIPE_WEBHOOK_SECRET` in your local `.env`.

#### Creating course prices

For each course, create a **Product** and **Price** in the Stripe dashboard:

1. Go to **Product catalog → Add product**.
2. Enter the course name and description.
3. Set a one-time price (e.g. $247.00).
4. Copy the **Price ID** (`price_...`) and set it as `Course.stripePriceId` in the database via the admin panel.

### Environment variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 9. Security — Arcjet

[Arcjet](https://arcjet.com/) provides bot detection and request shielding. It runs in middleware on every request.

### Step-by-step

1. Sign up at [arcjet.com](https://arcjet.com/).
2. Create a new **Site** for your application.
3. Copy the **API Key** from the site dashboard.

> In local development or CI, set `ARCJET_ENV=development` to put Arcjet in dry-run / non-blocking mode so bot detection does not interfere with tests.

### Environment variables

```env
ARCJET_KEY=ajkey_...
```

---

## 10. Email — Resend

[Resend](https://resend.com/) delivers Email OTP (magic sign-in codes) and contact form submissions.

### Step-by-step

1. Sign up at [resend.com](https://resend.com/).
2. Go to **API Keys** and click **Create API Key**. Copy the key (`re_...`).
3. **(Production only)** Add and verify a custom sending domain under **Domains**. Without a verified domain, email only delivers to the Resend account owner's address.
4. After verifying your domain, update the `from` address in `lib/auth.ts`:

```typescript
// lib/auth.ts — update from sandbox to your verified domain
from: "Health Academy <noreply@yourdomain.com>",
```

### Environment variables

```env
RESEND_API_KEY=re_...
```

---

## 11. AI Advisor — OpenAI / OpenRouter (Optional)

The AI Advisor chatbot uses OpenAI or OpenRouter to generate nutrition coaching replies grounded in enrolled course content. If neither API key is configured, the advisor falls back to rule-based responses — useful for local development without API costs.

### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and create a new key.
2. Set `CHAT_PROVIDER=openai` and supply `OPENAI_API_KEY`.

### OpenRouter

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys) and create a key.
2. Set `CHAT_PROVIDER=openrouter` and supply `OPENROUTER_API_KEY`.

### Environment variables

```env
# Choose one provider
CHAT_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini          # optional; defaults to gpt-4o-mini

# OpenRouter (alternative)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini  # optional
```

---

## 12. Complete `.env` File Reference

Create a `.env` file in the project root. All variables are validated at startup by `lib/env.ts` — the server refuses to start if any required variable is missing.

```env
# ─── Database (Neon) ──────────────────────────────────────────────────────────
# Pooled connection — used by the running app
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
# Direct connection — used by Prisma migrate (no PgBouncer)
DIRECT_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require

# ─── Authentication (Better Auth) ────────────────────────────────────────────
BETTER_AUTH_SECRET=your-32-character-or-longer-random-secret
BETTER_AUTH_URL=http://localhost:3000          # use https://yourdomain.com in production

# ─── GitHub OAuth ─────────────────────────────────────────────────────────────
AUTH_GITHUB_CLIENT_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# ─── Google OAuth ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ─── File Storage (Tigris / S3) ───────────────────────────────────────────────
AWS_ACCESS_KEY_ID=tid_xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=tsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=auto
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_ENDPOINT_URL_IAM=https://fly.iam.storage.tigris.dev
S3_BUCKET_NAME=your-bucket-name
NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES=your-bucket-name
NEXT_PUBLIC_S3_PUBLIC_URL=https://your-bucket-name.t3.tigrisfiles.io

# ─── Payments (Stripe) ────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Security (Arcjet) ────────────────────────────────────────────────────────
ARCJET_KEY=ajkey_...

# ─── Email (Resend) ───────────────────────────────────────────────────────────
RESEND_API_KEY=re_...

# ─── AI Advisor (optional) ───────────────────────────────────────────────────
# If neither key is set, the advisor uses rule-based fallback responses.
CHAT_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=openai/gpt-4o-mini
```

### Variable summary

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | Neon dashboard → Connection Details → Pooled |
| `DIRECT_URL` | Yes | Neon dashboard → Connection Details → Direct |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your app's base URL |
| `AUTH_GITHUB_CLIENT_ID` | Yes | GitHub → Settings → Developer Settings → OAuth Apps |
| `AUTH_GITHUB_SECRET` | Yes | Same OAuth app |
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Yes | Same credential |
| `AWS_ACCESS_KEY_ID` | Yes | Tigris dashboard → Access Keys |
| `AWS_SECRET_ACCESS_KEY` | Yes | Same access key (shown once) |
| `AWS_REGION` | Yes | `auto` for Tigris |
| `AWS_ENDPOINT_URL_S3` | Yes | `https://fly.storage.tigris.dev` |
| `AWS_ENDPOINT_URL_IAM` | Yes | `https://fly.iam.storage.tigris.dev` |
| `S3_BUCKET_NAME` | Yes | Your Tigris bucket name |
| `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES` | Yes | Same bucket name |
| `NEXT_PUBLIC_S3_PUBLIC_URL` | Yes | `https://<bucket>.t3.tigrisfiles.io` |
| `STRIPE_SECRET_KEY` | Yes | Stripe dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe dashboard → Webhooks → Signing secret |
| `ARCJET_KEY` | Yes | Arcjet dashboard → Site API Key |
| `RESEND_API_KEY` | Yes | Resend dashboard → API Keys |
| `CHAT_PROVIDER` | No | `openai` or `openrouter` (omit for rule-based fallback) |
| `OPENAI_API_KEY` | No | platform.openai.com/api-keys |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `OPENROUTER_API_KEY` | No | openrouter.ai/keys |
| `OPENROUTER_MODEL` | No | Defaults to `openai/gpt-4o-mini` |

---

## 13. Running Locally

Once your `.env` file is complete and the database is set up, run:

```bash
# Apply all pending migrations to the database
npx prisma migrate deploy

# Start the development server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Stripe webhooks (local)

In a separate terminal, forward Stripe events to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Use the printed `whsec_...` value as `STRIPE_WEBHOOK_SECRET` in your local `.env`.

---

## 14. Database Migrations

Prisma migrations live in `prisma/migrations/`. The migration workflow differs between development and production.

### Development — create and apply a new migration

```bash
# Modify prisma/schema.prisma, then:
npx prisma migrate dev --name describe_your_change
```

This creates a new timestamped migration file and applies it to your local database.

### Production / Vercel — apply migrations without creating new ones

```bash
npx prisma migrate deploy
```

This command only applies pending migrations from `prisma/migrations/` — it never creates new ones. Run it as part of your deployment pipeline or manually against the Neon database before launching.

### Useful Prisma commands

```bash
# Open Prisma Studio (GUI for your database)
npx prisma studio

# Push schema changes directly without a migration file (staging / prototyping only)
npx prisma db push

# Regenerate the Prisma client after schema changes
npx prisma generate

# Seed the database (if a seed script exists)
npx prisma db seed
```

---

## 15. Deploy to Vercel

### 15.1 Import the repository

1. Go to [vercel.com/new](https://vercel.com/new) and click **Import Git Repository**.
2. Connect your GitHub account if not already connected.
3. Find and select the `HealthAcademyLMS` repository. Click **Import**.
4. Vercel auto-detects Next.js — leave the **Framework Preset** as **Next.js**.
5. Leave the **Build Command** (`npm run build`) and **Output Directory** (`.next`) as defaults.

### 15.2 Add environment variables

Before clicking **Deploy**, expand the **Environment Variables** section and add every variable from your `.env` file.

> **Important:** Vercel separates variables by environment scope — **Production**, **Preview**, and **Development**. Set all required variables in **Production** at minimum. For preview branches (pull requests), set the same variables or use Vercel's environment variable inheritance.

Tips:
- Use Vercel's **bulk paste** feature: click the clipboard icon next to the variables field and paste the entire contents of your `.env` file.
- Set `BETTER_AUTH_URL` to your production domain (e.g. `https://healthacademy.ca`) — not `localhost`.
- Set `STRIPE_WEBHOOK_SECRET` to the signing secret from your **production** Stripe webhook endpoint (not the CLI local secret).

### 15.3 Run database migrations before first deploy

Run migrations against Neon before the first production deploy so Prisma does not encounter a missing-table error at runtime:

```bash
# Point at your production DATABASE_URL (Neon direct URL)
DATABASE_URL="your-direct-neon-url" DIRECT_URL="your-direct-neon-url" npx prisma migrate deploy
```

Or add `prisma migrate deploy` as a Vercel **Build Command** override:

```
npx prisma migrate deploy && next build
```

Set it in **Settings → General → Build & Development Settings → Build Command**.

### 15.4 Deploy

Click **Deploy**. Vercel builds the Next.js application, runs `prisma generate` (via the `postinstall` script), and publishes the result to a `*.vercel.app` URL.

### 15.5 Continuous deployment (CI/CD)

Once the repository is connected, Vercel automatically:

- Deploys the **`main` branch** to production on every push.
- Creates a **preview deployment** for every pull request, with its own unique URL.

The GitHub Actions workflow (`.github/workflows/test.yml`) runs lint, unit tests, integration tests, and E2E tests on every push to `main` and on every pull request. Vercel's deployment runs in parallel — if you want to block Vercel deploys on test failures, install the **Vercel GitHub integration** and configure branch protection rules to require the `Tests` check to pass before merging.

### 15.6 Add the Stripe production webhook

After your production URL is live:

1. Go to **Stripe → Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://your-production-domain.com/api/webhook/stripe`
3. Events: `checkout.session.completed`
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel's environment variables.
5. Trigger a **Redeploy** from the Vercel dashboard so the new secret takes effect.

---

## 16. Custom Domain

### 16.1 Add the domain in Vercel

1. In the Vercel project dashboard, go to **Settings → Domains**.
2. Click **Add Domain** and enter your domain (e.g. `healthacademy.ca`).
3. Vercel displays the DNS records you need to configure at your domain registrar.

### 16.2 Configure DNS at your registrar

Vercel supports two configurations depending on whether you are using an apex domain or a subdomain:

**Apex domain** (e.g. `healthacademy.ca`):

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `76.76.21.21` |

**Subdomain** (e.g. `www.healthacademy.ca`):

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `www` | `cname.vercel-dns.com` |

If you want both `healthacademy.ca` and `www.healthacademy.ca` to work, add both records and add both domains in Vercel. Set one as the **primary domain** (Vercel will redirect the other to it automatically).

### 16.3 Wait for propagation

DNS changes can take up to 48 hours to propagate globally, though they often resolve within minutes. Vercel will show a green checkmark on the domain once it detects the correct records and issues an SSL certificate automatically via Let's Encrypt.

### 16.4 Update environment variables after domain change

Once the custom domain is live, update these variables in Vercel and redeploy:

```env
BETTER_AUTH_URL=https://healthacademy.ca
```

Also update the OAuth callback URLs in:

- **GitHub:** Settings → Developer Settings → OAuth Apps → your app → Authorization callback URL → `https://healthacademy.ca/api/auth/callback/github`
- **Google Cloud Console:** Credentials → your OAuth client → Authorized redirect URIs → `https://healthacademy.ca/api/auth/callback/google`
- **Stripe webhook:** Update the endpoint URL to `https://healthacademy.ca/api/webhook/stripe`

---

## 17. WordPress Content Migration (Optional)

If you are migrating course content from a WordPress/LearnDash site, run the migration agent **after** the production database is live and all environment variables are in place. The agent runs locally against the production Neon database and Tigris bucket — it is never deployed to Vercel.

> Full documentation: [documentation/WP_MIGRATION_AGENT.md](./WP_MIGRATION_AGENT.md)

### 17.1 Prerequisites

- The production database is reachable (`DATABASE_URL` / `DIRECT_URL` point to Neon)
- Tigris credentials are configured and the bucket exists
- A WordPress admin account with JWT auth enabled on the source site
- At least one admin user exists in the Next.js database (needed for `MIGRATION_OWNER_USER_ID`)

### 17.2 Add migration variables to `.env`

Append these to your local `.env` (do **not** add them to Vercel — they are only needed for the one-time migration script):

```env
# WordPress source site
WP_USERNAME=your-wp-admin-username
WP_PASSWORD=your-wp-admin-password
WP_BASE_URL=https://healthacademy.ca/wp-json   # default; omit if using this URL

# UUID of the admin user in the Next.js database who will own migrated courses
MIGRATION_OWNER_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Find the migration owner user ID

```bash
npx tsx --env-file=.env -e "
  import { prisma } from './lib/db';
  const users = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true, name: true } });
  console.table(users);
  await prisma.\$disconnect();
"
```

### 17.3 Run the migration agent

```bash
npm run migrate:wordpress
```

The agent runs in phases with two human review checkpoints:

1. **Gate 1 (before any writes)** — reviews a JSON audit of all WordPress content found (courses, lessons, quizzes, media counts). Type `yes` to proceed or `no` to abort with no database changes.
2. **Gate 2 (after all writes)** — reviews a final report of records created, media uploaded, and action items (Stripe price IDs to fill in, thumbnails to upload, etc.). Press Enter to finish.

### 17.4 Post-migration steps

After the agent completes, finish these items in the admin panel before publishing any course:

- [ ] **Stripe prices** — Create a Stripe Product + Price for each course and replace `MIGRATION_PENDING_*` values in `Course.stripePriceId`
- [ ] **Missing thumbnails** — Upload thumbnails for any courses flagged in Gate 2 `actionItems.thumbnailUpload`
- [ ] **Spot-check content** — Verify YouTube embeds, PDFs, and videos render correctly in the learner dashboard
- [ ] **Interactive activities** — Confirm the 30 HTML/JS interactive lessons render in their sandboxed iframes
- [ ] **Publish courses** — Change `Course.status` from `Draft` to `Published` per course once the above are complete

### 17.5 Re-running safely

The migration agent is **idempotent** — it can be re-run against the same database without duplicating records. Existing courses are matched by slug; existing S3 media is reused by deterministic key. Only missing records and files are created.

---

## 18. Post-Deployment Checklist

Complete these steps after the first successful production deploy:

- [ ] Visit `https://your-domain.com` and confirm the landing page loads
- [ ] Sign in with GitHub — confirm the OAuth flow completes
- [ ] Sign in with Google — confirm the OAuth flow completes
- [ ] Sign in with Email OTP — confirm the OTP email arrives (check Resend logs if not)
- [ ] Open the admin panel (`/admin`) and verify it loads for an admin user
- [ ] Upload a test file in the admin course editor — confirm it appears in Tigris and displays in the browser
- [ ] Enroll in a test course using Stripe test mode — confirm the `checkout.session.completed` webhook is received and the enrollment activates
- [ ] Open the AI Advisor (`/chatbot`) and send a message — confirm a reply is returned
- [ ] Check Arcjet dashboard for any unexpected blocks
- [ ] Run `npx prisma migrate deploy` if any migrations were added since the initial deploy
- [ ] Set `STRIPE_SECRET_KEY` to the live key (`sk_live_...`) when ready to accept real payments
- [ ] Verify a custom sending domain in Resend and update the `from` address in `lib/auth.ts` before launch
