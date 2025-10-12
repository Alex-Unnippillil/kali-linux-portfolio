/* eslint-env browser */
/* global isBrowser, safeLocalStorage */

const STORAGE_KEY = 'clipboardHistory';
const TEMPLATE_PATH = 'template.html';
const EMPTY_STATE_TEXT = 'Copy text to build your clipboard history.';

const isBrowserEnv = typeof isBrowser !== 'undefined' ? isBrowser : typeof window !== 'undefined';

function parseStoredHistory(rawValue) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse clipboard history from storage:', error);
    return [];
  }
}

function getStorage() {
  if (typeof safeLocalStorage !== 'undefined' && safeLocalStorage) {
    return safeLocalStorage;
  }

  if (typeof window !== 'undefined') {
    return window.localStorage;
  }

  return undefined;
}

function createHistoryItem(text, copyHandler) {
  const item = document.createElement('li');
  item.className = 'clipboard__history-item';
  item.textContent = text;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `Copy “${text}” to the clipboard`);
  item.tabIndex = 0;

  const handleCopy = () => {
    if (typeof copyHandler === 'function') {
      copyHandler(text);
    }
  };

  item.addEventListener('click', handleCopy);
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy();
    }
  });

  return item;
}

function createEmptyState() {
  const empty = document.createElement('li');
  empty.className = 'clipboard__empty';
  empty.dataset.emptyState = 'true';
  empty.setAttribute('role', 'status');
  empty.textContent = EMPTY_STATE_TEXT;
  return empty;
}

async function loadTemplate(target) {
  try {
    const response = await fetch(TEMPLATE_PATH);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const markup = await response.text();
    target.innerHTML = markup;
  } catch (error) {
    console.error('Failed to load clipboard template:', error);
    target.innerHTML = `
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
  }
}

async function bootstrap() {
  if (!isBrowserEnv) {
    return;
  }

  const root = document.getElementById('clipboard-root') ?? document.body;
  await loadTemplate(root);

  const heading = root.querySelector('#clipboard-heading');
  if (heading) {
    heading.textContent = 'Clipboard Manager';
  }

  const description = root.querySelector('.clipboard__description');
  if (description) {
    description.textContent = 'Keep track of everything you copy. Items appear here instantly so you can reuse them.';
  }

  const historyHeading = root.querySelector('#history-heading');
  if (historyHeading) {
    historyHeading.textContent = 'Clipboard history';
  }

  const historyDescription = root.querySelector('.clipboard__history-description');
  if (historyDescription) {
    historyDescription.textContent = 'Select an entry to copy it back to your clipboard.';
  }

  const clearButton = root.querySelector('#clear');
  if (clearButton) {
    clearButton.textContent = 'Clear history';
    clearButton.setAttribute('aria-label', 'Clear clipboard history');
  }

  const list = root.querySelector('#history');
  if (!list) {
    return;
  }

  const storage = getStorage();
  let history = parseStoredHistory(storage?.getItem(STORAGE_KEY));

  const save = () => {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to persist clipboard history:', error);
    }
  };

  const render = () => {
    list.innerHTML = '';

    if (!history.length) {
      list.appendChild(createEmptyState());
      return;
    }

    history.forEach((item) => {
      list.appendChild(
        createHistoryItem(item, async (text) => {
          try {
            await navigator?.clipboard?.writeText?.(text);
          } catch (error) {
            console.error('Failed to copy text:', error);
          }
        }),
      );
    });
  };

  clearButton?.addEventListener('click', () => {
    history = [];
    save();
    render();
  });

  document.addEventListener('copy', async () => {
    try {
      const text = await navigator?.clipboard?.readText?.();
      if (text && (history.length === 0 || history[0] !== text)) {
        history.unshift(text);
        save();
        render();
      }
    } catch (error) {
      console.error('Clipboard read failed:', error);
    }
  });

  render();
}

if (isBrowserEnv) {
  const readyPromise = bootstrap();
  if (typeof window !== 'undefined') {
    window.__clipboardManagerReady = readyPromise;
  }
  globalThis.__clipboardManagerReady = readyPromise;
}
