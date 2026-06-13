import { expect, test } from "@playwright/test";
import { E2E_SEED } from "../fixtures/seed-ids";
import { assertNoA11yViolations } from "../helpers/a11y";

test.describe("lesson progress journey", () => {
  test("student marks a lesson complete and progress persists", async ({ page }) => {
    await page.goto(
      `/dashboard/${E2E_SEED.course.slug}/${E2E_SEED.lesson.id}`
    );
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Mark as Complete" })).toBeVisible();
    await assertNoA11yViolations(page);

    await page.getByRole("button", { name: "Mark as Complete" }).click();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();

    const lessonLink = page.getByRole("link", {
      name: new RegExp(`1\\. .*Macronutrients`),
    });
    await expect(lessonLink.getByText("Completed")).toBeVisible();

    await page.goto(`/dashboard/${E2E_SEED.course.slug}/community`);
    await page.waitForLoadState("networkidle");

    await page.goto(
      `/dashboard/${E2E_SEED.course.slug}/${E2E_SEED.lesson.id}`
    );
    await page.waitForLoadState("networkidle");

    await expect(lessonLink.getByText("Completed")).toBeVisible();

    const progressLabel = page.locator("text=Progress").first().locator("xpath=..");
    await expect(progressLabel).toContainText(/[1-9]\d*%/);
  });
});
