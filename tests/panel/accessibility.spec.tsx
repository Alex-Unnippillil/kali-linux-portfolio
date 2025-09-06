import { test, expect } from '@playwright/test';

// Verify panel items support keyboard navigation and themeable focus rings
// with roving tabindex behaviour.
test.describe('panel accessibility', () => {
  test('tab navigation, themeable focus rings and roving tabindex', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <style>
          :root {
            --focus-outline-color: rgb(0, 128, 0);
            --focus-outline-width: 3px;
          }
          button:focus-visible {
            outline: var(--focus-outline-width) solid var(--focus-outline-color);
            outline-offset: 2px;
          }
        </style>
      </head>
      <body>
        <div id="panel">
          <button role="button" aria-label="One">1</button>
          <button role="button" aria-label="Two">2</button>
          <button role="button" aria-label="Three">3</button>
        </div>
        <button id="after" role="button">After</button>
        <script>
          const panel = document.getElementById('panel');
          const items = Array.from(panel.querySelectorAll('button'));
          let index = 0;
          items.forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));
          panel.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              items[index].tabIndex = -1;
              index = (index + 1) % items.length;
              items[index].tabIndex = 0;
              items[index].focus();
              e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              items[index].tabIndex = -1;
              index = (index - 1 + items.length) % items.length;
              items[index].tabIndex = 0;
              items[index].focus();
              e.preventDefault();
            }
          });
        </script>
      </body>
      </html>
    `);

    // Tab into panel and verify first button focused with themeable outline
    await page.keyboard.press('Tab');
    const first = page.getByRole('button', { name: 'One' });
    await expect(first).toBeFocused();
    const outlineColor = await first.evaluate(el => getComputedStyle(el).outlineColor);
    expect(outlineColor).toBe('rgb(0, 128, 0)');

    // Roving tabindex via arrow keys
    await page.keyboard.press('ArrowRight');
    const second = page.getByRole('button', { name: 'Two' });
    await expect(second).toBeFocused();

    // Tab should leave panel to the button after it
    await page.keyboard.press('Tab');
    const after = page.getByRole('button', { name: 'After' });
    await expect(after).toBeFocused();
  });
});

