import { test, expect, type Page, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

const WORKSPACE = "kali:workspace-preferences:v1";
const PROFILES = "kali:settings-profiles:v1";
const categories = [
  ["home", "Overview"],
  ["appearance", "Personalization"],
  ["display", "Display & accessibility"],
  ["input", "Input & shortcuts"],
  ["sound", "Sound & feedback"],
  ["privacy", "Privacy & network"],
  ["profiles", "Profiles & backup"],
  ["system", "System"],
] as const;

test.use({ locale: "en-US", timezoneId: "UTC" });

async function ready(page: Page) {
  const app = page.getByTestId("settings-center");
  await expect(app).toBeVisible();
  await expect(app.getByRole("slider", { name: "App volume", exact: true })).toBeEnabled();
  return app;
}
async function category(app: Locator, id: typeof categories[number][0]) {
  const title = categories.find(([value]) => value === id)![1];
  const phone = app.getByRole("combobox", { name: "Settings category" });
  if (await phone.isVisible()) await phone.selectOption(id);
  else await app.getByRole("navigation", { name: "Settings categories" }).getByRole("button", { name: title, exact: true }).click();
  await expect(app.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}
async function range(app: Locator, name: string, value: number) {
  const slider = app.getByRole("slider", { name, exact: true });
  const minimum = Number(await slider.getAttribute("min"));
  const step = Number(await slider.getAttribute("step") || 1);
  await slider.press("Home");
  for (let index = 0; index < Math.round((value - minimum) / step); index++) {
    await slider.press("ArrowRight");
  }
  await expect(slider).toHaveValue(String(value));
}
async function screenshot(page: Page, browserName: string, name: string) {
  await mkdir("portfolio-screenshots", { recursive: true });
  await page.screenshot({ path: `portfolio-screenshots/${browserName}-settings-${name}.png`, animations: "disabled" });
}
async function noOverflow(app: Locator) {
  expect(await app.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await app.page().evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("Settings search, personalization, undo and display scaling persist across reopening", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/apps/settings");
  const app = await ready(page);
  await screenshot(page, browserName, "overview-desktop");
  await category(app, "appearance");
  await app.getByRole("radio", { name: "Midnight", exact: true }).check();
  await app.getByRole("radio", { name: "Violet", exact: true }).check();
  await app.getByRole("button", { name: "Forest light", exact: true }).click();
  await app.getByRole("radio", { name: "Fit", exact: true }).check();
  await range(app, "Wallpaper dimming", 35);
  await screenshot(page, browserName, "personalization-desktop");
  const search = app.getByRole("searchbox", { name: "Search settings" });
  await search.fill("background brightness");
  await app.getByRole("button", { name: /Wallpaper dimming/ }).click();
  await expect(app.getByRole("slider", { name: "Wallpaper dimming" })).toBeFocused();
  await app.getByRole("slider", { name: "Wallpaper dimming" }).press("ControlOrMeta+f");
  await expect(search).toBeFocused();
  await search.fill("no-such-preference");
  await expect(app.getByText("No settings found", { exact: true })).toBeVisible();
  await search.press("Escape");
  await expect(search).toHaveValue("");
  await category(app, "display");
  await range(app, "Text size", 150);
  await expect(page.locator("html")).toHaveCSS("font-size", "24px");
  await app.getByRole("radio", { name: "Compact", exact: true }).check();
  await expect(app).toHaveAttribute("data-density", "compact");
  const motion = app.getByRole("switch", { name: "Reduce motion", exact: true });
  await motion.click();
  await expect(motion).toBeChecked();
  await app.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(motion).not.toBeChecked();
  await noOverflow(app);
  await screenshot(page, browserName, "display-150-percent");
  await page.reload();
  await ready(page);
  await category(app, "appearance");
  await expect(app.getByRole("radio", { name: "Midnight", exact: true })).toBeChecked();
  await expect(app.getByRole("radio", { name: "Violet", exact: true })).toBeChecked();
  await expect(app.getByRole("button", { name: "Forest light", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(app.getByRole("radio", { name: "Fit", exact: true })).toBeChecked();
  await expect(app.getByRole("slider", { name: "Wallpaper dimming" })).toHaveValue("35");
  await category(app, "display");
  await expect(app.getByRole("slider", { name: "Text size" })).toHaveValue("150");
  await expect(app.getByRole("radio", { name: "Compact", exact: true })).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("allow-network"))).toBe("false");
});

test("profiles, portable backups and reset are reviewed, persistent and preserve unrelated app data", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/apps/settings");
  const app = await ready(page);
  await range(app, "App volume", 37);
  await page.evaluate(() => {
    localStorage.setItem("notes-test", "Do not delete my draft");
    localStorage.setItem("youtube:watch-later", '["saved-video"]');
  });
  await category(app, "profiles");
  await app.getByRole("textbox", { name: "Profile name", exact: true }).fill("Desk setup");
  await app.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(app.getByRole("button", { name: "Apply Desk setup", exact: true })).toBeVisible();
  await app.getByRole("button", { name: "Rename Desk setup", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Profile name", exact: true }).fill("Evening workspace");
  await dialog.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await category(app, "home");
  await range(app, "App volume", 68);
  await category(app, "profiles");
  const apply = app.getByRole("button", { name: "Apply Evening workspace", exact: true });
  await apply.click();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("volume"))).toBe("68");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(apply).toBeFocused();
  await apply.click();
  await dialog.getByRole("button", { name: "Apply changes", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("volume"))).toBe("37");

  const input = app.getByLabel("Import settings file");
  const upload = (text: string) => input.setInputFiles({ name: "preferences.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await upload('{"volume":11,"fontScale":100}');
  await expect(app.getByRole("alert")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("volume"))).toBe("37");
  await upload(" ".repeat(65537));
  await expect(app.getByRole("alert")).toContainText("64 KB");
  await upload(JSON.stringify({ kind: "kali-desktop-settings", version: 1, settings: { volume: 22, wallpaperDim: 45, allowNetwork: true } }));
  await expect(dialog).toHaveAccessibleName("Review imported preferences");
  expect(await page.evaluate(() => localStorage.getItem("volume"))).toBe("37");
  // Every tab stop stays inside the native modal; its background cannot receive focus.
  await dialog.getByRole("button", { name: "Apply changes", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  await screenshot(page, browserName, "import-review");
  await dialog.getByRole("button", { name: "Apply changes", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("volume"))).toBe("22");
  expect(await page.evaluate(() => localStorage.getItem("allow-network"))).toBe("false");
  const downloading = page.waitForEvent("download");
  await app.getByRole("button", { name: /^Export preferences/ }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The configuration backup could not be read");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(backup).toMatchObject({ kind: "kali-desktop-settings", version: 1, settings: { volume: 22, wallpaperDim: 45 } });
  expect(backup.settings).not.toHaveProperty("allowNetwork");
  expect(JSON.stringify(backup)).not.toContain("Do not delete my draft");
  await app.getByRole("button", { name: "Reset preferences…", exact: true }).click();
  await dialog.getByRole("button", { name: "Reset preferences", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("volume"))).toBe("100");
  expect(await page.evaluate(() => [localStorage.getItem("notes-test"), localStorage.getItem("youtube:watch-later")])).toEqual(["Do not delete my draft", '["saved-video"]']);
  await page.reload();
  await ready(page);
  await category(app, "profiles");
  await expect(app.getByRole("button", { name: "Apply Evening workspace", exact: true })).toBeVisible();
  await app.getByRole("button", { name: "Delete Evening workspace", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(app.getByRole("button", { name: "Apply Evening workspace", exact: true })).toBeVisible();
  await app.getByRole("button", { name: "Delete Evening workspace", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete profile", exact: true }).click();
  await expect(app.getByRole("button", { name: "Apply Evening workspace", exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}").profiles, PROFILES)).toEqual([]);
});

test("phone settings categories remain readable, accessible and contained through text scaling and rotation", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apps/settings");
  const app = await ready(page);
  await expect(app.getByRole("combobox", { name: "Settings category" })).toBeVisible();
  await screenshot(page, browserName, "overview-phone");
  for (const [id] of categories) {
    await category(app, id);
    await noOverflow(app);
  }
  await category(app, "input");
  await app.getByRole("switch", { name: "Larger click targets", exact: true }).click();
  await app.getByRole("switch", { name: "Stronger keyboard focus", exact: true }).click();
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="settings-center"]').withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await category(app, "display");
  await range(app, "Text size", 150);
  await app.getByRole("radio", { name: "Compact", exact: true }).check();
  await noOverflow(app);
  await screenshot(page, browserName, "display-phone-large-text");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(app.getByRole("heading", { level: 1, name: "Display & accessibility", exact: true })).toBeVisible();
  await noOverflow(app);
  await category(app, "profiles");
  await app.getByRole("button", { name: "Reset preferences…", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await screenshot(page, browserName, "reset-landscape");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("desktop settings affect real wallpaper, global focus and panels, and clock ticks preserve calendar navigation", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.clock.install({ time: new Date("2026-09-22T13:04:05Z") });
  await page.goto("/");
  await expect(page.locator("#about")).toBeVisible();
  await page.getByRole("button", { name: "Applications menu", exact: true }).click();
  const menu = page.getByTestId("whisker-menu-dropdown");
  await menu.getByRole("searchbox", { name: "Search applications" }).fill("Settings");
  await menu.getByTestId("whisker-menu-app-list").getByRole("button", { name: "Settings", exact: true }).click();
  const app = await ready(page);
  const win = page.locator("#settings");
  await expect(win).toBeVisible();
  await category(app, "appearance");
  await range(app, "Wallpaper dimming", 40);
  await expect(page.getByTestId("wallpaper-dimming").first()).toHaveCSS("opacity", "0.4");
  await category(app, "display");
  await app.getByRole("switch", { name: "Reduce transparency", exact: true }).click();
  const navbar = page.locator(".main-navbar-vp");
  await expect(navbar).toHaveCSS("backdrop-filter", "none");
  expect(await navbar.evaluate(el => getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(/);
  await category(app, "input");
  await app.getByRole("switch", { name: "Stronger keyboard focus", exact: true }).click();
  await category(app, "system");
  await app.getByRole("switch", { name: "Show seconds", exact: true }).click();
  const clock = navbar.locator('button[aria-haspopup="dialog"][aria-controls$="-popover"]');
  await expect(clock).toHaveCount(1);
  await app.getByRole("radio", { name: "24-hour", exact: true }).check();
  await expect(clock).toContainText("13:04:");
  await app.getByRole("radio", { name: "Automatic", exact: true }).check();
  await expect(clock).toContainText("01:04:");
  await expect(clock).toContainText("PM");
  // Close Settings: the accessibility effects must continue outside this app.
  await win.getByRole("button", { name: "Window close", exact: true }).click();
  await expect(app).toHaveCount(0);
  await page.keyboard.press("Tab");
  const launcher = page.getByRole("button", { name: "Applications menu", exact: true });
  await launcher.focus();
  await expect(launcher).toHaveCSS("outline-width", "3px");
  await clock.click();
  const calendar = page.getByRole("dialog", { name: "Calendar", exact: true });
  await expect(calendar).toBeVisible();
  await expect(calendar).toHaveCSS("backdrop-filter", "none");
  const selectedDay = calendar.getByRole("grid").locator('button[tabindex="0"]');
  await expect(selectedDay).toBeFocused();
  await selectedDay.press("PageDown");
  await expect(calendar.getByRole("grid", { name: "October 2026", exact: true })).toBeVisible();
  const selectedDate = await selectedDay.getAttribute("aria-label");
  const previousTime = await clock.innerText();
  await expect.poll(() => clock.innerText()).not.toBe(previousTime);
  await expect(calendar.getByRole("grid", { name: "October 2026", exact: true })).toBeVisible();
  await expect(selectedDay).toBeFocused();
  expect(await selectedDay.getAttribute("aria-label")).toBe(selectedDate);
  await calendar.getByRole("button", { name: "Next month", exact: true }).click();
  const nextTime = await clock.innerText();
  await expect.poll(() => clock.innerText()).not.toBe(nextTime);
  await expect(calendar.getByRole("grid", { name: "November 2026", exact: true })).toBeVisible();
  await screenshot(page, browserName, "desktop-accessibility-calendar");
  await page.keyboard.press("Escape");
  await expect(calendar).toHaveCount(0);
  await expect(clock).toBeFocused();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), WORKSPACE)).toMatchObject({ wallpaperDim: 40, clockFormat: "system", showSeconds: true, reduceTransparency: true, strongFocus: true });
});
