import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createAuthStorageStates } from "./helpers/auth";

export default async function globalSetup() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://test:test@localhost:5433/healthacademy_test";

  process.env.DATABASE_URL = databaseUrl;

  execSync("npx prisma migrate reset --force", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    await createAuthStorageStates(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
