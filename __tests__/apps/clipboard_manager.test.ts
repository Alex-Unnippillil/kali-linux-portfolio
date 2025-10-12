import '@testing-library/jest-dom';

declare global {
  // eslint-disable-next-line no-var
  var safeLocalStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  } | undefined;
  // eslint-disable-next-line no-var
  var __clipboardManagerReady: Promise<void> | undefined;
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('clipboard manager template', () => {
  const originalNavigator = global.navigator;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '<div id="clipboard-root"></div>';

    const storage = new Map<string, string>();
    globalThis.safeLocalStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };

    (globalThis as typeof globalThis & { isBrowser?: boolean }).isBrowser = true;

    const templateMarkup = `
      <section class="clipboard" aria-labelledby="clipboard-heading">
        <header class="clipboard__header">
          <h1 id="clipboard-heading"></h1>
          <p class="clipboard__description"></p>
        </header>
        <button id="clear" class="clipboard__clear" type="button"></button>
        <section class="clipboard__history-section" aria-labelledby="history-heading">
          <h2 id="history-heading"></h2>
          <p class="clipboard__history-description"></p>
          <ul id="history" class="clipboard__history" aria-live="polite"></ul>
        </section>
      </section>
    `;

    (globalThis as typeof globalThis & { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        text: async () => templateMarkup,
      });

    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          readText: jest.fn().mockResolvedValue('First copy'),
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete globalThis.safeLocalStorage;
    delete (globalThis as typeof globalThis & { isBrowser?: boolean }).isBrowser;
    delete (globalThis as typeof globalThis & { __clipboardManagerReady?: Promise<void> }).__clipboardManagerReady;

    if (originalFetch) {
      (globalThis as typeof globalThis & { fetch: typeof originalFetch }).fetch = originalFetch;
    } else {
      delete (globalThis as typeof globalThis & { fetch?: unknown }).fetch;
    }

    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('renders an empty state and clears it when history is populated', async () => {
    // eslint-disable-next-line global-require
    require('../../apps/clipboard_manager/main.js');
    await flushPromises();
    await globalThis.__clipboardManagerReady;

    const list = document.getElementById('history');
    expect(list).toBeInTheDocument();
    if (!list) {
      throw new Error('History list did not render');
    }

    const emptyState = list.querySelector('[data-empty-state="true"]');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('Copy text to build your clipboard history.');

    document.dispatchEvent(new Event('copy'));
    await flushPromises();

    const historyItems = list.querySelectorAll('.clipboard__history-item');
    expect(historyItems).toHaveLength(1);
    expect(historyItems[0]).toHaveTextContent('First copy');
    expect(list.querySelector('[data-empty-state]')).not.toBeInTheDocument();
  });
});
