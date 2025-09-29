import { createStore, get, set } from 'idb-keyval';
import { hasIndexedDB, isBrowser } from '../../../utils/isBrowser';

const STORE_NAME = 'openvas-cache';
const STORE_KEY = 'json';
const LOCAL_PREFIX = 'openvas-cache:';

const loaders = {
  'template:PCI': () => import('./templates/pci.json'),
  'template:HIPAA': () => import('./templates/hipaa.json'),
  'history:runs': () => import('./task-history.json'),
};

let store = null;
if (hasIndexedDB) {
  try {
    store = createStore(STORE_NAME, STORE_KEY);
  } catch (err) {
    console.warn('openvas cache store failed', err);
  }
}

const schedule = (fn) => {
  if (!isBrowser) {
    fn();
    return;
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn());
  } else {
    setTimeout(fn, 0);
  }
};

async function readFromCache(key) {
  const namespaced = `${LOCAL_PREFIX}${key}`;
  if (store) {
    try {
      const cached = await get(namespaced, store);
      if (cached) return cached;
    } catch (err) {
      console.warn('openvas cache read failed', err);
    }
  }
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(namespaced);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('openvas localStorage read failed', err);
    }
  }
  return null;
}

function writeToCache(key, value) {
  const namespaced = `${LOCAL_PREFIX}${key}`;
  schedule(() => {
    if (store) {
      set(namespaced, value, store).catch((err) => {
        console.warn('openvas cache write failed', err);
      });
      return;
    }
    if (isBrowser) {
      try {
        window.localStorage.setItem(namespaced, JSON.stringify(value));
      } catch (err) {
        console.warn('openvas localStorage write failed', err);
      }
    }
  });
}

async function loadData(key) {
  const loader = loaders[key];
  if (!loader) throw new Error(`No loader registered for ${key}`);

  if (!isBrowser) {
    const mod = await loader();
    return mod.default ?? null;
  }

  const cached = await readFromCache(key);
  if (cached) return cached;

  const mod = await loader();
  const data = mod.default ?? null;
  if (data) writeToCache(key, data);
  return data;
}

export function loadTemplate(profile) {
  return loadData(`template:${profile}`);
}

export function loadTaskHistory() {
  return loadData('history:runs');
}

export function preloadTemplates(ids = []) {
  if (!isBrowser) return;
  ids.forEach((id) => {
    loadTemplate(id).catch(() => {});
  });
}
