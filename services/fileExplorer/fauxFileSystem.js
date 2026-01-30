import { safeLocalStorage } from '../../utils/safeStorage';

const STORAGE_KEY = 'faux_file_system_v1';
const NEW_FOLDERS_KEY = 'new_folders';

const cloneTree = (tree) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(tree);
  }
  return JSON.parse(JSON.stringify(tree));
};

const buildDefaultTree = () => ({
  id: 'root',
  name: '/',
  type: 'folder',
  children: [
    {
      id: 'desktop',
      name: 'Desktop',
      type: 'folder',
      children: [
        {
          id: 'desktop-welcome',
          name: 'Welcome.txt',
          type: 'file',
          content:
            'Welcome to your Kali-style desktop. Drop files into folders, open samples, and explore the portfolio assets from here.',
        },
      ],
    },
    {
      id: 'documents',
      name: 'Documents',
      type: 'folder',
      children: [
        {
          id: 'resume-pdf',
          name: 'Alex-Unnippillil-Resume.pdf',
          type: 'file',
          url: '/assets/Alex-Unnippillil-Resume.pdf',
        },
        {
          id: 'timeline-pdf',
          name: 'Timeline.pdf',
          type: 'file',
          url: '/assets/timeline.pdf',
        },
        {
          id: 'contact-card',
          name: 'alex-unnippillil.vcf',
          type: 'file',
          url: '/assets/alex-unnippillil.vcf',
        },
      ],
    },
    {
      id: 'projects',
      name: 'Projects',
      type: 'folder',
      children: [
        {
          id: 'portfolio-notes',
          name: 'portfolio-overview.md',
          type: 'file',
          content:
            '# Portfolio Highlights\n\n- Desktop-style UX with draggable windows\n- Kali-inspired tool simulations\n- Games arcade for quick demos\n\nTip: open the Projects folder to preview this markdown in Files.',
        },
        {
          id: 'project-checklist',
          name: 'launch-checklist.json',
          type: 'file',
          content: JSON.stringify(
            {
              status: 'ready',
              checks: ['Run yarn lint', 'Run yarn test', 'Capture screenshots'],
            },
            null,
            2,
          ),
        },
      ],
    },
    {
      id: 'media',
      name: 'Media',
      type: 'folder',
      children: [
        {
          id: 'brand-mark',
          name: 'brand-mark.svg',
          type: 'file',
          url: '/images/logos/fevicon.svg',
        },
      ],
    },
  ],
});

const loadNewDesktopFolders = () => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(NEW_FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        if (typeof entry.id !== 'string' || typeof entry.name !== 'string') return null;
        return { id: entry.id, name: entry.name };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
};

const findFolderById = (node, id) => {
  if (!node || node.type !== 'folder') return null;
  if (node.id === id) return node;
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (child?.type === 'folder') {
      const result = findFolderById(child, id);
      if (result) return result;
    }
  }
  return null;
};

const ensureDesktopFolders = (tree) => {
  const next = cloneTree(tree);
  const desktop = findFolderById(next, 'desktop');
  if (!desktop) return next;
  const children = Array.isArray(desktop.children) ? desktop.children : [];
  const existing = new Set(children.map((child) => child?.id).filter(Boolean));
  const newFolders = loadNewDesktopFolders();
  let changed = false;
  newFolders.forEach((folder) => {
    if (!existing.has(folder.id)) {
      children.push({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        children: [],
      });
      changed = true;
    }
  });
  if (changed) {
    desktop.children = children;
  }
  return next;
};

const normalizePathSegments = (segments = []) =>
  segments.map((segment) => segment.trim()).filter(Boolean);

const findNodeByPathNames = (root, segments = []) => {
  let current = root;
  const path = [root.id];
  const sanitized = normalizePathSegments(segments);
  for (const segment of sanitized) {
    if (!current || current.type !== 'folder') break;
    const children = Array.isArray(current.children) ? current.children : [];
    const next = children.find(
      (child) => child?.type === 'folder' && child.name.toLowerCase() === segment.toLowerCase(),
    );
    if (!next) break;
    current = next;
    path.push(current.id);
  }
  return path;
};

