import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createAuthStorageStates } from "./helpers/auth";
import { loadTestEnv } from "./load-test-env";

export default async function globalSetup() {
  loadTestEnv(path.resolve(__dirname, "../.."));

  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL ?? databaseUrl;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for E2E global setup.");
  }

  if (!directUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma.");
  }

  execSync("npx prisma migrate reset --force", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
    },
  });

  const adapter = new PrismaPg({
    connectionString: directUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    await createAuthStorageStates(prisma);
  } finally {
    await prisma.$disconnect();
  }
}