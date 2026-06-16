import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createAuthStorageStates } from "./helpers/auth";
import { loadTestEnv } from "./load-test-env";

export default async function globalSetup() {
  loadTestEnv(path.resolve(__dirname, "../.."));

  const databaseUrl = process.env.DATABASE_URL!;
  const directUrl = process.env.DIRECT_URL ?? databaseUrl;

  execSync("npx prisma migrate reset --force", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
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
