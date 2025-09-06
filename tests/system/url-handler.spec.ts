import { expect, test } from "@playwright/test";

// System-level test verifying external URL handling
// The test opens http://example.com in the currently selected browser and
// confirms that switching tabs does not trigger a reload of the page.
test.describe("URL handler", () => {
  test("opens example.com without reload after switching", async ({
    context,
  }) => {
    const page = await context.newPage();
    await page.goto("http://example.com");
    await expect(page).toHaveURL("http://example.com/");

    // Record navigation entry count
    const initialEntries = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    // Simulate switching to another tab/browser and back
    const other = await context.newPage();
    await other.goto("about:blank");
    await page.bringToFront();

    const entriesAfter = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );
    expect(entriesAfter).toBe(initialEntries);
  });
});
