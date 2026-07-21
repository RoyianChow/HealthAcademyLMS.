import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { loadTestEnv } from "./tests/e2e/load-test-env";

const rootDir = path.resolve(__dirname);
loadTestEnv(rootDir);

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const testServerEnv: Record<string, string> = {
  NODE_ENV: "production",
  E2E_TEST: "true",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://test:test@localhost:5433/healthacademy_test",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3 ?? "",
  AWS_ENDPOINT_URL_IAM: process.env.AWS_ENDPOINT_URL_IAM ?? "",
  AWS_REGION: process.env.AWS_REGION ?? "auto",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES:
    process.env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES ?? "",
  NEXT_PUBLIC_S3_PUBLIC_URL: process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "",
  PLAYWRIGHT_BASE_URL: baseURL,
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    storageState: "tests/e2e/.auth/student.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: testServerEnv,
  },
});
