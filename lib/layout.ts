const WORKSPACE_FILE = 'State/workspace.json';
export const WORKSPACE_PATH = WORKSPACE_FILE;

const FALLBACK_PREFIX = 'opfs:';
const fallbackStore = new Map<string, string>();

export interface WindowLayoutState {
  id: string;
  inset: string;
  zIndex: number;
  minimized: boolean;
}

export interface WorkspaceLayoutState {
  windows: WindowLayoutState[];
}

const hasDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const getStorage = (): Storage | null => {
  if (!hasDOM()) return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

const fallbackKey = (path: string) => `${FALLBACK_PREFIX}${path}`;

const writeFallback = (path: string, value: string) => {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(fallbackKey(path), value);
      return;
    } catch {
      // ignore write errors and fall back to in-memory store
    }
  }
  fallbackStore.set(path, value);
};

const readFallback = (path: string): string | null => {
  const storage = getStorage();
  if (storage) {
    try {
      const stored = storage.getItem(fallbackKey(path));
      if (stored !== null) return stored;
    } catch {
      // ignore read errors and fall back to in-memory store
    }
  }
  return fallbackStore.get(path) ?? null;
};

const escapeAttr = (value: string) => {
  if (typeof value !== 'string') return '';
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
};

const parseBoolean = (value: string | null | undefined) => {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
};

const coerceMinimized = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const parsed = parseBoolean(value);
    if (parsed !== null) return parsed;
  }
  if (value == null) return false;
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
};

const coerceZIndex = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const coerceInset = (value: unknown) => (typeof value === 'string' ? value : '');

const detectMinimized = (node: HTMLElement) => {
  const attr = parseBoolean(node.getAttribute('data-minimized') ?? node.dataset.minimized);
  if (attr !== null) return attr;
  if (node.dataset.state === 'minimized') return true;
  if (node.hasAttribute('hidden')) return true;
  if (node.getAttribute('aria-hidden') === 'true') return true;
  if (node.classList.contains('invisible')) return true;
  if (node.classList.contains('opacity-0')) return true;
  return false;
};

const normalizeInset = (style: CSSStyleDeclaration) => {
  const inset = style.getPropertyValue('inset');
  if (inset && inset.trim()) return inset.trim();
  const top = style.getPropertyValue('top');
  const right = style.getPropertyValue('right');
  const bottom = style.getPropertyValue('bottom');
  const left = style.getPropertyValue('left');
  const values = [top, right, bottom, left]
    .map((value) => (value && value.trim() ? value.trim() : 'auto'))
    .join(' ')
    .trim();
  return values;
};

const collectWindows = (): WindowLayoutState[] => {
  if (!hasDOM()) return [];
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>('[data-window]'),
  );
  return nodes
    .map((node) => {
      const id = (node.getAttribute('data-window') || node.dataset.window || node.id || '').trim();
      if (!id) return null;
      const style = window.getComputedStyle(node);
      const inset = normalizeInset(style);
      const zIndexRaw = style.getPropertyValue('z-index');
      const parsedZIndex = Number.parseInt(zIndexRaw, 10);
      const zIndex = Number.isFinite(parsedZIndex) ? parsedZIndex : 0;
      const minimized = detectMinimized(node);
      return { id, inset, zIndex, minimized } as WindowLayoutState;
    })
    .filter((entry): entry is WindowLayoutState => entry !== null);
};

const findWindowElement = (id: string) => {
  if (!hasDOM()) return null;
  if (!id) return null;
  const selector = `[data-window="${escapeAttr(id)}"]`;
  let node: HTMLElement | null = null;
  try {
    node = document.querySelector<HTMLElement>(selector);
  } catch {
    node = null;
  }
  if (node) return node;
  return document.getElementById(id) as HTMLElement | null;
};

const applyWindowState = (node: HTMLElement, state: WindowLayoutState) => {
  if (!node) return;
  if (typeof state.inset === 'string') {
    if (state.inset) {
      node.style.inset = state.inset;
    } else {
      node.style.removeProperty('inset');
    }
  }
  if (typeof state.zIndex === 'number' && !Number.isNaN(state.zIndex)) {
    node.style.zIndex = `${state.zIndex}`;
  } else {
    node.style.removeProperty('z-index');
  }
  if (typeof state.minimized === 'boolean') {
    const minimizedValue = state.minimized ? 'true' : 'false';
    node.dataset.minimized = minimizedValue;
    node.setAttribute('data-minimized', minimizedValue);
    node.setAttribute('aria-hidden', minimizedValue);
    node.classList.toggle('invisible', state.minimized);
    node.classList.toggle('opacity-0', state.minimized);
  }
};

async function readFromOPFS(path: string): Promise<string | null> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.getDirectory) {
    return readFallback(path);
  }
  try {
    const root = await storage.getDirectory();
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return null;
    let dir: FileSystemDirectoryHandle = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    const handle = await dir.getFileHandle(fileName);
    const file = await handle.getFile();
    const text = await file.text();
    writeFallback(path, text);
    return text;
  } catch {
    return readFallback(path);
  }
}

export async function saveToOPFS(path: string, value: string): Promise<boolean> {
  writeFallback(path, value);
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.getDirectory) {
    return false;
  }
  try {
    const root = await storage.getDirectory();
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return false;
    let dir: FileSystemDirectoryHandle = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }
    const handle = await dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(value);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function saveLayout(): Promise<void> {
  if (!hasDOM()) return;
  const layout: WorkspaceLayoutState = { windows: collectWindows() };
  await saveToOPFS(WORKSPACE_FILE, JSON.stringify(layout, null, 2));
}

export async function loadLayout(): Promise<WorkspaceLayoutState | null> {
  if (!hasDOM()) return null;
  const raw = await readFromOPFS(WORKSPACE_FILE);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const layout = parsed as Partial<WorkspaceLayoutState>;
  if (!Array.isArray(layout.windows)) return null;
  const sanitized = layout.windows
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const stateEntry = entry as Partial<WindowLayoutState>;
      const id = stateEntry.id;
      if (!id || typeof id !== 'string') return null;
      return {
        id,
        inset: coerceInset(stateEntry.inset),
        zIndex: coerceZIndex(stateEntry.zIndex),
        minimized: coerceMinimized(stateEntry.minimized),
      } satisfies WindowLayoutState;
    })
    .filter((entry): entry is WindowLayoutState => entry !== null);

  sanitized.forEach((state) => {
    const node = findWindowElement(state.id);
    if (node) applyWindowState(node, state);
  });

  return { windows: sanitized };
}

export const __TESTING__ = {
  collectWindows,
  applyWindowState,
  readFromOPFS,
  WORKSPACE_FILE,
};
