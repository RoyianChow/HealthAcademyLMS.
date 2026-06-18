import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Load `.env.test` (or `.env.test.example`) so Playwright, global-setup, and
 * the Next.js webServer all use the same isolated test configuration.
 */
export function loadTestEnv(rootDir: string) {
  const candidates = [".env.test", ".env.test.example"];

  for (const file of candidates) {
    const fullPath = path.join(rootDir, file);
    if (!existsSync(fullPath)) continue;

    for (const line of readFileSync(fullPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }

    break;
  }

  process.env.E2E_TEST ??= "true";
  process.env.ARCJET_ENV ??= "development";
  process.env.DATABASE_URL ??=
    "postgresql://test:test@localhost:5433/healthacademy_test";
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;
  process.env.PLAYWRIGHT_BASE_URL ??= "http://localhost:3000";
}
