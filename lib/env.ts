import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
  DATABASE_URL: z.string().url(),
  /** Direct Postgres URL for migrations (Neon: `DIRECT_URL`); falls back to pooled URL when not using a pooler. */
  DIRECT_DATABASE_URL: z.preprocess(
    (value) => value || process.env.DIRECT_URL || process.env.DATABASE_URL,
    z.string().url()
  ),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_GITHUB_CLIENT_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  ARCJET_KEY: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL_S3: z.string().min(1),
  AWS_ENDPOINT_URL_IAM: z.string().min(1),
  AWS_REGION: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  S3_BUCKET_NAME: z.string().min(1),

  // AI Advisor — at least one of OPENAI_API_KEY or OPENROUTER_API_KEY is needed for live replies.
  // If neither is set, the advisor falls back to rule-based responses (local dev only).
  CHAT_PROVIDER: z.enum(["openai", "openrouter"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
},

  client: {
 NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES: z.string().min(1),
    NEXT_PUBLIC_S3_PUBLIC_URL: z.string().url(),
    },

  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES:
      process.env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES,
    NEXT_PUBLIC_S3_PUBLIC_URL: process.env.NEXT_PUBLIC_S3_PUBLIC_URL,
  },
});
