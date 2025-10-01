import { test, expect, type Locator, type Page } from '@playwright/test';

const storyUrl = (storyId: string) => `iframe.html?globals=&id=${storyId}`;
const stories = {
  default: 'ui-volume-control--default',
} as const;

const expectSliderValue = async (slider: Locator, value: number) => {
  await expect(slider).toHaveAttribute('aria-valuenow', String(value));
};

const waitForStoryReady = async (page: Page) => {
  const toggle = page.getByTestId('volume-control-toggle');
  await expect(toggle).toBeVisible();
  return { toggle } as const;
};

test.describe('VolumeControl stories', () => {
  test('OpensAndAdjusts flow mirrors mouse interactions', async ({ page }) => {
    await page.goto(storyUrl(stories.default));
    const { toggle } = await waitForStoryReady(page);

    await toggle.click();
    const slider = page.getByTestId('volume-control-slider');
    await expect(slider).toBeVisible();
    await expect(slider).toBeFocused();
    await expectSliderValue(slider, 70);

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expectSliderValue(slider, 68);

    await page.keyboard.press('Escape');
    await expect(slider).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('KeyboardOnlyFlow keeps focus and updates value', async ({ page }) => {
    await page.goto(storyUrl(stories.default));
    const { toggle } = await waitForStoryReady(page);

    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Enter');
    const slider = page.getByTestId('volume-control-slider');
    await expect(slider).toBeVisible();
    await expect(slider).toBeFocused();

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expectSliderValue(slider, 72);

    await page.keyboard.press('Escape');
    await expect(slider).toBeHidden();
  });
});
