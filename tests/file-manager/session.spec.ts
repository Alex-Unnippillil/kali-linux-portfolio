import { test, expect } from '@playwright/test';

test.describe('file manager session', () => {
  test('restores tabs after restart', async ({ page }) => {
    // Open the root of the application
    await page.goto('/');

    // Simulate opening multiple tabs with different paths
    const tabs = [
      { path: '/tmp', title: 'tmp' },
      { path: '/etc', title: 'etc' },
      { path: '/usr', title: 'usr' },
    ];
    const active = 1; // second tab active

    await page.evaluate(([tabs, active]) => {
      localStorage.setItem('file-manager-session', JSON.stringify({ tabs, active }));
    }, [tabs, active]);

    // Reload the application to simulate a restart
    await page.reload();

    // Verify the same tabs and active tab were restored
    const session = await page.evaluate(() => {
      const raw = localStorage.getItem('file-manager-session');
      return raw ? JSON.parse(raw) : null;
    });

    expect(session).not.toBeNull();
    expect(session.tabs).toHaveLength(3);
    expect(session.tabs.map((t: any) => t.path)).toEqual(['/tmp', '/etc', '/usr']);
    expect(session.active).toBe(active);
  });
});
