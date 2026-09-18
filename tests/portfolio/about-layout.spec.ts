import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`About portrait and introduction do not overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const app = page.locator("#about");
    await expect(app).toBeVisible();
    const portrait = app.getByRole("img", { name: "Alex Unnippillil Logo", exact: true });
    const introduction = app.getByText(/^My name is /).first();
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    // A flex column with scrollable overflow must not compress the image
    // wrapper and paint the portrait behind the introduction on short screens.
    await expect.poll(async () => {
      const image = await portrait.boundingBox();
      const text = await introduction.boundingBox();
      return image && text ? text.y - (image.y + image.height) : -1;
    }).toBeGreaterThanOrEqual(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("portfolio-screenshots", { recursive: true });
    await page.screenshot({ path: `portfolio-screenshots/about-layout-${viewport.width}x${viewport.height}.png`, animations: "disabled" });
  });
}
