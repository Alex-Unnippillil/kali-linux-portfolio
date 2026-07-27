export type EntryType = 'file' | 'directory';

export interface DirEntry {
  name: string;
  type?: EntryType;
  path?: string;
  children?: DirEntry[];
  size?: number;
  hash?: string;
  checksum?: string;
  modified?: string | number;
  mtime?: string | number;
  ctime?: string | number;
  mode?: string | number;
  contentHash?: string;
  etag?: string;
  [key: string]: unknown;
}

export interface NormalizedDirEntry
  extends Omit<DirEntry, 'children' | 'path' | 'type'> {
  type: EntryType;
  path: string;
  children: NormalizedDirEntry[];
}

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffNode {
  name: string;
  path: string;
  type: EntryType;
  status: DiffStatus;
  left?: NormalizedDirEntry;
  right?: NormalizedDirEntry;
  children: DiffNode[];
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  total: number;
}

export interface FlatDiffRow {
  path: string;
  status: DiffStatus;
  leftType: EntryType | null;
  rightType: EntryType | null;
  leftSize?: number;
  rightSize?: number;
}

const METADATA_KEYS = [
  'size',
  'hash',
  'checksum',
  'modified',
  'mtime',
  'ctime',
  'mode',
  'contentHash',
  'etag',
];

const EMPTY_STATS: DiffStats = {
  added: 0,
  removed: 0,
  changed: 0,
  unchanged: 0,
  total: 0,
};

export const DEFAULT_DIFF_STATS: DiffStats = { ...EMPTY_STATS };

function normalizePath(parentPath: string, name: string, explicitPath?: string): string {
  if (explicitPath) {
    const sanitized = explicitPath.replace(/\\/g, '/').replace(/\/+$/g, '');
    return sanitized === '' ? '/' : sanitized;
  }
  const trimmedParent = parentPath.replace(/\/+$/g, '');
  if (!trimmedParent && !name) {
    return '/';
  }
  if (!trimmedParent) {
    return name || '/';
  }
  if (!name) {
    return trimmedParent;
  }
  return `${trimmedParent}/${name}`.replace(/\/+$/g, '');
}

function resolveName(entry: DirEntry): string {
  if (entry.name) return entry.name;
  if (entry.path) {
    const segments = entry.path.replace(/\\/g, '/').split('/');
    const last = segments.filter(Boolean).pop();
    return last || '/';
  }
  return '/';
}

export function normalizeTree(entry: DirEntry, parentPath = ''): NormalizedDirEntry {
  const {
    children: rawChildren = [],
    type: entryType,
    path: explicitPath,
    name,
    ...rest
  } = entry;
  const resolvedName = resolveName({ name, path: explicitPath });
  const inferredType: EntryType = entryType
    ? entryType
    : rawChildren.length > 0
    ? 'directory'
    : 'file';
  const path = normalizePath(parentPath, resolvedName, explicitPath);
  const children = rawChildren.map((child) => normalizeTree(child, path));
  children.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'directory' ? -1 : 1;
  });

  return {
    ...rest,
    name: resolvedName,
    type: inferredType,
    path: path || '/',
    children,
  } as NormalizedDirEntry;
}

export function countNodes(entry?: DirEntry | NormalizedDirEntry | null): number {
  if (!entry) return 0;
  const normalized =
    'children' in entry && Array.isArray(entry.children)
      ? (entry as NormalizedDirEntry)
      : normalizeTree(entry as DirEntry);
  return 1 + normalized.children.reduce((acc, child) => acc + countNodes(child), 0);
}

function metadataChanged(left: NormalizedDirEntry, right: NormalizedDirEntry): boolean {
  if (left.type !== right.type) return true;
  for (const key of METADATA_KEYS) {
    if (left[key] !== right[key]) {
      return true;
    }
  }
  return false;
}

function diffInternal(
  left: NormalizedDirEntry | null,
  right: NormalizedDirEntry | null
): DiffNode | null {
  if (!left && !right) {
    return null;
  }

  const name = left?.name ?? right?.name ?? '/';
  const path = left?.path ?? right?.path ?? name;
  const type: EntryType = left?.type ?? right?.type ?? 'file';

  const leftChildren = left?.children ?? [];
  const rightChildren = right?.children ?? [];
  const childMap = new Map<string, { left: NormalizedDirEntry | null; right: NormalizedDirEntry | null }>();

  for (const child of leftChildren) {
    childMap.set(child.name, { left: child, right: null });
  }

  for (const child of rightChildren) {
    const existing = childMap.get(child.name);
    if (existing) {
      existing.right = child;
    } else {
      childMap.set(child.name, { left: null, right: child });
    }
  }

  const children: DiffNode[] = Array.from(childMap.values())
    .map(({ left: l, right: r }) => diffInternal(l, r))
    .filter((child): child is DiffNode => Boolean(child))
    .sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });

  let status: DiffStatus = 'unchanged';
  if (left && right) {
    const hasMetadataChanges = metadataChanged(left, right);
    const hasChildChanges = children.some((child) => child.status !== 'unchanged');
    status = hasMetadataChanges || hasChildChanges ? 'changed' : 'unchanged';
  } else if (left && !right) {
    status = 'removed';
  } else if (!left && right) {
    status = 'added';
  }

  return {
    name,
    path,
    type,
    status,
    left: left ?? undefined,
    right: right ?? undefined,
    children,
  };
}

export function buildDiff(
  left?: DirEntry | NormalizedDirEntry | null,
  right?: DirEntry | NormalizedDirEntry | null
): DiffNode | null {
  const normalizedLeft = left
    ? 'children' in left && Array.isArray(left.children)
      ? (left as NormalizedDirEntry)
      : normalizeTree(left as DirEntry)
    : null;
  const normalizedRight = right
    ? 'children' in right && Array.isArray(right.children)
      ? (right as NormalizedDirEntry)
      : normalizeTree(right as DirEntry)
    : null;
  return diffInternal(normalizedLeft, normalizedRight);
}

export function collectDiffStats(diff: DiffNode | null): DiffStats {
  if (!diff) return { ...EMPTY_STATS };
  const totals: DiffStats = { ...EMPTY_STATS };
  const stack: DiffNode[] = [diff];
  while (stack.length) {
    const node = stack.pop()!;
    totals.total += 1;
    totals[node.status] += 1;
    for (const child of node.children) {
      stack.push(child);
    }
  }
  return totals;
}

export function flattenDiff(diff: DiffNode | null): FlatDiffRow[] {
  if (!diff) return [];
  const rows: FlatDiffRow[] = [];
  const stack: DiffNode[] = [diff];
  while (stack.length) {
    const node = stack.pop()!;
    rows.push({
      path: node.path,
      status: node.status,
      leftType: node.left ? node.left.type : null,
      rightType: node.right ? node.right.type : null,
      leftSize: typeof node.left?.size === 'number' ? node.left.size : undefined,
      rightSize: typeof node.right?.size === 'number' ? node.right.size : undefined,
    });
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      stack.push(node.children[i]);
    }
  }
  return rows;
}
