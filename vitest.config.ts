import { defineConfig, defineProject } from "vitest/config";

const alias = { "@": new URL(".", import.meta.url).pathname };

const sharedTest = {
  environment: "node" as const,
  globals: true,
  setupFiles: ["./tests/setup.ts"],
};

const coverageInclude = [
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
];

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      defineProject({
        resolve: { alias },
        test: {
          name: "unit",
          ...sharedTest,
          include: ["tests/unit/**/*.test.ts"],
          // Workspace `ProjectConfig` typings omit `coverage`; Vitest still merges this at runtime.
          // @ts-expect-error -- per-project coverage for `vitest run --coverage --project unit`
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "lcov"],
            include: coverageInclude,
          },
        },
      }),
      defineProject({
        resolve: { alias },
        test: {
          name: "integration",
          ...sharedTest,
          include: ["tests/integration/**/*.test.ts"],
        },
      }),
    ],
  },
});
