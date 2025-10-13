/* eslint-env browser */

const DB_NAME = 'clipboardManager';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const LEGACY_HISTORY_KEY = 'clipboardHistory';
const QUEUE_STORAGE_KEY = 'clipboardQueue';
const MAX_HISTORY_ENTRIES = 5000;

const globalScope =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof self !== 'undefined'
    ? self
    : undefined;

const canUseBrowser =
  typeof globalScope !== 'undefined' &&
  'document' in globalScope &&
  (typeof isBrowser === 'undefined' || isBrowser);

if (canUseBrowser) {
  const storage =
    typeof safeLocalStorage !== 'undefined' && safeLocalStorage
      ? safeLocalStorage
      : globalScope?.localStorage ?? null;
  const supportsIndexedDB = typeof indexedDB !== 'undefined';

  const timestampFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  class ClipboardHistoryStore {
    constructor(options = {}) {
      this.dbName = options.dbName || DB_NAME;
      this.storeName = options.storeName || STORE_NAME;
      this.version = options.version || DB_VERSION;
      this.maxEntries = options.maxEntries || MAX_HISTORY_ENTRIES;
      this.storage = options.storage ?? null;
      this.cache = [];
      this.dbPromise = null;
      this.fallback = !supportsIndexedDB;
    }

    async init() {
      if (this.fallback) {
        this.cache = this.loadFromStorage();
        this.sortCache();
        return this.cache;
      }

      this.dbPromise = this.dbPromise || openDatabase(this.dbName, this.version, this.storeName);
      const db = await this.dbPromise;
      this.cache = await this.readAll(db);

      if (!this.cache.length) {
        const legacy = this.loadLegacyFromStorage();
        if (legacy.length) {
          for (const legacyEntry of legacy) {
            await this.add(legacyEntry.text);
          }
          this.cache = await this.readAll(db);
          if (this.storage) {
            this.storage.removeItem(LEGACY_HISTORY_KEY);
          }
        }
      }

      this.cache.forEach((entry) => {
        entry.textLower = entry.textLower || entry.text.toLowerCase();
        entry.pinned = Boolean(entry.pinned);
      });
      this.sortCache();
      return this.cache;
    }

    loadLegacyFromStorage() {
      if (!this.storage) {
        return [];
      }
      try {
        const raw = this.storage.getItem(LEGACY_HISTORY_KEY);
        if (!raw) {
          return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) {
          return [];
        }
        if (typeof parsed[0] === 'string') {
          return parsed
            .filter((text) => typeof text === 'string' && text.trim().length > 0)
            .map((text) => ({
              text: text.trim(),
            }));
        }
        return parsed
          .map((entry) => {
            if (!entry || typeof entry.text !== 'string') {
              return null;
            }
            return {
              text: entry.text.trim(),
            };
          })
          .filter((entry) => entry && entry.text.length > 0);
      } catch (error) {
        console.error('Failed to parse legacy clipboard history from storage', error);
        return [];
      }
    }

    loadFromStorage() {
      if (!this.storage) {
        return [];
      }
      try {
        const raw = this.storage.getItem(LEGACY_HISTORY_KEY);
        if (!raw) {
          return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return [];
        }
        if (!parsed.length) {
          return [];
        }
        if (typeof parsed[0] === 'string') {
          const now = Date.now();
          return parsed
            .filter((text) => typeof text === 'string' && text.trim().length > 0)
            .map((text, index) => {
              const normalized = text.trim();
              return {
                id: index + 1,
                text: normalized,
                textLower: normalized.toLowerCase(),
                timestamp: now - index,
                pinned: false,
              };
            });
        }
        return parsed
          .map((entry, index) => {
            if (typeof entry === 'string') {
              const normalized = entry.trim();
              return {
                id: index + 1,
                text: normalized,
                textLower: normalized.toLowerCase(),
                timestamp: Date.now() - index,
                pinned: false,
              };
            }
            if (!entry || typeof entry.text !== 'string') {
              return null;
            }
            const normalized = entry.text.trim();
            if (!normalized) {
              return null;
            }
            return {
              id: typeof entry.id === 'number' ? entry.id : index + 1,
              text: normalized,
              textLower: (entry.textLower || normalized).toLowerCase(),
              timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : Date.now() - index,
              pinned: Boolean(entry.pinned),
            };
          })
          .filter((entry) => entry && entry.text.length > 0);
      } catch (error) {
        console.error('Failed to parse clipboard history from storage', error);
        return [];
      }
    }

    persistLocalCache() {
      if (!this.storage) {
        return;
      }
      try {
        const payload = this.cache.map((entry) => ({
          id: entry.id,
          text: entry.text,
          textLower: entry.textLower,
          timestamp: entry.timestamp,
          pinned: entry.pinned,
        }));
        this.storage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(payload));
      } catch (error) {
        console.error('Failed to persist clipboard history to storage', error);
      }
    }

    async readAll(db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const result = Array.isArray(request.result) ? request.result : [];
          resolve(
            result.map((entry) => ({
              id: entry.id,
              text: entry.text,
              textLower: entry.textLower || entry.text.toLowerCase(),
              timestamp: entry.timestamp,
              pinned: Boolean(entry.pinned),
            })),
          );
        };
        request.onerror = () => reject(request.error);
      });
    }

    sortCache() {
      this.cache.sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return Number(b.pinned) - Number(a.pinned);
        }
        return b.timestamp - a.timestamp;
      });
    }

    getSnapshot() {
      return this.cache.slice();
    }

    get size() {
      return this.cache.length;
    }

    getById(id) {
      return this.cache.find((entry) => entry.id === id) || null;
    }

    async add(rawText) {
      const normalized = typeof rawText === 'string' ? rawText.trim() : '';
      if (!normalized) {
        return null;
      }
      const textLower = normalized.toLowerCase();
      const now = Date.now();
      const existingIndex = this.cache.findIndex((entry) => entry.textLower === textLower);
      if (existingIndex !== -1) {
        const entry = this.cache[existingIndex];
        entry.timestamp = now;
        entry.text = normalized;
        entry.textLower = textLower;
        if (this.fallback) {
          this.persistLocalCache();
        } else {
          await this.put(entry);
        }
        this.sortCache();
        return { entry, action: 'updated' };
      }

      const entry = {
        id: undefined,
        text: normalized,
        textLower,
        timestamp: now,
        pinned: false,
      };

      if (this.fallback) {
        entry.id = this.generateFallbackId();
        this.cache.push(entry);
        this.sortCache();
        this.enforceFallbackLimit();
        this.persistLocalCache();
        return { entry, action: 'created' };
      }

      const db = await this.dbPromise;
      entry.id = await this.addToStore(db, entry);
      this.cache.push(entry);
      this.sortCache();
      await this.enforceLimit();
      return { entry, action: 'created' };
    }

    generateFallbackId() {
      if (!this.cache.length) {
        return 1;
      }
      return this.cache.reduce((maxId, entry) => Math.max(maxId, entry.id || 0), 0) + 1;
    }

    async addToStore(db, entry) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const payload = {
          text: entry.text,
          textLower: entry.textLower,
          timestamp: entry.timestamp,
          pinned: entry.pinned,
        };
        const request = store.add(payload);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async put(entry) {
      if (this.fallback) {
        this.persistLocalCache();
        return;
      }
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.put({
          id: entry.id,
          text: entry.text,
          textLower: entry.textLower,
          timestamp: entry.timestamp,
          pinned: entry.pinned,
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async delete(id) {
      const index = this.cache.findIndex((entry) => entry.id === id);
      if (index === -1) {
        return false;
      }
      this.cache.splice(index, 1);
      if (this.fallback) {
        this.persistLocalCache();
        return true;
      }
      const db = await this.dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    }

    async clear() {
      if (!this.cache.length) {
        return;
      }
      this.cache = [];
      if (this.fallback) {
        if (this.storage) {
          this.storage.removeItem(LEGACY_HISTORY_KEY);
        }
        return;
      }
      const db = await this.dbPromise;
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async togglePin(id) {
      const entry = this.getById(id);
      if (!entry) {
        return null;
      }
      entry.pinned = !entry.pinned;
      entry.timestamp = Date.now();
      if (this.fallback) {
        this.persistLocalCache();
      } else {
        await this.put(entry);
      }
      this.sortCache();
      return entry.pinned;
    }

    async enforceLimit() {
      if (this.cache.length <= this.maxEntries) {
        return;
      }
      const overflow = this.cache.length - this.maxEntries;
      const removable = this.cache
        .filter((entry) => !entry.pinned)
        .sort((a, b) => a.timestamp - b.timestamp);
      let removed = 0;
      while (removed < overflow && removable.length) {
        const entry = removable.shift();
        if (!entry) {
          break;
        }
        await this.delete(entry.id);
        removed += 1;
      }
    }

    enforceFallbackLimit() {
      if (this.cache.length <= this.maxEntries) {
        return;
      }
      const overflow = this.cache.length - this.maxEntries;
      const removable = this.cache
        .filter((entry) => !entry.pinned)
        .sort((a, b) => a.timestamp - b.timestamp);
      let removed = 0;
      while (removed < overflow && removable.length) {
        const entry = removable.shift();
        if (!entry) {
          break;
        }
        const index = this.cache.findIndex((item) => item.id === entry.id);
        if (index !== -1) {
          this.cache.splice(index, 1);
          removed += 1;
        }
      }
      this.persistLocalCache();
    }

    async removeDuplicates() {
      const seen = new Set();
      const duplicates = [];
      for (const entry of this.cache) {
        const key = entry.textLower;
        if (seen.has(key)) {
          duplicates.push(entry);
        } else {
          seen.add(key);
        }
      }
      if (!duplicates.length) {
        return [];
      }
      for (const entry of duplicates) {
        await this.delete(entry.id);
      }
      this.sortCache();
      return duplicates;
    }
  }

  function openDatabase(name, version, storeName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        let store;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        } else {
          store = event.target.transaction.objectStore(storeName);
        }
        if (store && !store.indexNames.contains('textLower')) {
          store.createIndex('textLower', 'textLower', { unique: false });
        }
        if (store && !store.indexNames.contains('timestamp')) {
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function fuzzyScore(query, target) {
    const trimmed = query.trim();
    if (!trimmed) {
      return { score: 0, matches: [] };
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      let totalScore = 0;
      const matches = [];
      let searchIndex = 0;
      for (const token of tokens) {
        const index = target.indexOf(token, searchIndex);
        if (index === -1) {
          return null;
        }
        totalScore += 300 - index * 2 + token.length * 12;
        for (let i = 0; i < token.length; i += 1) {
          matches.push(index + i);
        }
        searchIndex = index + token.length;
      }
      return { score: totalScore, matches };
    }

    const q = tokens[0] || '';
    if (!q) {
      return { score: 0, matches: [] };
    }

    const contiguousIndex = target.indexOf(q);
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestMatches = [];

    if (contiguousIndex !== -1) {
      const contiguousMatches = Array.from({ length: q.length }, (_, idx) => contiguousIndex + idx);
      const contiguousScore = 400 - contiguousIndex * 3 + q.length * 10;
      bestScore = contiguousScore;
      bestMatches = contiguousMatches;
    }

    let qIndex = 0;
    const matches = [];
    let lastMatch = -1;
    let sequentialScore = 0;

    for (let i = 0; i < target.length && qIndex < q.length; i += 1) {
      if (target[i] === q[qIndex]) {
        const consecutive = lastMatch + 1 === i;
        sequentialScore += consecutive ? 25 : 15;
        if (i <= 5) {
          sequentialScore += 4;
        }
        matches.push(i);
        lastMatch = i;
        qIndex += 1;
      } else if (matches.length) {
        sequentialScore -= 1;
      }
    }

    if (qIndex === q.length) {
      sequentialScore -= matches[0] || 0;
      if (sequentialScore > bestScore) {
        bestScore = sequentialScore;
        bestMatches = matches;
      }
    }

    if (!Number.isFinite(bestScore)) {
      return null;
    }

    return { score: bestScore, matches: bestMatches };
  }

  function buildHighlightedFragment(text, matchIndexes) {
    const fragment = document.createDocumentFragment();
    if (!matchIndexes || !matchIndexes.length) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    const sorted = Array.from(
      new Set(matchIndexes.filter((index) => index >= 0 && index < text.length)),
    ).sort((a, b) => a - b);

    if (!sorted.length) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }

    const segments = [];
    for (const index of sorted) {
      const last = segments[segments.length - 1];
      if (last && index === last.end + 1) {
        last.end = index;
      } else {
        segments.push({ start: index, end: index });
      }
    }

    let pointer = 0;
    for (const segment of segments) {
      if (pointer < segment.start) {
        fragment.appendChild(document.createTextNode(text.slice(pointer, segment.start)));
      }
      const mark = document.createElement('mark');
      mark.textContent = text.slice(segment.start, segment.end + 1);
      fragment.appendChild(mark);
      pointer = segment.end + 1;
    }

    if (pointer < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(pointer)));
    }

    return fragment;
  }

  function createQueueId() {
    if (globalScope?.crypto?.randomUUID) {
      return globalScope.crypto.randomUUID();
    }
    return `q_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function loadQueue() {
    if (!storage) {
      return [];
    }
    try {
      const raw = storage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((item) => {
          if (!item || typeof item.text !== 'string') {
            return null;
          }
          return {
            queueId:
              typeof item.queueId === 'string' && item.queueId
                ? item.queueId
                : createQueueId(),
            entryId: typeof item.entryId === 'number' ? item.entryId : null,
            text: item.text,
            timestampAdded:
              typeof item.timestampAdded === 'number' ? item.timestampAdded : Date.now(),
          };
        })
        .filter((item) => item && item.text.length > 0);
    } catch (error) {
      console.error('Failed to parse clipboard queue from storage', error);
      return [];
    }
  }

  function persistQueue(queue) {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to persist clipboard queue', error);
    }
  }

  const historyList = document.getElementById('history');
  const historyCount = document.getElementById('history-count');
  const searchMeta = document.getElementById('search-meta');
  const statusEl = document.getElementById('status');
  const searchInput = document.getElementById('search');
  const clearBtn = document.getElementById('clear');
  const dedupeBtn = document.getElementById('dedupe');
  const queueList = document.getElementById('queue');
  const queueCopyNextBtn = document.getElementById('queue-copy-next');
  const queueCopyAllBtn = document.getElementById('queue-copy-all');
  const queueClearBtn = document.getElementById('queue-clear');

  if (
    !historyList ||
    !historyCount ||
    !searchMeta ||
    !statusEl ||
    !searchInput ||
    !clearBtn ||
    !dedupeBtn ||
    !queueList ||
    !queueCopyNextBtn ||
    !queueCopyAllBtn ||
    !queueClearBtn
  ) {
    console.error('Clipboard Manager: required DOM elements are missing.');
    return;
  }

  const store = new ClipboardHistoryStore({
    storage,
  });

  const state = {
    filterQuery: '',
    renderItems: [],
  };

  let renderPending = false;
  let statusTimeoutId;
  let queue = loadQueue();

  function setStatus(message, type = 'info', duration = 3200) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message || '';
    if (message) {
      statusEl.dataset.state = type;
      clearTimeout(statusTimeoutId);
      statusTimeoutId = globalScope.setTimeout(() => {
        statusEl.textContent = '';
        delete statusEl.dataset.state;
      }, duration);
    } else {
      delete statusEl.dataset.state;
    }
  }

  function computeFilteredResults() {
    const entries = store.getSnapshot();
    const query = state.filterQuery.trim().toLowerCase();
    if (!query) {
      state.renderItems = entries.map((entry) => ({
        entry,
        matches: [],
        score: entry.timestamp,
      }));
      return {
        total: entries.length,
        matches: entries.length,
        query,
      };
    }

    const results = [];
    for (const entry of entries) {
      const match = fuzzyScore(query, entry.textLower);
      if (match) {
        results.push({
          entry,
          matches: match.matches,
          score: match.score,
        });
      }
    }

    results.sort((a, b) => {
      if (a.entry.pinned !== b.entry.pinned) {
        return Number(b.entry.pinned) - Number(a.entry.pinned);
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.entry.timestamp - a.entry.timestamp;
    });

    state.renderItems = results;
    return {
      total: entries.length,
      matches: results.length,
      query,
    };
  }

  function renderHistory(meta) {
    historyList.replaceChildren();
    if (!state.renderItems.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = meta.query
        ? 'No matches for your search.'
        : 'No clipboard entries captured yet.';
      historyList.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      for (const item of state.renderItems) {
        fragment.appendChild(createHistoryListItem(item.entry, item.matches));
      }
      historyList.appendChild(fragment);
    }

    historyCount.textContent = `${store.size} ${store.size === 1 ? 'item' : 'items'}`;

    if (meta.query) {
      searchMeta.textContent = `${meta.matches} match${meta.matches === 1 ? '' : 'es'} for “${
        meta.query
      }”`;
    } else {
      searchMeta.textContent = 'Showing the latest clipboard history';
    }
  }

  function createHistoryListItem(entry, matches) {
    const li = document.createElement('li');
    li.className = 'history-item';
    if (entry.pinned) {
      li.classList.add('history-item--pinned');
    }
    li.dataset.id = String(entry.id);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'history-item__copy';
    copyButton.dataset.action = 'copy';

    const textContainer = document.createElement('div');
    textContainer.className = 'history-item__text';
    textContainer.title = entry.text;
    textContainer.appendChild(buildHighlightedFragment(entry.text, matches));
    copyButton.appendChild(textContainer);

    const meta = document.createElement('div');
    meta.className = 'history-item__meta';
    const time = document.createElement('time');
    time.dateTime = new Date(entry.timestamp).toISOString();
    time.textContent = timestampFormatter.format(entry.timestamp);
    meta.appendChild(time);

    if (entry.pinned) {
      const badge = document.createElement('span');
      badge.className = 'history-item__badge';
      badge.textContent = 'Pinned';
      meta.appendChild(badge);
    }

    copyButton.appendChild(meta);
    li.appendChild(copyButton);

    const actions = document.createElement('div');
    actions.className = 'history-item__actions';

    const queueBtn = document.createElement('button');
    queueBtn.type = 'button';
    queueBtn.dataset.action = 'queue';
    queueBtn.textContent = 'Add to Queue';
    actions.appendChild(queueBtn);

    const pinBtn = document.createElement('button');
    pinBtn.type = 'button';
    pinBtn.dataset.action = 'pin';
    pinBtn.textContent = entry.pinned ? 'Unpin' : 'Pin';
    pinBtn.setAttribute('aria-pressed', entry.pinned ? 'true' : 'false');
    actions.appendChild(pinBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.textContent = 'Delete';
    actions.appendChild(deleteBtn);

    li.appendChild(actions);

    return li;
  }

  function renderQueue() {
    queueList.replaceChildren();
    if (!queue.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Queue is empty. Add snippets from history.';
      queueList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    queue.forEach((item, index) => {
      fragment.appendChild(createQueueListItem(item, index));
    });
    queueList.appendChild(fragment);
  }

  function createQueueListItem(item, index) {
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.dataset.index = String(index);

    const textContainer = document.createElement('div');
    textContainer.className = 'queue-item__text';
    textContainer.title = item.text;
    textContainer.textContent = item.text;
    li.appendChild(textContainer);

    const actions = document.createElement('div');
    actions.className = 'queue-item__actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.dataset.action = 'queue-copy';
    copyBtn.textContent = 'Copy';
    actions.appendChild(copyBtn);

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.dataset.action = 'queue-up';
    upBtn.textContent = 'Move Up';
    if (index === 0) {
      upBtn.disabled = true;
    }
    actions.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.dataset.action = 'queue-down';
    downBtn.textContent = 'Move Down';
    if (index === queue.length - 1) {
      downBtn.disabled = true;
    }
    actions.appendChild(downBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.dataset.action = 'queue-remove';
    removeBtn.textContent = 'Remove';
    actions.appendChild(removeBtn);

    li.appendChild(actions);

    return li;
  }

  function scheduleRender() {
    if (renderPending) {
      return;
    }
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      const meta = computeFilteredResults();
      renderHistory(meta);
    });
  }

  async function copyText(text, successMessage) {
    if (!navigator.clipboard?.writeText) {
      setStatus('Clipboard API is not available in this browser.', 'error', 4000);
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      if (successMessage) {
        setStatus(successMessage, 'success');
      }
      return true;
    } catch (error) {
      console.error('Failed to write to clipboard', error);
      setStatus('Clipboard write failed. Check browser permissions.', 'error', 4500);
      return false;
    }
  }

  async function handleClipboardCapture(event) {
    let text = '';
    if (event && event.clipboardData) {
      text = event.clipboardData.getData('text/plain') || '';
    }
    if (!text && navigator.clipboard?.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (error) {
        console.error('Clipboard read failed', error);
        setStatus('Clipboard read failed. Grant clipboard permissions.', 'error', 4500);
        return;
      }
    }
    if (!text) {
      return;
    }
    const result = await store.add(text);
    if (!result) {
      return;
    }
    syncQueueEntry(result.entry);
    scheduleRender();
    if (result.action === 'created') {
      setStatus('Stored new clipboard entry.', 'success');
    } else if (result.action === 'updated') {
      setStatus('Updated clipboard entry.', 'success');
    }
  }

  function syncQueueEntry(entry) {
    let changed = false;
    queue = queue.map((item) => {
      if (item.entryId === entry.id && item.text !== entry.text) {
        changed = true;
        return {
          ...item,
          text: entry.text,
        };
      }
      return item;
    });
    if (changed) {
      persistQueue(queue);
      renderQueue();
    }
  }

  function removeQueueEntriesById(id) {
    const initialLength = queue.length;
    queue = queue.filter((item) => item.entryId !== id);
    if (queue.length !== initialLength) {
      persistQueue(queue);
      renderQueue();
    }
  }

  function addEntryToQueue(entry) {
    const exists = queue.some(
      (item) => item.entryId === entry.id && item.text === entry.text,
    );
    if (exists) {
      setStatus('Entry is already in the queue.', 'info');
      return;
    }
    queue.push({
      queueId: createQueueId(),
      entryId: entry.id,
      text: entry.text,
      timestampAdded: Date.now(),
    });
    persistQueue(queue);
    renderQueue();
    setStatus('Added entry to the queue.', 'success');
  }

  function removeQueueIndex(index) {
    if (index < 0 || index >= queue.length) {
      return;
    }
    queue.splice(index, 1);
    persistQueue(queue);
    renderQueue();
    setStatus('Removed item from the queue.', 'success');
  }

  function moveQueueItem(index, offset) {
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= queue.length) {
      return;
    }
    const [item] = queue.splice(index, 1);
    queue.splice(newIndex, 0, item);
    persistQueue(queue);
    renderQueue();
  }

  function clearQueue() {
    if (!queue.length) {
      setStatus('Queue is already empty.', 'info');
      return;
    }
    queue = [];
    persistQueue(queue);
    renderQueue();
    setStatus('Cleared the queue.', 'success');
  }

  async function copyQueueNext() {
    if (!queue.length) {
      setStatus('Queue is empty.', 'error');
      return;
    }
    const [next] = queue;
    const copied = await copyText(next.text, 'Copied queue item to clipboard.');
    if (copied) {
      queue.shift();
      persistQueue(queue);
      renderQueue();
    }
  }

  async function copyQueueAll() {
    if (!queue.length) {
      setStatus('Queue is empty.', 'error');
      return;
    }
    const combined = queue.map((item) => item.text).join('\n\n');
    await copyText(combined, 'Copied entire queue to clipboard.');
  }

  function pruneQueueAgainstHistory() {
    const ids = new Set(store.getSnapshot().map((entry) => entry.id));
    const initialLength = queue.length;
    queue = queue.filter((item) => !item.entryId || ids.has(item.entryId));
    if (queue.length !== initialLength) {
      persistQueue(queue);
      renderQueue();
    }
  }

  searchInput.addEventListener('input', (event) => {
    state.filterQuery = event.target.value || '';
    scheduleRender();
  });

  historyList.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) {
      return;
    }
    const li = actionButton.closest('.history-item');
    if (!li) {
      return;
    }
    const id = Number.parseInt(li.dataset.id, 10);
    if (Number.isNaN(id)) {
      return;
    }
    const entry = store.getById(id);
    if (!entry) {
      return;
    }
    const action = actionButton.dataset.action;
    switch (action) {
      case 'copy':
        await copyText(entry.text, 'Copied snippet to clipboard.');
        break;
      case 'queue':
        addEntryToQueue(entry);
        break;
      case 'pin': {
        const pinned = await store.togglePin(id);
        if (pinned === null) {
          return;
        }
        scheduleRender();
        setStatus(pinned ? 'Pinned entry.' : 'Unpinned entry.', 'success');
        break;
      }
      case 'delete':
        await store.delete(id);
        removeQueueEntriesById(id);
        scheduleRender();
        setStatus('Removed entry from history.', 'success');
        break;
      default:
        break;
    }
  });

  historyList.addEventListener('keydown', async (event) => {
    if (
      event.target instanceof HTMLElement &&
      event.target.dataset.action === 'copy' &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      const li = event.target.closest('.history-item');
      if (!li) {
        return;
      }
      const id = Number.parseInt(li.dataset.id, 10);
      if (Number.isNaN(id)) {
        return;
      }
      const entry = store.getById(id);
      if (!entry) {
        return;
      }
      await copyText(entry.text, 'Copied snippet to clipboard.');
    }
  });

  queueList.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) {
      return;
    }
    const li = actionButton.closest('.queue-item');
    if (!li) {
      return;
    }
    const index = Number.parseInt(li.dataset.index, 10);
    if (Number.isNaN(index)) {
      return;
    }
    const item = queue[index];
    if (!item) {
      return;
    }
    const action = actionButton.dataset.action;
    switch (action) {
      case 'queue-copy':
        await copyText(item.text, 'Copied queue item to clipboard.');
        break;
      case 'queue-up':
        moveQueueItem(index, -1);
        break;
      case 'queue-down':
        moveQueueItem(index, 1);
        break;
      case 'queue-remove':
        removeQueueIndex(index);
        break;
      default:
        break;
    }
  });

  clearBtn.addEventListener('click', async () => {
    const confirmed = globalScope.confirm(
      'Clear the entire clipboard history? This cannot be undone.',
    );
    if (!confirmed) {
      return;
    }
    await store.clear();
    state.filterQuery = '';
    searchInput.value = '';
    scheduleRender();
    setStatus('Cleared clipboard history.', 'success');
  });

  dedupeBtn.addEventListener('click', async () => {
    const removed = await store.removeDuplicates();
    if (!removed.length) {
      setStatus('No duplicate entries found.', 'info');
      return;
    }
    removed.forEach((entry) => removeQueueEntriesById(entry.id));
    scheduleRender();
    setStatus(`Removed ${removed.length} duplicate${removed.length === 1 ? '' : 's'}.`, 'success');
  });

  queueCopyNextBtn.addEventListener('click', () => {
    void copyQueueNext();
  });

  queueCopyAllBtn.addEventListener('click', () => {
    void copyQueueAll();
  });

  queueClearBtn.addEventListener('click', () => {
    clearQueue();
  });

  document.addEventListener('copy', handleClipboardCapture);
  document.addEventListener('cut', handleClipboardCapture);

  if (!supportsIndexedDB) {
    setStatus('IndexedDB unavailable. Falling back to localStorage (limited).', 'error', 5000);
  }

  (async () => {
    await store.init();
    pruneQueueAgainstHistory();
    renderQueue();
    scheduleRender();
  })();
}
