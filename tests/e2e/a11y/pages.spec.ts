import { test } from "@playwright/test";
import { E2E_SEED } from "../fixtures/seed-ids";
import { assertNoA11yViolations } from "../helpers/a11y";

test.describe("public pages a11y", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("course catalog", async ({ page }) => {
    await page.goto("/courses");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });
});

test.describe("student pages a11y", () => {
  test("dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("lesson page", async ({ page }) => {
    await page.goto(
      `/dashboard/${E2E_SEED.course.slug}/${E2E_SEED.lesson.id}`
    );
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("quiz page", async ({ page }) => {
    await page.goto(`/quizzes/${E2E_SEED.quiz.id}`);
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("chatbot page", async ({ page }) => {
    await page.goto("/chatbot");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });
});

test.describe("admin pages a11y", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  test("admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });

  test("admin courses", async ({ page }) => {
    await page.goto("/admin/courses");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);
  });
});
