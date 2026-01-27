import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import apps from '../apps.config';
import { safeLocalStorage } from '../utils/safeStorage';

export type VfsEntryType = 'directory' | 'file' | 'app';

export interface VfsEntry {
  id: string;
  name: string;
  type: VfsEntryType;
  children?: VfsEntry[];
  content?: string;
  appId?: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VfsSearchResult {
  path: string;
  name: string;
  entry: VfsEntry;
}

interface FileSystemState {
  tree: VfsEntry;
  resolvePath: (input: string, cwd?: string) => string;
  listDirectory: (path: string) => VfsEntry[];
  getEntry: (path: string) => VfsEntry | null;
  createDirectory: (path: string, options?: { cwd?: string; recursive?: boolean }) => { ok: boolean; message?: string };
  createFile: (path: string, content?: string, options?: { cwd?: string }) => { ok: boolean; message?: string };
  writeFile: (path: string, content: string, options?: { cwd?: string }) => { ok: boolean; message?: string };
  readFile: (path: string, options?: { cwd?: string }) => { ok: boolean; content?: string; message?: string };
  removePath: (path: string, options?: { cwd?: string; recursive?: boolean }) => { ok: boolean; message?: string };
  searchFiles: (query: string) => VfsSearchResult[];
  addDesktopAppEntry: (app: { id: string; title?: string; icon?: string }) => void;
}

const BASE_HOME = '/home/kali';
export const DEFAULT_HOME_PATH = BASE_HOME;
export const DEFAULT_DESKTOP_PATH = `${BASE_HOME}/Desktop`;

const memoryStorage = {
  getItem: (_name: string) => null,
  setItem: (_name: string, _value: string) => {},
  removeItem: (_name: string) => {},
};

const storage = typeof window !== 'undefined' && safeLocalStorage ? safeLocalStorage : memoryStorage;

const createNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSegments = (segments: string[]) => {
  const output: string[] = [];
  segments.forEach((segment) => {
    if (!segment || segment === '.') return;
    if (segment === '..') {
      output.pop();
    } else {
      output.push(segment);
    }
  });
  return output;
};

const resolvePath = (input: string, cwd = BASE_HOME) => {
  if (!input) return cwd;
  let path = input.trim();
  if (path.startsWith('~')) {
    path = path.replace(/^~(?=\/|$)/, BASE_HOME);
  }
  if (!path.startsWith('/')) {
    path = `${cwd.replace(/\/$/, '')}/${path}`;
  }
  const segments = normalizeSegments(path.split('/'));
  return `/${segments.join('/')}` || '/';
};


const cloneWithUpdatedChild = (node: VfsEntry, index: number, child: VfsEntry) => {
  const children = Array.isArray(node.children) ? node.children.slice() : [];
  children[index] = child;
  return { ...node, children };
};

const findEntry = (node: VfsEntry, segments: string[]): VfsEntry | null => {
  if (!segments.length) return node;
  if (node.type !== 'directory') return null;
  const [current, ...rest] = segments;
  const child = node.children?.find((entry) => entry.name === current);
  if (!child) return null;
  return findEntry(child, rest);
};

const ensureDirectory = (node: VfsEntry, segments: string[]): { next: VfsEntry; created: boolean } => {
  if (!segments.length) return { next: node, created: false };
  if (node.type !== 'directory') return { next: node, created: false };
  const [current, ...rest] = segments;
  const children = Array.isArray(node.children) ? node.children.slice() : [];
  let index = children.findIndex((child) => child.name === current);
  let created = false;
  let child = index >= 0 ? children[index] : null;
  if (!child) {
    child = {
      id: createNodeId('dir'),
      name: current,
      type: 'directory',
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    children.push(child);
    index = children.length - 1;
    created = true;
  }
  const updated = ensureDirectory(child, rest);
  const nextChild = updated.next;
  if (nextChild !== child) {
    const nextNode = cloneWithUpdatedChild({ ...node, children }, index, nextChild);
    return { next: nextNode, created: created || updated.created };
  }
  if (created) {
    return { next: { ...node, children }, created };
  }
  return { next: node, created: false };
};

const updateEntryAtPath = (
  node: VfsEntry,
  segments: string[],
  updater: (entry: VfsEntry) => VfsEntry | null,
): { next: VfsEntry; updated: boolean } => {
  if (!segments.length) {
    const updated = updater(node);
    return { next: updated || node, updated: Boolean(updated) };
  }
  if (node.type !== 'directory') return { next: node, updated: false };
  const [current, ...rest] = segments;
  const children = Array.isArray(node.children) ? node.children.slice() : [];
  const index = children.findIndex((child) => child.name === current);
  if (index < 0) return { next: node, updated: false };
  const child = children[index];
  const updatedChild = updateEntryAtPath(child, rest, updater);
  if (!updatedChild.updated) return { next: node, updated: false };
  const nextNode = cloneWithUpdatedChild({ ...node, children }, index, updatedChild.next);
  return { next: nextNode, updated: true };
};

const removeEntryAtPath = (
  node: VfsEntry,
  segments: string[],
  recursive: boolean,
): { next: VfsEntry; removed: boolean; message?: string } => {
  if (!segments.length) {
    return { next: node, removed: false, message: 'Cannot remove root.' };
  }
  if (node.type !== 'directory') {
    return { next: node, removed: false, message: 'Parent is not a directory.' };
  }
  const [current, ...rest] = segments;
  const children = Array.isArray(node.children) ? node.children.slice() : [];
  const index = children.findIndex((child) => child.name === current);
  if (index < 0) {
    return { next: node, removed: false, message: 'Path does not exist.' };
  }
  if (rest.length === 0) {
    const target = children[index];
    if (target.type === 'directory' && target.children?.length && !recursive) {
      return { next: node, removed: false, message: 'Directory not empty. Use rm -r.' };
    }
    children.splice(index, 1);
    return { next: { ...node, children }, removed: true };
  }
  const child = children[index];
  const updatedChild = removeEntryAtPath(child, rest, recursive);
  if (!updatedChild.removed) {
    return { next: node, removed: false, message: updatedChild.message };
  }
  const nextNode = cloneWithUpdatedChild({ ...node, children }, index, updatedChild.next);
  return { next: nextNode, removed: true };
};

const createUniqueName = (children: VfsEntry[], baseName: string) => {
  if (!children.some((entry) => entry.name === baseName)) return baseName;
  let idx = 2;
  let nextName = `${baseName} ${idx}`;
  while (children.some((entry) => entry.name === nextName)) {
    idx += 1;
    nextName = `${baseName} ${idx}`;
  }
  return nextName;
};

const buildDefaultTree = (): VfsEntry => {
  const desktopEntries: VfsEntry[] = apps
    .filter((app) => app.desktop_shortcut)
    .map((app) => ({
      id: app.id,
      name: app.title || app.id,
      type: 'app' as const,
      appId: app.id,
      icon: app.icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const now = new Date().toISOString();
  return {
    id: 'root',
    name: '/',
    type: 'directory',
    children: [
      {
        id: 'home',
        name: 'home',
        type: 'directory',
        children: [
          {
            id: 'home-kali',
            name: 'kali',
            type: 'directory',
            children: [
              {
                id: 'desktop',
                name: 'Desktop',
                type: 'directory',
                children: desktopEntries,
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'documents',
                name: 'Documents',
                type: 'directory',
                children: [
                  {
                    id: createNodeId('file'),
                    name: 'readme.txt',
                    type: 'file',
                    content: 'Welcome to your virtual Documents folder.',
                    createdAt: now,
                    updatedAt: now,
                  },
                ],
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'downloads',
                name: 'Downloads',
                type: 'directory',
                children: [],
                createdAt: now,
                updatedAt: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
};

export const fileSystemStore = create<FileSystemState>()(
  persist(
    (set, get) => ({
      tree: buildDefaultTree(),
      resolvePath: (input, cwd) => resolvePath(input, cwd),
      listDirectory: (path) => {
        const resolved = resolvePath(path, '/');
        const node = findEntry(get().tree, resolved.split('/').filter(Boolean));
        if (!node || node.type !== 'directory') return [];
        const children = Array.isArray(node.children) ? node.children.slice() : [];
        return children.sort((a, b) => a.name.localeCompare(b.name));
      },
      getEntry: (path) => {
        const resolved = resolvePath(path, '/');
        return findEntry(get().tree, resolved.split('/').filter(Boolean));
      },
      createDirectory: (path, options = {}) => {
        const resolved = resolvePath(path, options.cwd);
        const segments = resolved.split('/').filter(Boolean);
        if (!segments.length) return { ok: false, message: 'Invalid path.' };
        const parentSegments = segments.slice(0, -1);
        const targetName = segments[segments.length - 1];
        const tree = get().tree;
        const parent = findEntry(tree, parentSegments);
        if (!parent && !options.recursive) {
          return { ok: false, message: 'Parent directory does not exist.' };
        }
        let nextTree = tree;
        if (!parent && options.recursive) {
          const ensured = ensureDirectory(tree, parentSegments);
          nextTree = ensured.next;
        }
        const existingParent = findEntry(nextTree, parentSegments);
        if (!existingParent || existingParent.type !== 'directory') {
          return { ok: false, message: 'Parent directory not found.' };
        }
        const exists = existingParent.children?.some((child) => child.name === targetName);
        if (exists) {
          return { ok: false, message: 'Entry already exists.' };
        }
        const createdAt = new Date().toISOString();
        const updated = updateEntryAtPath(nextTree, parentSegments, (entry) => ({
          ...entry,
          children: [
            ...(entry.children || []),
            {
              id: createNodeId('dir'),
              name: targetName,
              type: 'directory',
              children: [],
              createdAt,
              updatedAt: createdAt,
            },
          ],
          updatedAt: createdAt,
        }));
        if (!updated.updated) return { ok: false, message: 'Unable to create directory.' };
        set({ tree: updated.next });
        return { ok: true };
      },
      createFile: (path, content = '', options = {}) => {
        const resolved = resolvePath(path, options.cwd);
        const segments = resolved.split('/').filter(Boolean);
        if (!segments.length) return { ok: false, message: 'Invalid path.' };
        const parentSegments = segments.slice(0, -1);
        const targetName = segments[segments.length - 1];
        const tree = get().tree;
        const parent = findEntry(tree, parentSegments);
        if (!parent || parent.type !== 'directory') {
          return { ok: false, message: 'Parent directory does not exist.' };
        }
        const existing = parent.children?.find((child) => child.name === targetName);
        const timestamp = new Date().toISOString();
        if (existing) {
          if (existing.type !== 'file') {
            return { ok: false, message: 'Entry exists and is not a file.' };
          }
          const updated = updateEntryAtPath(tree, parentSegments, (entry) => ({
            ...entry,
            children: (entry.children || []).map((child) =>
              child.name === targetName
                ? { ...child, content, updatedAt: timestamp }
                : child,
            ),
            updatedAt: timestamp,
          }));
          if (!updated.updated) return { ok: false, message: 'Unable to update file.' };
          set({ tree: updated.next });
          return { ok: true };
        }
        const updated = updateEntryAtPath(tree, parentSegments, (entry) => ({
          ...entry,
          children: [
            ...(entry.children || []),
            {
              id: createNodeId('file'),
              name: targetName,
              type: 'file',
              content,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          updatedAt: timestamp,
        }));
        if (!updated.updated) return { ok: false, message: 'Unable to create file.' };
        set({ tree: updated.next });
        return { ok: true };
      },
      writeFile: (path, content, options = {}) => {
        const resolved = resolvePath(path, options.cwd);
        const segments = resolved.split('/').filter(Boolean);
        if (!segments.length) return { ok: false, message: 'Invalid path.' };
        const parentSegments = segments.slice(0, -1);
        const targetName = segments[segments.length - 1];
        const tree = get().tree;
        const parent = findEntry(tree, parentSegments);
        if (!parent || parent.type !== 'directory') {
          return { ok: false, message: 'Parent directory does not exist.' };
        }
        const timestamp = new Date().toISOString();
        const exists = parent.children?.some((child) => child.name === targetName);
        if (!exists) {
          return get().createFile(resolved, content, { cwd: '/' });
        }
        const updated = updateEntryAtPath(tree, parentSegments, (entry) => ({
          ...entry,
          children: (entry.children || []).map((child) =>
            child.name === targetName
              ? { ...child, content, updatedAt: timestamp, type: 'file' }
              : child,
          ),
          updatedAt: timestamp,
        }));
        if (!updated.updated) return { ok: false, message: 'Unable to write file.' };
        set({ tree: updated.next });
        return { ok: true };
      },
      readFile: (path, options = {}) => {
        const resolved = resolvePath(path, options.cwd);
        const entry = findEntry(get().tree, resolved.split('/').filter(Boolean));
        if (!entry) return { ok: false, message: 'File not found.' };
        if (entry.type !== 'file') return { ok: false, message: 'Target is not a file.' };
        return { ok: true, content: entry.content || '' };
      },
      removePath: (path, options = {}) => {
        const resolved = resolvePath(path, options.cwd);
        const segments = resolved.split('/').filter(Boolean);
        if (!segments.length) return { ok: false, message: 'Invalid path.' };
        const updated = removeEntryAtPath(get().tree, segments, Boolean(options.recursive));
        if (!updated.removed) return { ok: false, message: updated.message || 'Unable to remove path.' };
        set({ tree: updated.next });
        return { ok: true };
      },
      searchFiles: (query) => {
        const term = query.trim().toLowerCase();
        if (!term) return [];
        const results: VfsSearchResult[] = [];
        const walk = (entry: VfsEntry, basePath: string) => {
          const currentPath = entry.name === '/' ? '' : `${basePath}/${entry.name}`;
          if (entry.type === 'file' && entry.name.toLowerCase().includes(term)) {
            results.push({ path: currentPath || '/', name: entry.name, entry });
          }
          if (entry.type === 'directory' && entry.children) {
            entry.children.forEach((child) => walk(child, currentPath || ''));
          }
        };
        walk(get().tree, '');
        return results.sort((a, b) => a.name.localeCompare(b.name));
      },
      addDesktopAppEntry: (app) => {
        const tree = get().tree;
        const desktop = findEntry(tree, DEFAULT_DESKTOP_PATH.split('/').filter(Boolean));
        if (!desktop || desktop.type !== 'directory') return;
        const children = desktop.children || [];
        const targetId = app.id;
        if (children.some((entry) => entry.type === 'app' && entry.appId === targetId)) return;
        const name = createUniqueName(children, app.title || app.id);
        const timestamp = new Date().toISOString();
        const updated = updateEntryAtPath(tree, DEFAULT_DESKTOP_PATH.split('/').filter(Boolean), (entry) => ({
          ...entry,
          children: [
            ...(entry.children || []),
            {
              id: targetId,
              name,
              type: 'app',
              appId: targetId,
              icon: app.icon,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          ],
          updatedAt: timestamp,
        }));
        if (updated.updated) {
          set({ tree: updated.next });
        }
      },
    }),
    {
      name: 'kali-vfs-store',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ tree: state.tree }),
    },
  ),
);

export const useFileSystemStore = fileSystemStore;
export const resolveVfsPath = resolvePath;
