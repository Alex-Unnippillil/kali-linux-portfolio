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
