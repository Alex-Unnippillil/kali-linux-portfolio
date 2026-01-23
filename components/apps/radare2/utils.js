export const SNIPPET_KEY = 'r2-snippets';
const NOTES_PREFIX = 'r2-notes-';
const BOOKMARK_PREFIX = 'r2-bookmarks-';
const PATCHES_PREFIX = 'r2-patches-';

const safeStorageGet = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const safeStorageSet = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* ignore storage errors */
  }
};

export const loadSnippets = () => {
  const raw = safeStorageGet(SNIPPET_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveSnippet = (name, command) => {
  const snippets = loadSnippets();
  const newSnippets = [...snippets, { name, command }];
  safeStorageSet(SNIPPET_KEY, JSON.stringify(newSnippets));
  return newSnippets;
};

export const convertAnalysisToGhidra = (analysis) => {
  const lines = analysis.split('\n');
  const functions = {};
  lines.forEach((line) => {
    const match = line.match(/(\w+)\s*->\s*(\w+)/);
    if (match) {
      const [, from, to] = match;
      if (!functions[from]) functions[from] = new Set();
      functions[from].add(to);
      if (!functions[to]) functions[to] = new Set();
    }
  });
  return {
    functions: Object.keys(functions).map((name) => ({
      name,
      calls: Array.from(functions[name]),
    })),
  };
};

export const parseGraph = (analysis) => {
  if (!analysis) return { nodes: [], links: [] };
  const ghidra = convertAnalysisToGhidra(analysis);
  const nodes = ghidra.functions.map((f) => ({ id: f.name }));
  const links = [];
  ghidra.functions.forEach((f) => {
    f.calls.forEach((c) => links.push({ source: f.name, target: c }));
  });
  return { nodes, links };
};

export const extractStrings = (hex, baseAddr = '0x0') => {
  const bytes = (hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16));
  const base = parseInt(baseAddr, 16) || 0;
  const results = [];
  const isPrintable = (c) => c >= 0x20 && c <= 0x7e;
  for (let i = 0; i < bytes.length; i++) {
    if (isPrintable(bytes[i]) && bytes[i + 1] === 0x00) {
      let j = i;
      let s = '';
      while (
        j + 1 < bytes.length &&
        isPrintable(bytes[j]) &&
        bytes[j + 1] === 0x00
      ) {
        s += String.fromCharCode(bytes[j]);
        j += 2;
      }
      if (s.length >= 2) {
        results.push({ addr: '0x' + (base + i).toString(16), text: s });
        i = j - 1;
        continue;
      }
    }
    if (isPrintable(bytes[i])) {
      let j = i;
      let s = '';
      while (j < bytes.length && isPrintable(bytes[j])) {
        s += String.fromCharCode(bytes[j]);
        j++;
      }
      if (s.length >= 4)
        results.push({ addr: '0x' + (base + i).toString(16), text: s });
      i = j - 1;
    }
  }
  return results;
};

export const loadNotes = (file) => {
  const raw = safeStorageGet(NOTES_PREFIX + file);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveNotes = (file, notes) => {
  safeStorageSet(NOTES_PREFIX + file, JSON.stringify(notes));
};

export const loadBookmarks = (file) => {
  const raw = safeStorageGet(BOOKMARK_PREFIX + file);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveBookmarks = (file, bookmarks) => {
  safeStorageSet(BOOKMARK_PREFIX + file, JSON.stringify(bookmarks));
};

export const loadPatches = (file) => {
  const raw = safeStorageGet(PATCHES_PREFIX + file);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

export const savePatches = (file, patches) => {
  safeStorageSet(PATCHES_PREFIX + file, JSON.stringify(patches));
};
