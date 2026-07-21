# Proposed Improvements — Health Academy LMS

A code-review pass across auth, payments, file storage, configuration, and
code quality. Each item lists **what**, **why it matters**, **where**, and a
**suggested fix**. Priorities:

- **P0** — broken or actively risky; fix first.
- **P1** — real bug or meaningful risk; fix soon.
- **P2** — quality / hardening / consistency.
- **P3** — nice to have.

Nothing in this document has been changed yet — it's a plan for discussion.

---

## P0 — Fix first

### 1. Lesson-document S3 bucket mismatch breaks the inline PDF viewer
- **Where:** `app/api/s3/upload/route.ts` (writes to `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES`) vs `app/api/lesson-documents/view/route.ts` (reads from `S3_BUCKET_NAME`).
- **Why:** Lesson documents are uploaded through `/api/s3/upload` (see `LessonDocumentsUploader.tsx`), which stores objects in the bucket named by `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES`. The inline PDF view route reads from a *different* env var, `S3_BUCKET_NAME`. If those two variables point at different buckets, the inline PDF viewer returns 404 for every document — i.e. the recently shipped "PDFs render inline" fix silently fails in any environment where the two names differ.
- **Fix:** Have the view route read from the same bucket documents are written to (`NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES`), or consolidate to a single bucket env var (see #9). Verify in production that both names currently resolve to the same bucket.

### 2. Stripe webhook grants access without confirming payment
- **Where:** `app/api/webhook/stripe/route.ts:97-113`.
- **Why:** The handler sets `enrollment.status = "Active"` on `checkout.session.completed` without checking `session.payment_status === "paid"`. For asynchronous payment methods (some cards, bank debits), `completed` fires while the charge is still `unpaid`/`processing`, granting course access before money is captured (and possibly permanently if the payment later fails).
- **Fix:** Only activate when `session.payment_status === "paid"`. Handle `checkout.session.async_payment_failed` (and, ideally, `charge.refunded`/`charge.dispute.created`) to keep or revoke access accordingly. Record the event in `stripeWebhookEvent` in all branches (already done in most).

---

## P1 — Fix soon

### 3. No rate limiting anywhere (Arcjet is a no-op stub)
- **Where:** `lib/arcjet.ts` is a stub that always returns "allowed"; `lib/chat/arcjet.ts` likewise. No live protection is wired up.
- **Why:** `/api/chat` calls a paid LLM on every request (direct cost + abuse), the contact form sends email (spam relay), and `/api/s3/upload` issues presigned URLs — all with only session/admin auth and no throttling. A single authenticated user can run up cost or spam the inbox.
- **Fix:** Re-introduce real rate limiting (Arcjet, Upstash Ratelimit, or a small DB/Redis token bucket) on `/api/chat`, the contact action, and the upload routes. Start with generous per-user/per-IP limits.

### 4. Contact form: hardcoded recipient + sandbox sender
- **Where:** `app/(public)/contact/actions/send-contact-email.ts:25-38`.
- **Why:** `to: "happynutritionhealth@gmail.com"` and `from: "onboarding@resend.dev"` are hardcoded. The sandbox `onboarding@resend.dev` sender only delivers to the Resend account owner, so the **confirmation email to the user never arrives**, and the notification only works while the owner address matches. The recipient should not be hardcoded.
- **Fix:** Move the recipient to an env var (e.g. `CONTACT_INBOX_EMAIL`) and send `from` an address on a Resend-verified domain (see #11). Add basic length limits and email-format validation on the form fields (zod) to reduce spam/abuse.

### 5. Payments are in USD; HST is not actually being collected yet
- **Where:** `app/(public)/courses/[slug]/actions.ts` (self-heal creates `currency: "usd"`), `app/admin/courses/create/actions.ts` (same).
- **Why:** For a Canadian business, (a) prices are created in **USD**, and (b) HST is only charged if **Stripe Tax is activated** in the dashboard — the checkout code already falls back to untaxed checkout and logs `STRIPE_TAX_NOT_CONFIGURED` when it isn't. So tax may currently be $0.
- **Fix:** Decide USD vs CAD (switching currency requires recreating Stripe prices). Activate Stripe Tax in the dashboard with a Canadian origin + HST registration. Confirm `automatic_tax` is producing tax lines on live sessions.

### 6. E2E test pipeline is red (seed never runs)
- **Where:** `tests/e2e/global-setup.ts` runs `prisma migrate reset`, which under Prisma 7 no longer runs the seed from the old `package.json` "prisma" block. A recent change moved the seed to `prisma.config.ts` (`migrations.seed`), but the E2E job still failed with `session_userId_fkey` (no seeded users).
- **Why:** The E2E suite has effectively never passed, so it provides no protection and blocks nobody (it's just always red).
- **Fix:** Make the global setup seed **explicitly** rather than relying on `migrate reset`'s implicit seeding — e.g. run `prisma db seed` (or invoke the seed module directly) right after the reset, and fail loudly if it errors.

---

## P2 — Quality & hardening

### 7. No HTTP security headers
- **Where:** `next.config.ts` (no `headers()`).
- **Fix:** Add a `headers()` config with at least `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, and a starter `Content-Security-Policy`. Note the CSP must allow the Tigris/S3 media host and the LLM/Stripe endpoints the app uses.

### 8. Unsanitized HTML rendering + over-permissive iframe sandbox
- **Where:** `CourseContent.tsx` (`dangerouslySetInnerHTML` for description/content, and the `interactiveScript` iframe with `sandbox="allow-scripts allow-same-origin allow-popups"` populated via `document.write`), `RenderDescription.tsx`.
- **Why:** `allow-scripts` + `allow-same-origin` together effectively defeat the iframe sandbox. Content is admin-authored (lower risk), but a compromised/rogue admin or a stored-XSS in tiptap content would run in the app origin.
- **Fix:** Sanitize tiptap HTML server-side (e.g. DOMPurify/sanitize-html) before rendering. For the interactive iframe, drop `allow-same-origin` if feasible, or serve it from a separate sandboxed origin.

### 9. Overlapping / misleadingly named S3 env vars
- **Where:** `lib/env.ts` — `S3_BUCKET_NAME`, `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES`, `NEXT_PUBLIC_S3_PUBLIC_URL`.
- **Why:** `NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES` actually stores videos and documents too, and the split between it and `S3_BUCKET_NAME` is the root of issue #1. Two bucket names invite drift.
- **Fix:** Consolidate to one server bucket var + one public base URL var, rename for clarity, and update all read/write/delete sites to use them consistently.

### 10. Inconsistent media URL construction
- **Where:** `app/(public)/courses/[slug]/page.tsx:42` builds `https://${NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.fly.storage.tigris.dev/...` by hand, while everything else uses `NEXT_PUBLIC_S3_PUBLIC_URL` via `useConstructUrl`. `next.config.ts` also hardcodes two Tigris hostnames.
- **Fix:** Route all media URLs through one helper (`useConstructUrl` / a server equivalent) driven by `NEXT_PUBLIC_S3_PUBLIC_URL`, and derive the `next/image` `remotePatterns` host from that same value so a storage/CDN change is a one-line env update.

### 11. Resend needs a verified sending domain
- **Where:** contact form (and any future transactional email).
- **Why:** `onboarding@resend.dev` is a sandbox sender that only delivers to the account owner. Any user-facing email (contact confirmation) will not be delivered.
- **Fix:** Verify a domain at resend.com/domains, set a `RESEND_FROM_EMAIL`-style var to an address on it, and use a live API key.

### 12. Latent React hooks violations masked as warnings
- **Where:** `hooks/use-mobile.ts`, `components/chat/floating-chat.tsx`, `components/ui/sidebar.tsx`, `components/file-uploader/Uploader.tsx`, `app/quizzes/[quizId]/_components/QuizAttempt.tsx`, `app/admin/courses/[courseId]/edit/_components/CourseStructure.tsx`, `components/chat/ai-advisor.tsx`, `components/community/ban-form.tsx`.
- **Why:** 16 `react-hooks` errors (set-state-in-effect, refs-during-render, impure-function) were downgraded to warnings so CI could pass. They point at real cascading-render / render-purity issues.
- **Fix:** Address them properly (derive state during render, move ref access into effects/handlers, memoize impure calls), then restore the rules to `error`.

### 13. Server actions / API input validation gaps
- **Where:** contact action reads `formData.get(...) as string` with no length caps; several routes trust IDs from params.
- **Fix:** Validate every external input with zod (max lengths, email format, enum membership). Access-control on data reads already looks solid (e.g. quiz result route enforces enrollment), but keep new endpoints to the same standard.

---

## P3 — Nice to have

### 14. Node engine mismatch in CI
- CI runs Node 20 while some deps (`@prisma/streams-local`, `kysely`) request `>=22`. Bump the CI/runtime Node to 22 to match `engines` intent and silence `EBADENGINE`.

### 15. Navbar auth state can look stale briefly
- **Where:** `Navbar.tsx` hardcodes `isPending = false`; better-auth `cookieCache` is 5 min. `router.refresh()` on logout was added, but the session cookie cache can still serve a stale role/name for up to the cache window in some flows.
- **Fix:** Consider lowering `cookieCache.maxAge` or revalidating on focus for auth-sensitive UI.

### 16. Remove dead code
- `app/api/lesson-documents/upload/route.ts` appears unused (uploads go through `/api/s3/upload`) and references yet another bucket path. Remove it or make it the single documented upload path.

---

## Suggested sequencing

1. **P0 (#1, #2)** — one small PR each; both are correctness bugs with real user/money impact.
2. **P1 (#3–#6)** — rate limiting, contact-form config, tax/currency decision, and getting E2E green.
3. **P2 (#7–#13)** — headers, sanitization, env consolidation, hooks cleanup — group logically.
4. **P3** — opportunistic.

Happy to turn any of these into individual PRs on request.
