import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage has no color-contrast violations in kali theme", async ({
  page,
}) => {
  await page.goto("/?theme=kali");
  const results = await new AxeBuilder({ page })
    .withRules("color-contrast")
    .analyze();
  expect(results.violations).toHaveLength(0);
});
