export const SNIPPET_KEY = 'r2-snippets';

export const loadSnippets = () => {
  try {
    const raw = localStorage.getItem(SNIPPET_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveSnippet = (name, command) => {
  const snippets = loadSnippets();
  const newSnippets = [...snippets, { name, command }];
  localStorage.setItem(SNIPPET_KEY, JSON.stringify(newSnippets));
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

const NOTES_PREFIX = 'r2-notes-';
const BOOKMARK_PREFIX = 'r2-bookmarks-';

export const loadNotes = (file) => {
  try {
    const raw = localStorage.getItem(NOTES_PREFIX + file);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveNotes = (file, notes) => {
  localStorage.setItem(NOTES_PREFIX + file, JSON.stringify(notes));
};

export const loadBookmarks = (file) => {
  try {
    const raw = localStorage.getItem(BOOKMARK_PREFIX + file);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveBookmarks = (file, bookmarks) => {
  localStorage.setItem(BOOKMARK_PREFIX + file, JSON.stringify(bookmarks));
};
