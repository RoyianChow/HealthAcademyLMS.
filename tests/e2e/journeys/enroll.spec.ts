import { expect, test } from "@playwright/test";
import { E2E_SEED } from "../fixtures/seed-ids";
import { assertNoA11yViolations } from "../helpers/a11y";
import {
  createPendingEnrollmentForCourse2,
  removeEnrollmentForCourse2,
} from "../helpers/db";
import { sendCheckoutCompletedWebhook } from "../helpers/stripe-webhook";

test.describe("enrollment journey", () => {
  test.beforeEach(async () => {
    await removeEnrollmentForCourse2();
  });

  test("student enrolls via webhook activation and sees course on dashboard", async ({
    page,
  }) => {
    await page.goto("/courses");
    await page.waitForLoadState("networkidle");
    await assertNoA11yViolations(page);

    await page.getByRole("link", { name: E2E_SEED.course2.title }).click();
    await expect(page.getByRole("button", { name: "Enroll Now!" })).toBeVisible();

    const enrollment = await createPendingEnrollmentForCourse2();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is required for enrollment E2E tests.");
    }

    await sendCheckoutCompletedWebhook({
      baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
      webhookSecret,
      enrollmentId: enrollment.id,
      courseId: E2E_SEED.course2.id,
      customerId: E2E_SEED.stripeCustomerId,
      amountTotal: 14900,
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const courseCard = page
      .getByRole("heading", { name: E2E_SEED.course2.title })
      .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");

    await expect(courseCard).toBeVisible();
    await expect(courseCard.getByText("0%")).toBeVisible();
  });
});
