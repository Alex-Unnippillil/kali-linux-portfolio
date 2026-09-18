import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { xFeedFixture, makeXPost } from "../fixtures/x-profile";

async function mockApi(page: Page) {
  const requests: string[] = [];
  await page.route("https://pbs.twimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="g"><stop stop-color="#152c43"/><stop offset="1" stop-color="#154548"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><path d="M70 250h660M400 60v380" stroke="#568caa" stroke-width="1"/><rect x="120" y="130" width="560" height="250" rx="20" fill="#0d1929" stroke="#507b96"/><text x="154" y="205" font-size="21" fill="#81c6ff" font-family="sans-serif">ENGINEERING INTERFACE</text><text x="154" y="258" font-size="32" fill="white" font-family="sans-serif">Built for people.</text><text x="154" y="338" font-size="15" fill="#b6c6d6" font-family="sans-serif">Test fixture — not live account content</text></svg>',
    }),
  );
  await page.route("**/api/x/profile**", (route) => {
    requests.push(route.request().url());
    const more = new URL(route.request().url()).searchParams.has("cursor");
    return route.fulfill({
      json: more
        ? {
            ...xFeedFixture,
            posts: [
              xFeedFixture.posts[0],
              makeXPost("1005", "Fixture: older cloud architecture notes."),
            ],
            nextCursor: undefined,
          }
        : xFeedFixture,
    });
  });
  return requests;
}
async function openX(page: Page, url = "/?app=x") {
  await page.goto(url);
  const app = page.getByTestId("x-profile-app");
  await expect(app).toBeVisible();
  const enable = app.getByRole("button", {
    name: "Enable network",
    exact: true,
  });
  if (await enable.isVisible()) await enable.click();
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
      const requests = await mockApi(page);
      const app = await openX(page);
      await expect(
        app.getByText(/Fixture: building an accessible/),
      ).toBeVisible();
      await expect(app.getByRole("article")).toHaveCount(3);
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
      await expect(app.getByText(/Fixture: thanks/)).toBeVisible();
      await expect(app.getByRole("article")).toHaveCount(1);
      await press("Media");
      await expect(app.getByRole("article")).toHaveCount(2);
      await press("Posts");
      await app
        .getByRole("searchbox", { name: "Search loaded posts" })
        .fill("unmatched selection");
      await expect(app.getByText("No matching posts")).toBeVisible();
      await press("Clear search");
      expect(requests).toHaveLength(1);
      await press("Read full post");
      await expect(
        app.getByRole("button", { name: "Show less" }),
      ).toHaveAttribute("aria-expanded", "true");
      await press("Load older posts");
      await expect(
        app.getByText("Fixture: older cloud architecture notes."),
      ).toBeVisible();
      await expect(app.getByRole("article")).toHaveCount(4);
      await expect(
        app.getByRole("button", { name: "Load older posts" }),
      ).toHaveCount(0);
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
      await menu
        .getByTestId("whisker-menu-app-list")
        .getByRole("button", { name: "X", exact: true })
        .click();
      await expect(
        app.getByText(/Fixture: building an accessible/),
      ).toBeVisible();
      await intactLayout(page);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
test("X standalone route, errors and retry never ask visitors for credentials", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let failing = true;
  await page.route("**/api/x/profile**", (route) =>
    route.fulfill(
      failing
        ? { status: 503, json: { code: "not_configured" } }
        : {
            json: {
              ...xFeedFixture,
              profile: { ...xFeedFixture.profile, avatar: undefined },
              nextCursor: undefined,
            },
          },
    ),
  );
  await page.route("https://pbs.twimg.com/**", (route) => route.abort());
  const app = await openX(page, "/apps/x");
  await expect(
    app.getByText("The profile feed is not connected yet"),
  ).toBeVisible();
  await expect(app.getByRole("article")).toHaveCount(0);
  await expect(app.locator("iframe")).toHaveCount(0);
  await intactLayout(page);
  await mkdir("portfolio-screenshots", { recursive: true });
  await page.screenshot({
    path: `portfolio-screenshots/${browserName}-x-unconfigured.png`,
    animations: "disabled",
  });
  failing = false;
  await app.getByRole("button", { name: "Try again" }).click();
  await expect(app.getByText(/Fixture: building an accessible/)).toBeVisible();
  await intactLayout(page);
});
