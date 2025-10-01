import 'fake-indexeddb/auto';

declare global {
  // eslint-disable-next-line no-var
  var crypto: Crypto;
}

beforeAll(() => {
  if (typeof globalThis.crypto === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    globalThis.crypto = require('crypto').webcrypto as Crypto;
  }
});

beforeEach(async () => {
  const { clearShortcutDataForTests } = await import('../services/mru/store');
  await clearShortcutDataForTests();
});

afterEach(() => {
  jest.resetModules();
});

test('records usage updates shortcut ordering', async () => {
  const store = await import('../services/mru/store');
  await store.recordShortcutUsage('2048');
  const entries = await store.getTopShortcuts(4);
  expect(entries.some((entry) => entry.id === '2048')).toBe(true);
  expect(entries[0].pinned).toBe(true);
});

test('new sessions retain pinned shortcuts without reinstall', async () => {
  const store = await import('../services/mru/store');
  await store.setShortcutPinned('sticky_notes', true);
  jest.resetModules();
  const reloaded = await import('../services/mru/store');
  const entries = await reloaded.getTopShortcuts(4);
  const pinnedNote = entries.find((entry) => entry.id === 'sticky_notes');
  expect(pinnedNote).toBeDefined();
  expect(pinnedNote?.pinned).toBe(true);
});
