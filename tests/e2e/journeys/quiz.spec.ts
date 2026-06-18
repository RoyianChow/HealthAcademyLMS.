import { expect, test } from "@playwright/test";
import { E2E_SEED } from "../fixtures/seed-ids";
import { assertNoA11yViolations } from "../helpers/a11y";
import { getLatestQuizAttempt } from "../helpers/db";

test.describe("quiz journey", () => {
  test("student completes quiz with a perfect score", async ({ page }) => {
    await page.goto(`/quizzes/${E2E_SEED.quiz.id}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Start Quiz" }).click();
    await expect(page.getByText("Attempt #1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Carbohydrates/ }).click();
    await page.getByRole("button", { name: /Amino acids/ }).click();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, {
      timeout: 10_000,
    });
    await assertNoA11yViolations(page);

    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect(
      page.locator('[data-slot="card-title"]').filter({
        hasText: "Quiz submitted successfully. You passed.",
      })
    ).toBeVisible();
    await expect(page.getByText("Score: 100%")).toBeVisible();

    const attempt = await getLatestQuizAttempt(
      E2E_SEED.quiz.id,
      E2E_SEED.studentUser
    );

    expect(attempt?.isComplete).toBe(true);
    expect(attempt?.score).toBe(100);
  });
});
