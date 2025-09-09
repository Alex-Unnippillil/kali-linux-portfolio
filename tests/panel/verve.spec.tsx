import { test, expect } from '@playwright/test';

test.describe('Verve command panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`
      <textarea id="cmd"></textarea>
      <div id="output"></div>
      <script>
        const input = document.getElementById('cmd');
        const output = document.getElementById('output');
        const history = [];
        let idx = history.length;
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) {
              e.preventDefault();
              const start = input.selectionStart;
              const end = input.selectionEnd;
              input.value = input.value.slice(0, start) + '\n' + input.value.slice(end);
              input.selectionStart = input.selectionEnd = start + 1;
            } else {
              e.preventDefault();
              const cmd = input.value.trim();
              if (cmd) {
                history.push(cmd);
                if (history.length > 20) history.shift();
                output.textContent += cmd + '\n';
              }
              input.value = '';
              idx = history.length;
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length) {
              idx = (idx - 1 + history.length) % history.length;
              input.value = history[idx];
            }
          }
        });
        window.__history = history;
      <\/script>
    `);
    await page.focus('#cmd');
  });

  test('retains only last 20 commands', async ({ page }) => {
    for (let i = 1; i <= 25; i++) {
      await page.type('#cmd', `cmd${i}`);
      await page.keyboard.press('Enter');
    }
      const history = await page.evaluate(() => (window as any).__history);
    expect(history.length).toBe(20);
    expect(history[0]).toBe('cmd6');
    expect(history[19]).toBe('cmd25');
  });

  test('ArrowUp cycles through history', async ({ page }) => {
    for (const cmd of ['one', 'two', 'three']) {
      await page.type('#cmd', cmd);
      await page.keyboard.press('Enter');
    }
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#cmd')).toHaveValue('three');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#cmd')).toHaveValue('two');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#cmd')).toHaveValue('one');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#cmd')).toHaveValue('three');
  });

  test('Shift+Enter keeps focus and Enter runs command', async ({ page }) => {
    await page.type('#cmd', 'hello');
    await page.keyboard.press('Shift+Enter');
    await expect(page.locator('#cmd')).toHaveValue('hello\n');
      let active = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.id || '',
      );
    expect(active).toBe('cmd');
    await page.keyboard.press('Enter');
    await expect(page.locator('#output')).toContainText('hello');
    await expect(page.locator('#cmd')).toHaveValue('');
      active = await page.evaluate(
        () => (document.activeElement as HTMLElement | null)?.id || '',
      );
    expect(active).toBe('cmd');
  });
});
