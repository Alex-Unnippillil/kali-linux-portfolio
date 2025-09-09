import { test, expect } from '@playwright/test';

const SIZES = [24, 28, 32];

test.describe('panel sizing', () => {
  for (const size of SIZES) {
    test(`icon size does not exceed row height at ${size}px`, async ({ page }) => {
      await page.setContent(`
        <style>
          #panel { display:flex; height:${size}px; overflow:hidden; }
          #panel .icon { width:${size}px; height:${size}px; flex:0 0 auto; }
        </style>
        <div id="panel">
          <div class="icon"></div>
          <div class="icon"></div>
          <div class="icon"></div>
        </div>
      `);

      const rowHeight = await page.locator('#panel').evaluate(el => el.clientHeight);
      const iconHeights = await page.locator('#panel .icon').evaluateAll(nodes => nodes.map(n => n.clientHeight));
      for (const h of iconHeights) {
        expect(h).toBeLessThanOrEqual(rowHeight);
      }
    });
  }

  test('overflow reveals chevron menu', async ({ page }) => {
      const size = SIZES[0]!;
    await page.setContent(`
      <style>
        #panel { width:${size * 3}px; height:${size}px; display:flex; overflow:hidden; }
        #panel .icon { width:${size}px; height:${size}px; flex:0 0 auto; }
        #chevron { width:${size}px; height:${size}px; display:none; }
      </style>
      <div id="panel">
        <div class="icon"></div>
        <div class="icon"></div>
        <div class="icon"></div>
        <div class="icon"></div>
        <div id="chevron">⌄</div>
      </div>
      <script>
        const panel = document.getElementById('panel');
        const chev = document.getElementById('chevron');
        if (panel.scrollWidth > panel.clientWidth) {
          chev.style.display = 'block';
        }
      </script>
    `);

    const panel = page.locator('#panel');
    const overflow = await panel.evaluate(el => el.scrollWidth > el.clientWidth);
    expect(overflow).toBeTruthy();
    await expect(page.locator('#chevron')).toBeVisible();
  });
});
