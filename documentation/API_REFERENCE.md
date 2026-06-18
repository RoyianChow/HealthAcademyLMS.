# API Reference

> Part of the [Getting Started](../GETTING_STARTED.md)

---

## API Routes

All API routes live under `app/api/`.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `*` | `/api/auth/[...all]` | better-auth catch-all (handles OAuth callbacks, OTP, sessions) |

### AI Advisor (Chat)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Main message handler. Requires session. Accepts `message`, `conversationId`, `mode`, `responseStyle`, optional PDF attachment. |
| `GET` | `/api/chat/history` | Returns messages for a conversation. Accepts `conversationId` query param. |
| `GET` | `/api/chat/conversations` | Returns the user's conversation list. |
| `POST` | `/api/chat/conversations` | Creates a new conversation. |

### File Upload

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/s3/upload` | Returns a presigned S3 PUT URL. Accepts `filename`, `contentType`, `size`. |
| `POST` | `/api/s3/delete` | Deletes an S3 object. Accepts `key`. |
| `POST` | `/api/lesson-documents/upload` | Presigned URL specifically for lesson documents. |

### Quizzes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/quizzes` | List quizzes (admin use). |
| `POST` | `/api/quizzes` | Create a quiz. |
| `GET` | `/api/quizzes/[quizId]` | Get a specific quiz. |
| `PATCH` | `/api/quizzes/[quizId]` | Update a quiz. |
| `DELETE` | `/api/quizzes/[quizId]` | Delete a quiz. |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhook/stripe` | Stripe webhook receiver. Validates signature and activates enrollment on `checkout.session.completed`. |

---

## Server Actions

Server Actions are colocated with pages or grouped in `app/actions/`.

### Community Actions (`app/actions/community/`)

| File | Action | Description |
|------|--------|-------------|
| `create-post.ts` | `createPost` | Create a community post (checks user ban) |
| `delete-post.ts` | `deletePost` | Delete a post (admin or author) |
| `create-comment.ts` | `createComment` | Add a comment to a post |
| `delete-comment.ts` | `deleteComment` | Delete a comment |
| `toggle-like.ts` | `toggleLike` | Like or unlike a post |
| `ban-user.ts` | `banUser` | Ban a user from the community (admin only) |

### Quiz Actions (`app/actions/quiz/`)

| File | Action | Description |
|------|--------|-------------|
| `delete-quiz.ts` | `deleteQuiz` | Delete a quiz (admin only) |
| `delete-quiz-attempt.ts` | `deleteQuizAttempt` | Delete a quiz attempt (admin only) |

Additional inline Server Actions appear within page files for mutations tightly coupled to a single page (e.g. submitting quiz answers, marking lesson progress, creating/editing courses and lessons).
