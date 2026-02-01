import {
  findNodeByPathIds,
  findNodeByPathNames,
  listDirectory,
} from '../../../services/fileExplorer/fauxFileSystem';

export type FauxNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: FauxNode[];
  content?: string;
  url?: string;
};

export const DEFAULT_HOME = ['Desktop'];

const cloneTree = (tree: FauxNode): FauxNode => {
  if (typeof structuredClone === 'function') {
    return structuredClone(tree);
  }
  return JSON.parse(JSON.stringify(tree)) as FauxNode;
};

const normalizeSegments = (segments: string[], base: string[]) => {
  const stack = [...base];
  segments.forEach((segment) => {
    if (!segment || segment === '.') return;
    if (segment === '..') {
      if (stack.length) stack.pop();
      return;
    }
    stack.push(segment);
  });
  return stack;
};

export const resolvePathSegments = (
  input: string | undefined,
  cwd: string[],
  home: string[],
) => {
  const raw = (input ?? '').trim();
  if (!raw) return [...cwd];
  if (raw === '~') return [...home];
  if (raw.startsWith('~/')) {
    const segments = raw.slice(2).split('/').filter(Boolean);
    return normalizeSegments(segments, home);
  }
  const absolute = raw.startsWith('/');
  const segments = raw.split('/').filter(Boolean);
  return normalizeSegments(segments, absolute ? [] : cwd);
};

export const formatPath = (segments: string[], home: string[]) => {
  if (segments.length === 0) return '/';
  if (home.length && segments.slice(0, home.length).join('/') === home.join('/')) {
    const remainder = segments.slice(home.length);
    return remainder.length ? `~/${remainder.join('/')}` : '~';
  }
  return `/${segments.join('/')}`;
};

export const getFolderNode = (tree: FauxNode | null, segments: string[]) => {
  if (!tree) return null;
  if (segments.length === 0) return tree;
  const pathIds = findNodeByPathNames(tree, segments);
  if (pathIds.length !== segments.length + 1) return null;
  const nodes = findNodeByPathIds(tree, pathIds);
  const node = nodes[nodes.length - 1] as FauxNode | undefined;
  if (!node || node.type !== 'folder') return null;
  return node;
};

export const getFileNode = (tree: FauxNode | null, segments: string[]) => {
  if (!tree || segments.length === 0) return null;
  const fileName = segments[segments.length - 1];
  const parentSegments = segments.slice(0, -1);
  const parent = getFolderNode(tree, parentSegments);
  if (!parent) return null;
  const children = Array.isArray(parent.children) ? parent.children : [];
  return (
    children.find((child) => child?.type === 'file' && child.name === fileName) ||
    null
  );
};

export const listEntries = (tree: FauxNode | null, segments: string[]) => {
  const folder = getFolderNode(tree, segments);
  if (!folder) return { directories: [], files: [] };
  return listDirectory(folder);
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const addFolder = (
  tree: FauxNode,
  parentSegments: string[],
  name: string,
) => {
  const next = cloneTree(tree);
  const parent = getFolderNode(next, parentSegments);
  if (!parent) return { error: 'No such directory.' };
  const children = Array.isArray(parent.children) ? parent.children : [];
  if (children.some((child) => child?.name === name)) {
    return { error: 'Entry already exists.' };
  }
  children.push({ id: createId(), name, type: 'folder', children: [] });
  parent.children = children;
  return { tree: next };
};

export const addFile = (
  tree: FauxNode,
  parentSegments: string[],
  name: string,
  content = '',
) => {
  const next = cloneTree(tree);
  const parent = getFolderNode(next, parentSegments);
  if (!parent) return { error: 'No such directory.' };
  const children = Array.isArray(parent.children) ? parent.children : [];
  const existing = children.find((child) => child?.name === name);
  if (existing?.type === 'file') {
    existing.content = content || existing.content || '';
    parent.children = children;
    return { tree: next };
  }
  if (existing) return { error: 'Entry already exists.' };
  children.push({ id: createId(), name, type: 'file', content });
  parent.children = children;
  return { tree: next };
};

export const removeEntry = (
  tree: FauxNode,
  parentSegments: string[],
  name: string,
) => {
  const next = cloneTree(tree);
  const parent = getFolderNode(next, parentSegments);
  if (!parent) return { error: 'No such directory.' };
  const children = Array.isArray(parent.children) ? parent.children : [];
  const index = children.findIndex((child) => child?.name === name);
  if (index === -1) return { error: 'Entry not found.' };
  children.splice(index, 1);
  parent.children = children;
  return { tree: next };
};

export const buildFileMap = (tree: FauxNode | null, cwd: string[]) => {
  const map: Record<string, string> = {};
  if (!tree) return map;
  const cwdKey = cwd.join('/');

  const walk = (node: FauxNode, parentSegments: string[]) => {
    if (node.type === 'file') {
      if (typeof node.content === 'string') {
        const fullSegments = [...parentSegments, node.name];
        const absolutePath = `/${fullSegments.join('/')}`;
        map[absolutePath] = node.content;
        if (cwdKey.length === 0 || fullSegments.slice(0, cwd.length).join('/') === cwdKey) {
          const relativeSegments = fullSegments.slice(cwd.length);
          map[relativeSegments.join('/')] = node.content;
        }
      }
      return;
    }
    const children = Array.isArray(node.children) ? node.children : [];
    const nextParent = [...parentSegments, node.name];
    children.forEach((child) => walk(child, nextParent));
  };

  if (tree.type === 'folder') {
    const children = Array.isArray(tree.children) ? tree.children : [];
    children.forEach((child) => walk(child, []));
  }
  return map;
};
