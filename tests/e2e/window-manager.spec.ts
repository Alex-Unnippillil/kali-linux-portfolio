import { test, expect } from "@playwright/test";

// Regression tests for the standalone window component.
// Verifies layering, dragging, snapping, keyboard navigation and dialog focus.
test.describe("standalone window manager", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/window-manager-test");
  });

  test("z-index, drag, snap, keyboard nav and dialog focus", async ({
    page,
  }) => {
    const win1 = page.locator("#win1");
    const win2 = page.locator("#win2");

    // Initial z-index order then bring second window to front
    const z1 = await win1.evaluate((e) => Number(getComputedStyle(e).zIndex));
    const z2 = await win2.evaluate((e) => Number(getComputedStyle(e).zIndex));
    expect(z1).toBeGreaterThan(z2);
    await win2.click();
    const nz2 = await win2.evaluate((e) => Number(getComputedStyle(e).zIndex));
    expect(nz2).toBeGreaterThan(z1);

    // Drag window2
    const header = win2.locator(".cursor-move");
    const box = await header.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 100, box!.y + 100);
    await page.mouse.up();
    const pos = await win2.evaluate((e) => ({
      left: parseInt(e.style.left),
      top: parseInt(e.style.top),
    }));
    expect(pos.left).toBeGreaterThan(300);

    // Snap to left edge via drag
    await page.mouse.move(box!.x + 100, box!.y + 100);
    await page.mouse.down();
    await page.mouse.move(5, 10);
    await expect(page.locator('[data-testid="snap-preview"]')).toBeVisible();
    await page.mouse.up();
    const snapped = await win2.evaluate((e) => ({
      left: parseInt(e.style.left),
      width: parseInt(e.style.width),
    }));
    const viewport = await page.viewportSize();
    expect(snapped.left).toBe(0);
    expect(snapped.width).toBeCloseTo((viewport!.width ?? 0) / 2, 0);

    // Keyboard navigation via Alt+Tab
    await page.keyboard.down("Alt");
    await page.keyboard.press("Tab");
    await expect(page.locator(".window-switcher-overlay")).toBeVisible();
    await page.keyboard.up("Alt");
    await expect(page.locator(".window-switcher-overlay")).toBeHidden();
    const focusedId = await win2.evaluate(
      (e) =>
        Number(getComputedStyle(e).zIndex) >
        Number(getComputedStyle(document.getElementById("win1")!).zIndex),
    );
    expect(focusedId).toBe(true);

    // Dialog focus retention
    await win1.click();
    await page.locator("#dialog-btn").click();
    const dialog = page.waitForEvent("dialog");
    const dlg = await dialog;
    await dlg.accept();
    const stillFocused = await win1.evaluate(
      (e) => !e.classList.contains("opacity-90"),
    );
    expect(stillFocused).toBe(true);
  });
});
