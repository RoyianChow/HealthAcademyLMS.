import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function assertNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(
    results.violations,
    formatViolations(results.violations)
  ).toEqual([]);
}

function formatViolations(
  violations: Array<{ id: string; help: string; nodes: Array<{ html: string }> }>
) {
  if (violations.length === 0) {
    return "";
  }

  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => node.html)
          .join("\n")}`
    )
    .join("\n\n");
}
