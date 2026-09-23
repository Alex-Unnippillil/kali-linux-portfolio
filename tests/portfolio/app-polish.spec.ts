import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function openApp(page: Page, title: string, id: string) {
  await page.getByRole("button", { name: "Applications menu", exact: true }).click();
  const menu = page.getByTestId("whisker-menu-dropdown");
  await menu.getByRole("searchbox", { name: "Search applications" }).fill(title);
  await menu.getByTestId("whisker-menu-app-list").getByRole("button", { name: title, exact: true }).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
}
for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`working apps retain input and notes at ${viewport.width}px`, async ({ browser, baseURL, browserName }) => {
    const phone = viewport.width < 640;
    const context = await browser.newContext({
      viewport,
      hasTouch: phone && browserName !== "firefox",
      isMobile: phone && browserName !== "firefox",
      baseURL,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto("/");
      await expect(page.locator("#about")).toBeVisible();
      await openApp(page, "Calculator", "calculator");
      const calc = page.locator("#calculator");
      const display = calc.getByLabel("Calculator display");
      await expect(display).toBeVisible();
      await expect(calc.locator(".calculator")).toHaveAttribute("data-ready", "true");
      await display.fill("6*7");
      await display.press("Enter");
      await expect(display).toHaveValue("42");
      await openApp(page, "Sticky Notes", "sticky_notes");
      const notes = page.locator("#sticky_notes");
      await expect(notes.getByRole("button", { name: "Add Note", exact: true })).toBeEnabled();
      await notes.getByRole("button", { name: "Add Note", exact: true }).click();
      const text = notes.getByRole("textbox", { name: "Note text" });
      await expect(text).toHaveValue("");
      await text.pressSequentially("A copy costs 7 dollars.");
      await expect(text).toHaveValue("A copy costs 7 dollars.");
      await expect(display).toHaveValue("42");
      await expect(notes.getByRole("status")).toHaveText("Saved on this device");
      await notes.getByRole("button", { name: "Delete note", exact: true }).click();
      await notes.getByRole("button", { name: "Undo delete", exact: true }).click();
      await expect(notes.getByRole("textbox", { name: "Note text", exact: true })).toHaveValue("A copy costs 7 dollars.");
      await expect(notes.getByRole("status")).toHaveText("Saved on this device");
      await notes.getByRole("button", { name: "Window close", exact: true }).click();
      await expect(notes).toHaveCount(0);
      await openApp(page, "Sticky Notes", "sticky_notes");
      await expect(notes.getByRole("textbox", { name: "Note text", exact: true })).toHaveValue("A copy costs 7 dollars.");
      if (phone) {
        const bar = page.getByRole("navigation", { name: "Phone taskbar" });
        await expect(bar).toBeVisible();
        await bar.getByRole("button", { name: "Switch to Calculator", exact: true }).click();
        await expect(calc).toHaveAttribute("data-window-state", "compact");
        await calc.getByRole("button", { name: "Window minimize", exact: true }).click();
        await bar.getByRole("button", { name: "Restore Calculator", exact: true }).click();
        await expect(calc).toHaveAttribute("aria-hidden", "false");
        await expect(display).toHaveValue("42");
        await bar.getByRole("button", { name: "Switch to Sticky Notes", exact: true }).click();
        await bar.getByRole("button", { name: "Browse applications", exact: true }).click();
        const launcher = page.getByRole("dialog", { name: "All applications", exact: true });
        await expect(launcher).toBeVisible();
        const search = launcher.getByRole("searchbox", { name: "Search applications", exact: true });
        await expect(search).toBeVisible();
        await search.fill("YouTube");
        await launcher.getByRole("button", { name: "YouTube", exact: true }).first().click();
        await expect(page.getByTestId("youtube-app")).toBeVisible();
        await expect(launcher).toHaveCount(0);
        await bar.getByRole("button", { name: "Switch to Calculator", exact: true }).click();
        await expect(display).toHaveValue("42");
      } else {
        await expect(page.getByRole("navigation", { name: "Phone taskbar" })).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await mkdir("portfolio-screenshots", { recursive: true });
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-polished-apps-${viewport.width}.png`,
        animations: "disabled",
      });
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

for (const state of ["hidden", "inert", "disabled"] as const) {
  test(`launcher Tab boundary excludes ${state} controls`, async ({ page, browserName }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator("#about")).toBeVisible();
    const trigger = page.getByRole("button", { name: "Applications menu", exact: true });
    await trigger.click();
    const menu = page.getByTestId("whisker-menu-dropdown");
    const search = menu.getByRole("searchbox", { name: "Search applications" });
    await expect(search).toBeFocused();

    // Exercise the actual launcher hook with unavailable controls after its last
    // available action. No production-only test route or hook export is needed.
    await menu.evaluate((node, condition) => {
      const fixture = document.createElement("div");
      fixture.dataset.testid = "focus-boundary-fixture";
      const boundary = document.createElement("button");
      boundary.textContent = "Focus boundary action";
      fixture.append(boundary);
      const excluded = document.createElement(condition === "disabled" ? "fieldset" : "div");
      excluded.setAttribute(condition, "");
      const unavailable = document.createElement("button");
      unavailable.textContent = "Unavailable focus target";
      excluded.append(unavailable);
      fixture.append(excluded);
      node.append(fixture);
    }, state);
    const boundary = menu.getByRole("button", { name: "Focus boundary action", exact: true });
    await boundary.focus();
    await expect(boundary).toBeFocused();
    await page.evaluate(() => {
      document.addEventListener("keydown", (event) => {
        document.documentElement.dataset.focusTrapPrevented = String(event.defaultPrevented);
      }, { once: true, capture: true });
    });
    await boundary.press("Tab");
    // The trap must wrap synchronously, not let focus escape and repair it later.
    await expect(page.locator("html")).toHaveAttribute("data-focus-trap-prevented", "true");
    await expect(search).toBeFocused();
    await menu.getByTestId("focus-boundary-fixture").evaluate((node) => node.remove());

    if (state === "hidden") {
      await mkdir("portfolio-screenshots", { recursive: true });
      await page.screenshot({
        path: `portfolio-screenshots/${browserName}-launcher-focus.png`,
        animations: "disabled",
      });
    }
    await search.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}
