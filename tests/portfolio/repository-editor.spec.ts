import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, readFile } from "node:fs/promises";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`native repository editor works without embeds at ${viewport.width}x${viewport.height}`, async ({
    browser,
    browserName,
    baseURL,
  }) => {
    const touch = viewport.width < 1000 && browserName !== "firefox";
    const context = await browser.newContext({
      baseURL,
      viewport,
      hasTouch: touch,
      isMobile: touch,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    const external: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (
        /stackblitz|vscode\.dev|cdn\.jsdelivr\.net.*monaco/.test(request.url())
      )
        external.push(request.url());
    });
    try {
      await page.goto("/?app=vscode");
      const app = page.getByTestId("repository-editor");
      await expect(app).toBeVisible();
      await expect(app.locator(".monaco-editor")).toBeVisible();
      await expect(
        app
          .getByRole("status", { name: "" })
          .filter({ hasText: "Opening README.md" }),
      ).toHaveCount(0);
      await expect(app.locator(".view-lines")).toContainText("Kali");
      await expect(app.locator("iframe")).toHaveCount(0);
      await expect(
        app.getByText(/Enable network|Open in StackBlitz/),
      ).toHaveCount(0);
      await app.getByRole("button", { name: "Quick Open files" }).click();
      const picker = app.getByRole("combobox", {
        name: "Quick Open file name",
      });
      await picker.fill("package.json");
      await picker.press("Enter");
      await expect(app.locator(".view-lines")).toContainText("unnippillil");
      // The code is the build's actual tracked package.json, not a demonstration string.
      const download = page.waitForEvent("download");
      await app.getByRole("button", { name: "Download current file" }).click();
      const downloaded = await download;
      expect(await readFile((await downloaded.path())!, "utf8")).toBe(
        await readFile("package.json", "utf8"),
      );
      await app.getByRole("button", { name: "Find in current file" }).click();
      await expect(app.locator(".find-widget")).toBeVisible();
      await page.keyboard.press("Escape");
      const input = app.locator(".monaco-editor textarea.inputarea");
      await input.focus();
      await input.press("Control+Home");
      await page.keyboard.insertText("// local editor test\n");
      await expect(
        app.getByRole("button", { name: "Local changes, 1 files" }),
      ).toBeVisible();
      await input.press("Control+z");
      await expect(
        app.getByRole("button", { name: "Local changes, 0 files" }),
      ).toBeVisible();
      await app.getByRole("button", { name: "Toggle word wrap" }).click();
      await expect(
        app.getByRole("button", { name: "Toggle word wrap" }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect
        .poll(() =>
          app.evaluate(
            (node) =>
              node.scrollWidth <= node.clientWidth + 1 &&
              document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        )
        .toBe(true);
      await mkdir("portfolio-screenshots", { recursive: true });
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-repository-${viewport.width}x${viewport.height}.png`,
        animations: "disabled",
      });
      const results = await new AxeBuilder({ page })
        .include('[data-testid="repository-editor"]')
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page
        .locator("#vscode")
        .getByRole("button", { name: "Window close", exact: true })
        .click();
      await expect(app).toHaveCount(0);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
test("standalone editor recovers a failed source file without an iframe", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/showcase/repository/files/*.json", async (route) => {
    if (failed) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto("/apps/vscode");
  const app = page.getByTestId("repository-editor");
  await expect(app.getByRole("alert")).toContainText(
    "This file could not be loaded",
  );
  failed = false;
  await app.getByRole("button", { name: "Retry" }).click();
  await expect(app.locator(".view-lines")).toContainText("Kali");
  await expect(app.getByRole("alert")).toHaveCount(0);
});
