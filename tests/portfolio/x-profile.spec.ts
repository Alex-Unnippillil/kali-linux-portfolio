import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import snapshot from "../../data/x-profile-snapshot.json";
async function denyExternalServices(page: Page) {
  const unexpected: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (
      /twitter|twimg|x\.com|fxtwitter/.test(url.hostname) ||
      url.pathname.startsWith("/api/x/")
    ) {
      unexpected.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  return unexpected;
}
async function openX(page: Page, url = "/?app=x") {
  await page.goto(url);
  const app = page.getByTestId("x-profile-app");
  await expect(app).toBeVisible();
  const enable = app.getByRole("button", {
    name: "Enable network",
    exact: true,
  });
  await expect(enable).toHaveCount(0);
  return app;
}
async function intactLayout(page: Page) {
  const app = page.getByTestId("x-profile-app");
  await expect
    .poll(() =>
      app.evaluate((node) => {
        const scroll = node.querySelector(
          '[data-testid="x-profile-scroll"]',
        ) as HTMLElement;
        const header = node.querySelector("header")!;
        const frame = node.closest(".opened-window");
        const rect = node.getBoundingClientRect();
        const head = header.getBoundingClientRect();
        return (
          node.scrollWidth <= node.clientWidth + 1 &&
          scroll.scrollWidth <= scroll.clientWidth + 1 &&
          Math.abs(head.top - rect.top) <= 2 &&
          head.bottom <= rect.bottom &&
          (!frame || frame.scrollTop === 0) &&
          document.documentElement.scrollWidth <= innerWidth + 1
        );
      }),
    )
    .toBe(true);
  const taskbar = page.getByRole("navigation", { name: "Phone taskbar" });
  if (await taskbar.isVisible()) {
    await expect
      .poll(async () => {
        const bar = await taskbar.boundingBox();
        const help = await page
          .getByRole("button", { name: "Desktop tips", exact: true })
          .boundingBox();
        const running = await taskbar
          .getByLabel("Running applications")
          .boundingBox();
        return Boolean(
          bar &&
          help &&
          running &&
          help.y >= bar.y &&
          help.y + help.height <= bar.y + bar.height + 1 &&
          running.x + running.width <= help.x,
        );
      })
      .toBe(true);
  }
}
for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`X profile browsing and native window controls at ${viewport.width}x${viewport.height}`, async ({
    browser,
    baseURL,
    browserName,
  }) => {
    const touch = viewport.width < 1000 && browserName !== "firefox";
    const context = await browser.newContext({
      baseURL,
      viewport,
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const requests = await denyExternalServices(page);
      const app = await openX(page);
      await expect(
        app.getByText(/Awesome! I was among the first 1,000 people/),
      ).toBeVisible();
      await expect(app.getByRole("article")).toHaveCount(17);
      await expect
        .poll(() =>
          app
            .locator("img:not([loading=lazy])")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await intactLayout(page);
      await mkdir("portfolio-screenshots", { recursive: true });
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-x-profile-${viewport.width}x${viewport.height}.png`,
        animations: "disabled",
      });
      const press = async (name: string) => {
        const control = app.getByRole("button", { name, exact: true });
        if (touch) await control.tap();
        else await control.click();
      };
      await press("Replies");
      await expect(
        app.getByText(/I still want to keep tabs on reality/),
      ).toBeVisible();
      await expect(app.getByRole("article")).toHaveCount(1);
      await press("Media");
      await expect(app.getByRole("article")).toHaveCount(3);
      await press("Posts");
      await app
        .getByRole("searchbox", { name: "Search loaded posts" })
        .fill("unmatched selection");
      await expect(app.getByText("No matching posts")).toBeVisible();
      await press("Clear search");
      expect(requests).toHaveLength(0);
      await expect(app.getByRole("article")).toHaveCount(17);
      await expect(
        app.getByRole("button", { name: "Load older posts" }),
      ).toHaveCount(0);
      await expect(
        app.getByRole("button", { name: "Refresh posts" }),
      ).toHaveCount(0);
      const first = app.getByRole("article").first();
      await expect(
        first.getByRole("link", { name: "Open post", exact: true }),
      ).toHaveAttribute(
        "href",
        "https://x.com/AUnnippillil/status/2022722108921610324",
      );
      await expect(first).toContainText(snapshot.feed.posts[0].text);
      await expect
        .poll(() =>
          first
            .locator("img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      await intactLayout(page);
      const window = page.locator("#x");
      if (viewport.width >= 1000) {
        await window
          .getByRole("button", { name: "Window maximize", exact: true })
          .click();
        await expect(window).toHaveAttribute("data-window-state", "maximized");
        await app
          .getByTestId("x-profile-scroll")
          .evaluate((node) => node.scrollTo(0, 0));
        await intactLayout(page);
        await page.screenshot({
          path: `portfolio-screenshots/${browserName}-x-profile-maximized.png`,
          animations: "disabled",
        });
      }
      // Evaluate accessibility on the real app, independently of unrelated OS tools.
      const results = await new AxeBuilder({ page })
        .include('[data-testid="x-profile-app"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await window
        .getByRole("button", { name: "Window close", exact: true })
        .click();
      await expect(window).toHaveCount(0);
      await page
        .getByRole("button", { name: "Applications menu", exact: true })
        .click();
      const menu = page.getByTestId("whisker-menu-dropdown");
      await menu
        .getByRole("searchbox", { name: "Search applications" })
        .fill("X");
      const taskbar = page.getByRole("navigation", { name: "Phone taskbar" });
      if (await taskbar.isVisible()) {
        await expect
          .poll(async () => {
            const bounds = await menu.boundingBox();
            const bar = await taskbar.boundingBox();
            return Boolean(bounds && bar && bounds.y + bounds.height <= bar.y);
          })
          .toBe(true);
      }
      await menu
        .getByTestId("whisker-menu-app-list")
        .getByRole("button", { name: "X", exact: true })
        .click();
      await expect(
        app.getByText(/Awesome! I was among the first 1,000 people/),
      ).toBeVisible();
      await intactLayout(page);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
test("X standalone shows actual saved posts with external services blocked", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await denyExternalServices(page);
  const app = await openX(page, "/apps/x");
  await expect(
    app.getByText(/Awesome! I was among the first 1,000 people/),
  ).toBeVisible();
  await expect(app.getByText("Saved posts")).toBeVisible();
  await expect(app.getByRole("article")).toHaveCount(17);
  await expect(app.locator("iframe")).toHaveCount(0);
  await expect(
    app.getByText("The saved selection is not available yet"),
  ).toHaveCount(0);
  await intactLayout(page);
  await mkdir("portfolio-screenshots", { recursive: true });
  await page.screenshot({
    path: `portfolio-screenshots/${browserName}-x-saved-standalone.png`,
    animations: "disabled",
  });
  await page.reload();
  await expect(app.getByRole("article")).toHaveCount(17);
  expect(requests).toEqual([]);
});
