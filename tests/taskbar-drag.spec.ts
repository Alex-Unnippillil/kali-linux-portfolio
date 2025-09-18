import { test, expect, Page } from '@playwright/test';

async function dispatchDragEvent(page: Page, selector: string, type: 'dragstart' | 'dragenter' | 'dragleave' | 'dragend', options: { relatedSelector?: string } = {}) {
  await page.evaluate(({ targetSelector, eventType, relatedSelector }) => {
    const target = document.querySelector(targetSelector);
    if (!target) {
      throw new Error(`Element not found for selector: ${targetSelector}`);
    }
    const dataTransfer = new DataTransfer();
    const eventInit: DragEventInit = {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    };
    if (relatedSelector) {
      const relatedTarget = document.querySelector(relatedSelector) ?? null;
      if (relatedTarget) {
        eventInit.relatedTarget = relatedTarget as EventTarget;
      }
    }
    const dragEvent = new DragEvent(eventType, eventInit);
    target.dispatchEvent(dragEvent);
  }, { targetSelector: selector, eventType: type, relatedSelector: options.relatedSelector });
}

async function prepareDesktop(page: Page) {
  await page.goto('/');
  await page.waitForSelector('#desktop');
  const terminalIcon = page.locator('#app-terminal');
  await terminalIcon.waitFor();
  await terminalIcon.dblclick();
  await page.locator('#terminal').waitFor();
  await page.locator('#terminal').click();
  await expect(page.locator('#terminal')).toHaveClass(/z-30/);
  await expect(page.locator('#about-alex')).not.toHaveClass(/z-30/);
}

test.describe('taskbar drag hover focus', () => {
  test('focuses hovered window after delay and restores origin when leaving', async ({ page }) => {
    await prepareDesktop(page);
    const taskbarButton = page.locator('button[data-app-id="about-alex"]');
    await taskbarButton.waitFor();

    await dispatchDragEvent(page, '#app-terminal', 'dragstart');
    await dispatchDragEvent(page, 'button[data-app-id="about-alex"]', 'dragenter');

    await page.waitForTimeout(400);

    await expect(page.locator('#about-alex')).toHaveClass(/z-30/);
    await expect(page.locator('#terminal')).not.toHaveClass(/z-30/);
    await expect(taskbarButton).toHaveAttribute('aria-description', /window raised while dragging/i);

    await dispatchDragEvent(page, 'button[data-app-id="about-alex"]', 'dragleave', { relatedSelector: '#desktop' });

    await expect(page.locator('#terminal')).toHaveClass(/z-30/);
    await expect(taskbarButton).toHaveAttribute('aria-description', /drag over and hold/i);

    await dispatchDragEvent(page, '#app-terminal', 'dragend');
  });

  test('does not raise windows when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareDesktop(page);
    const taskbarButton = page.locator('button[data-app-id="about-alex"]');
    await taskbarButton.waitFor();

    await dispatchDragEvent(page, '#app-terminal', 'dragstart');
    await dispatchDragEvent(page, 'button[data-app-id="about-alex"]', 'dragenter');

    await page.waitForTimeout(400);

    await expect(page.locator('#about-alex')).not.toHaveClass(/z-30/);
    await expect(page.locator('#terminal')).toHaveClass(/z-30/);
    await expect(taskbarButton).toHaveAttribute('aria-description', /auto-raise is disabled/i);

    await dispatchDragEvent(page, 'button[data-app-id="about-alex"]', 'dragleave', { relatedSelector: '#desktop' });
    await dispatchDragEvent(page, '#app-terminal', 'dragend');
  });
});
