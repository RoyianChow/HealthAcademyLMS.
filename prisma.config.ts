import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` runs from postinstall (including CI jobs with no
// database) and does not need a connection, but loading this config fails
// hard if DIRECT_URL is unset. Fall back so generate works anywhere;
// commands that actually connect (migrate, studio) still need a real URL
// and will fail at connect time if only the placeholder is available.
const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 ignores the package.json "prisma" block — the seed command
    // must live here or `prisma migrate reset` / `prisma db seed` will
    // silently skip seeding (breaking E2E global setup).
    seed: "tsx prisma/seed-test.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
