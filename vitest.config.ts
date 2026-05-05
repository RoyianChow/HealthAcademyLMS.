import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the @/* path alias declared in tsconfig.json → "./*"
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      include: [
        "app/data/admin/**/*.ts",
        "app/data/user/**/*.ts",
        "app/data/course/**/*.ts",
        "app/data/quiz/**/*.ts",
        "app/data/community/**/*.ts",
        "app/actions/**/*.ts",
        "app/quizzes/**/action.ts",
        "app/dashboard/**/actions.ts",
        "app/(public)/**/actions.ts",
        "middleware.ts",
        "app/admin/**/actions.ts",
        "app/admin/**/route.ts",
        "app/api/**/*.ts",
      ],
    },
  },
});
