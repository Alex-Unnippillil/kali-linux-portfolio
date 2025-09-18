import { test, expect } from '@playwright/test';

test('file explorer supports repeated keyboard selection', async ({ page }) => {
  await page.addInitScript(() => {
    const createFile = (name: string) => ({
      kind: 'file',
      name,
      move: async () => {},
      getFile: async () => ({
        name,
        text: async () => '',
      }),
    });

    const createDir = (name: string, children: any[] = []) => ({
      kind: 'directory',
      name,
      move: async () => {},
      entries() {
        const items = children.map((child) => [child.name, child]);
        return {
          async *[Symbol.asyncIterator]() {
            for (const item of items) {
              yield item;
            }
          },
        };
      },
    });

    const directories = [createDir('alpha'), createDir('beta'), createDir('gamma')];
    const files = [
      createFile('notes.txt'),
      createFile('omega.md'),
      createFile('zeta.log'),
      createFile('tasks.json'),
    ];
    const rootHandle = createDir('root', [...directories, ...files]);

    (window as any).showDirectoryPicker = async () => rootHandle;
  });

  await page.goto('/apps/file-explorer');
  await page.getByRole('button', { name: 'Open Folder' }).click();

  const tree = page.getByTestId('file-explorer-tree');
  await expect(tree.getByRole('treeitem', { name: 'alpha' })).toBeVisible();

  await tree.getByRole('treeitem', { name: 'alpha' }).click();
  await tree.focus();

  const operations = 50;
  for (let i = 0; i < operations; i += 1) {
    await tree.press('ArrowDown');
  }

  const itemNames = await tree.getByRole('treeitem').allTextContents();
  expect(itemNames.length).toBeGreaterThan(0);
  const finalExpected = itemNames[itemNames.length - 1]?.trim() ?? '';

  await expect.poll(async () => {
    const selected = await tree
      .locator('[role="treeitem"][aria-selected="true"]')
      .allTextContents();
    return selected.map((text) => text.trim()).join(',');
  }).toBe(finalExpected);
});