const findNodeByPathIds = (root, pathIds = []) => {
  if (!root) return [];
  const resolved = [];
  let current = root;
  resolved.push(current);
  const sanitized = pathIds.slice(1);
  for (const id of sanitized) {
    if (!current || current.type !== 'folder') break;
    const children = Array.isArray(current.children) ? current.children : [];
    const next = children.find((child) => child?.id === id && child.type === 'folder');
    if (!next) break;
    resolved.push(next);
    current = next;
  }
  return resolved;
};

const listDirectory = (directory) => {
  const children = Array.isArray(directory?.children) ? directory.children : [];
  const directories = children.filter((child) => child?.type === 'folder');
  const files = children.filter((child) => child?.type === 'file');
  directories.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return { directories, files };
};

const moveEntry = (tree, sourcePathIds, entryId, targetPathIds) => {
  if (!entryId || entryId === 'root') return tree;
  const next = cloneTree(tree);
  const sourceNodes = findNodeByPathIds(next, sourcePathIds);
  const targetNodes = findNodeByPathIds(next, targetPathIds);
  const source = sourceNodes[sourceNodes.length - 1];
  const target = targetNodes[targetNodes.length - 1];
  if (!source || !target || source.type !== 'folder' || target.type !== 'folder') {
    return tree;
  }
  if (source.id === target.id) return tree;
  const sourceChildren = Array.isArray(source.children) ? source.children : [];
  const index = sourceChildren.findIndex((child) => child?.id === entryId);
  if (index === -1) return tree;
  const [entry] = sourceChildren.splice(index, 1);
  const targetChildren = Array.isArray(target.children) ? target.children : [];
  const exists = targetChildren.some((child) => child?.id === entryId);
  if (!exists && entry) {
    targetChildren.push(entry);
  }
  source.children = sourceChildren;
  target.children = targetChildren;
  return next;
};

const updateFileContent = (tree, pathIds, fileId, content) => {
  if (!fileId) return tree;
  const next = cloneTree(tree);
  const nodes = findNodeByPathIds(next, pathIds);
  const directory = nodes[nodes.length - 1];
  if (!directory || directory.type !== 'folder') return tree;
  const children = Array.isArray(directory.children) ? directory.children : [];
  const target = children.find((child) => child?.id === fileId && child.type === 'file');
  if (!target) return tree;
  target.content = content;
  return next;
};

const searchFiles = (tree, query) => {
  const results = [];
  if (!query) return results;
  const lowered = query.toLowerCase();
  const walk = (node, pathParts = []) => {
    if (!node) return;
    if (node.type === 'file' && node.name.toLowerCase().includes(lowered)) {
      results.push({
        file: node,
        path: pathParts.join('/'),
      });
    }
    if (node.type === 'folder') {
      const children = Array.isArray(node.children) ? node.children : [];
      children.forEach((child) => {
        const nextPath = node.id === 'root' ? [child.name] : [...pathParts, child.name];
        walk(child, nextPath);
      });
    }
  };
  walk(tree, []);
  return results;
};

const loadFauxFileSystem = () => {
  if (!safeLocalStorage) return buildDefaultTree();
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const base = parsed && typeof parsed === 'object' ? parsed : buildDefaultTree();
    const withDesktop = ensureDesktopFolders(base);
    saveFauxFileSystem(withDesktop);
    return withDesktop;
  } catch {
    const fallback = buildDefaultTree();
    saveFauxFileSystem(fallback);
    return fallback;
  }
};

const saveFauxFileSystem = (tree) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch {
    // ignore storage errors
  }
};

export {
  loadFauxFileSystem,
  saveFauxFileSystem,
  findNodeByPathNames,
  findNodeByPathIds,
  listDirectory,
  moveEntry,
  updateFileContent,
  searchFiles,
};
