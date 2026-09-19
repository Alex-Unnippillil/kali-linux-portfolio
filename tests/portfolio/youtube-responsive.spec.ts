import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Deterministic API fixtures test the real app/shell, not Google's availability or quota.
const playlists = [
  {
    id: "PL_LABS",
    title: "Engineering & security",
    description: "Engineering projects",
    itemCount: 4,
    thumbnail: "",
    publishedAt: "",
    privacyStatus: "public",
  },
  {
    id: "PL_LEARN",
    title: "Learning library",
    description: "Technical walkthroughs",
    itemCount: 3,
    thumbnail: "",
    publishedAt: "",
    privacyStatus: "public",
  },
];
const video = (videoId: string, title: string, position = 0) => ({
  videoId,
  title,
  position,
  thumbnail: `/test-thumbnails/${videoId}.svg`,
  description:
    "A practical walkthrough from the account playlist library. The description and video identity are preserved across browsing, searching, and saving.",
  publishedAt: "2026-09-01T12:00:00Z",
});
async function fixture(page: Page) {
  await page.route("**/test-thumbnails/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><defs><linearGradient id="g"><stop stop-color="#182b46"/><stop offset="1" stop-color="#305968"/></linearGradient></defs><rect width="480" height="270" fill="url(#g)"/><circle cx="380" cy="100" r="100" fill="none" stroke="#a3c8ff" stroke-opacity=".3" stroke-width="30"/><text x="30" y="65" fill="#bed7ff" font-family="sans-serif" font-size="14" letter-spacing="3">CURATED LIBRARY</text><text x="30" y="143" fill="white" font-family="sans-serif" font-size="32">Engineering &amp; ideas</text><text x="30" y="232" fill="#b7c4d5" font-family="sans-serif" font-size="12">Visual test fixture · Not a live video thumbnail</text></svg>',
    }),
  );
  await page.route("**/api/youtube/directory?**", (route) =>
    route.fulfill({
      json: {
        summary: {
          id: "UCxPIJ3hw6AOwomUWh5B7SfQ",
          title: "Alex Unnippillil",
          thumbnail: "",
        },
        directory: {
          playlists,
          sections: [
            { sectionId: "all", sectionTitle: "Playlists", playlists },
          ],
        },
      },
    }),
  );
  await page.route("**/api/youtube/playlist-items?**", (route) => {
    const url = new URL(route.request().url());
    const lab = url.searchParams.get("playlistId") === "PL_LABS";
    const next = url.searchParams.has("pageToken");
    return route.fulfill({
      json: next
        ? {
            items: [
              video(
                lab ? "nextlab0001" : "nextlearn01",
                lab ? "Advanced engineering" : "Learning next steps",
              ),
            ],
          }
        : {
            items: [
              video("shared00001", "Inside the engineering portfolio"),
              video(
                lab ? "labvideo001" : "learnvid001",
                lab
                  ? "Building an accessible desktop for touch, keyboard, and mouse"
                  : "Cloud architecture walkthrough",
                1,
              ),
            ],
            nextPageToken: lab ? "LAB_NEXT" : "LEARN_NEXT",
          },
    });
  });
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><body style="background:#111;color:white">YouTube player fixture</body></html>',
    }),
  );
}
async function activate(locator: Locator, touch: boolean) {
  if (touch) await locator.tap();
  else await locator.click();
}
async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    await page
      .getByRole("main", { name: "YouTube library" })
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
  ).toBe(true);
}
// Application scrolling must not move its fixed chrome or leave an empty window.
async function intactWindowLayout(page: Page) {
  const app = page.getByTestId("youtube-app");
  await expect.poll(async () => app.evaluate((node) => {
    const frame = node.closest(".opened-window")!;
    const host = node.closest(".windowMainScreen")!;
    const titlebar = frame.querySelector("[data-window-titlebar]")!;
    const nav = node.querySelector('nav[aria-label="Library navigation"]')!;
    const rect = node.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const titleRect = titlebar.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      chromeVisible: navRect.top >= titleRect.bottom - 1 && navRect.bottom <= hostRect.bottom + 1,
      appFillsHost: Math.abs(rect.bottom - hostRect.bottom) <= 2 && Math.abs(rect.top - hostRect.top) <= 2,
      hostNotScrolled: host.scrollTop === 0,
      frameNotScrolled: frame.scrollTop === 0,
    };
  })).toEqual({ chromeVisible: true, appFillsHost: true, hostNotScrolled: true, frameNotScrolled: true });
}
for (const viewport of [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 },
]) {
  test(`YouTube browsing, playback, saving and rotation at ${viewport.width}px`, async ({
    browser,
    baseURL,
    browserName,
  }) => {
    const touch = viewport.width < 1000 && browserName !== "firefox";
    const context = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: viewport.width < 640 && browserName !== "firefox",
      baseURL,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await fixture(page);
      await page.goto("/?app=youtube");
      const app = page.getByTestId("youtube-app");
      await expect(app).toBeVisible();
      const enable = app.getByRole("button", {
        name: "Enable network",
        exact: true,
      });
      await expect(
        app.getByRole("button", {
          name: "Watch Inside the engineering portfolio",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        app.getByTitle("YouTube player for Inside the engineering portfolio", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(enable).toHaveCount(0);
      await expect(app.locator("iframe")).toHaveCount(1);
      await expect(app.locator("iframe")).not.toHaveAttribute(
        "src",
        /autoplay=1/,
      );
      if (viewport.width >= 1000) {
        await page
          .locator("#youtube")
          .getByRole("button", { name: "Window maximize", exact: true })
          .click();
      }
      const navigation = app.getByRole("navigation", {
        name: "Library navigation",
      });
      await expect(navigation).toBeVisible();
      await expect(
        navigation.getByRole("combobox", { name: "Choose a playlist" }),
      ).toBeEnabled();
      await expect(app.locator("iframe")).toHaveAttribute("loading", "eager");
      await expect(app.locator("iframe")).toHaveAttribute(
        "referrerpolicy",
        "strict-origin-when-cross-origin",
      );
      // Player controls must remain unobscured by custom links or overlays.
      await expect(
        app.locator("iframe").locator("..").getByRole("link"),
      ).toHaveCount(0);
      if (viewport.width >= 1000) {
        await expect(page.locator("#youtube")).toHaveAttribute(
          "data-window-state",
          "maximized",
        );
      }
      const dimensions = await app.locator("iframe").boundingBox();
      expect(dimensions!.height).toBeLessThanOrEqual(
        Math.max(201, (dimensions!.width * 9) / 16 + 2),
      );
      await noHorizontalOverflow(page);
      await intactWindowLayout(page);
      await activate(
        app.getByRole("button", {
          name: "Save Inside the engineering portfolio for later",
          exact: true,
        }),
        touch,
      );
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("youtube:watch-later") || "[]")
                .length,
          ),
        )
        .toBe(1);
      await activate(
        app.getByRole("button", { name: "Load more videos", exact: true }),
        touch,
      );
      await expect(
        app.getByRole("button", {
          name: "Watch Advanced engineering",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        app.getByRole("button", {
          name: "Watch Learning next steps",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        app.getByRole("button", {
          name: "Watch Inside the engineering portfolio",
          exact: true,
        }),
      ).toHaveCount(1);
      await mkdir("portfolio-screenshots", { recursive: true });
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-youtube-library-${viewport.width}.png`,
        animations: "disabled",
      });
      await app
        .getByRole("main", { name: "YouTube library" })
        .evaluate((node) => node.scrollTo(0, 0));
      await intactWindowLayout(page);
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-youtube-overview-${viewport.width}.png`,
        animations: "disabled",
      });
      await activate(
        app.getByRole("button", {
          name: "Watch Inside the engineering portfolio",
          exact: true,
        }),
        touch,
      );
      const frame = app.getByTitle(
        "YouTube player for Inside the engineering portfolio",
        { exact: true },
      );
      await expect(frame).toBeVisible();
      await expect(
        app.getByRole("heading", {
          name: "Inside the engineering portfolio",
          exact: true,
        }),
      ).toBeFocused();
      await app.getByRole("searchbox").fill("no matching video");
      await expect(frame).toBeVisible();
      await expect(
        app.getByText(
          "Search covers loaded videos. The selected video stays ready above.",
        ),
      ).toBeVisible();
      await app.getByRole("searchbox").fill("");
      await noHorizontalOverflow(page);
      await intactWindowLayout(page);
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-youtube-watch-${viewport.width}.png`,
        animations: "disabled",
      });
      if (touch) {
        await page.setViewportSize({
          width: viewport.height,
          height: viewport.width,
        });
        await expect(frame).toBeVisible();
        await noHorizontalOverflow(page);
      await intactWindowLayout(page);
        await page.setViewportSize(viewport);
      } else {
        // A keyboard user can return to search without a global shortcut stealing other apps' input.
        await app
          .getByRole("heading", {
            name: "Inside the engineering portfolio",
            exact: true,
          })
          .press("/");
        await expect(app.getByRole("searchbox")).toBeFocused();
      }
      await activate(
        app.getByRole("button", {
          name: "Open playlist Learning library",
          exact: true,
        }),
        touch,
      );
      await expect(frame).toBeVisible();
      await expect(
        app.getByRole("button", {
          name: "Watch Cloud architecture walkthrough",
          exact: true,
        }),
      ).toBeVisible();
      await activate(
        app.getByRole("button", {
          name: "Watch Cloud architecture walkthrough",
          exact: true,
        }),
        touch,
      );
      await expect(
        app.getByTitle("YouTube player for Cloud architecture walkthrough"),
      ).toBeVisible();
      await expect(app.locator("iframe")).toHaveCount(1);
      const window = page.locator("#youtube");
      await activate(
        window.getByRole("button", { name: "Window close", exact: true }),
        touch,
      );
      await activate(
        page.getByRole("button", { name: "Applications menu", exact: true }),
        touch,
      );
      const menu = page.getByTestId("whisker-menu-dropdown");
      await menu
        .getByRole("searchbox", { name: "Search applications" })
        .fill("YouTube");
      await activate(
        menu
          .getByTestId("whisker-menu-app-list")
          .getByRole("button", { name: "YouTube", exact: true }),
        touch,
      );
      await expect(app).toBeVisible();
      await activate(app.getByRole("button", { name: /^Watch later/ }), touch);
      await expect(
        app.getByRole("button", {
          name: "Watch Inside the engineering portfolio",
          exact: true,
        }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("the first-visit hint is optional and does not replace the desktop", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#about")).toBeVisible();
  const help = page.getByRole("button", { name: "Desktop tips", exact: true });
  await expect(help).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Using this desktop" }),
  ).toHaveCount(0);
  await help.click();
  await expect(
    page.getByRole("complementary", { name: "Using this desktop" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close desktop tips", exact: true })
    .press("Escape");
  await expect(help).toBeFocused();
  await expect(page.locator("#about")).toBeVisible();
});


test("a fresh visitor opens YouTube from the launcher without enabling network", async ({ page }) => {
  await fixture(page);
  await page.goto("/");
  await expect(page.locator("#about")).toBeVisible();
  await page.getByRole("button", { name: "Applications menu", exact: true }).click();
  const menu = page.getByTestId("whisker-menu-dropdown");
  await menu.getByRole("searchbox", { name: "Search applications" }).fill("YouTube");
  await menu.getByTestId("whisker-menu-app-list")
    .getByRole("button", { name: "YouTube", exact: true }).click();
  const app = page.getByTestId("youtube-app");
  await expect(app.getByRole("button", {
    name: "Watch Inside the engineering portfolio", exact: true,
  })).toBeVisible();
  await expect(app.getByTitle("YouTube player for Inside the engineering portfolio", {
    exact: true,
  })).toBeVisible();
  await expect(app.getByRole("button", { name: "Enable network", exact: true })).toHaveCount(0);
  await expect(app.locator("iframe")).not.toHaveAttribute("src", /autoplay=1/);
});

test("a saved network opt-out survives reload and enabling it persists", async ({ page }) => {
  let youtubeRequests = 0;
  page.on("request", (request) => {
    if (/\/api\/youtube\/|youtube-nocookie\.com\/embed\//.test(request.url())) youtubeRequests += 1;
  });
  await fixture(page);
  await page.goto("/");
  await expect(page.locator("#about")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("allow-network"))).toBe("true");
  await page.evaluate(() => localStorage.setItem("allow-network", "false"));
  await page.goto("/?app=youtube");
  const app = page.getByTestId("youtube-app");
  const enable = app.getByRole("button", { name: "Enable network", exact: true });
  await expect(enable).toBeVisible();
  await page.reload();
  await expect(enable).toBeVisible();
  await expect(app.locator("iframe")).toHaveCount(0);
  expect(youtubeRequests).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("allow-network"))).toBe("false");
  await enable.click();
  await expect(app.getByTitle("YouTube player for Inside the engineering portfolio", {
    exact: true,
  })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("allow-network"))).toBe("true");
  await page.reload();
  await expect(app.getByTitle("YouTube player for Inside the engineering portfolio", {
    exact: true,
  })).toBeVisible();
  await expect(enable).toHaveCount(0);
});
