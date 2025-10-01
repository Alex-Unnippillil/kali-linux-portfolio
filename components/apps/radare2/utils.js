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
const ANNOTATION_PREFIX = 'r2-annotations-';
const SNAPSHOT_PREFIX = 'r2-annotation-snapshot-';

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

const sortAnnotationEntries = (entries = []) =>
  [...entries].sort((a, b) => {
    const parse = (value) => {
      if (typeof value !== 'string') return Number.MAX_SAFE_INTEGER;
      const normalized = value.toLowerCase().startsWith('0x')
        ? value
        : `0x${value}`;
      const parsed = Number.parseInt(normalized, 16);
      return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
    };
    return parse(a[0]) - parse(b[0]);
  });

export const normalizeAnnotations = (annotations = {}) => {
  const entries = Object.entries(annotations || {});
  if (!entries.length) return {};
  const next = {};
  entries.forEach(([addr, value]) => {
    if (!value) return;
    const label = typeof value.label === 'string' ? value.label.trim() : '';
    const comment =
      typeof value.comment === 'string' ? value.comment.trim() : '';
    if (!label && !comment) return;
    next[addr] = { ...value };
    if (label) next[addr].label = label;
    else delete next[addr].label;
    if (comment) next[addr].comment = comment;
    else delete next[addr].comment;
  });
  return next;
};

export const annotationsEqual = (a = {}, b = {}) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    const va = a[key] || {};
    const vb = b[key] || {};
    return (va.label || '') === (vb.label || '') && (va.comment || '') === (vb.comment || '');
  });
};

export const loadAnnotations = (file) => {
  try {
    const raw = localStorage.getItem(ANNOTATION_PREFIX + file);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return normalizeAnnotations(data);
  } catch (e) {
    return {};
  }
};

export const saveAnnotations = (file, annotations) => {
  const normalized = normalizeAnnotations(annotations);
  localStorage.setItem(ANNOTATION_PREFIX + file, JSON.stringify(normalized));
  return normalized;
};

export const loadAnnotationSnapshot = (file) => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_PREFIX + file);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const saveAnnotationSnapshot = (file, snapshot) => {
  localStorage.setItem(SNAPSHOT_PREFIX + file, JSON.stringify(snapshot));
  return snapshot;
};

export const snapshotToAnnotations = (snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.annotations)) return {};
  const out = {};
  snapshot.annotations.forEach((entry) => {
    if (!entry || !entry.addr) return;
    const label = typeof entry.label === 'string' ? entry.label : '';
    const comment = typeof entry.comment === 'string' ? entry.comment : '';
    if (!label && !comment) return;
    out[entry.addr] = normalizeAnnotations({
      [entry.addr]: { label, comment },
    })[entry.addr];
  });
  return out;
};

export const buildAnnotationSnapshot = (file, disasm = [], annotations = {}) => {
  const normalized = normalizeAnnotations(annotations);
  const disasmMap = new Map(
    (disasm || []).map((line) => [line.addr, line.text || '']),
  );
  const annotationsArray = sortAnnotationEntries(Object.entries(normalized)).map(
    ([addr, value]) => ({
      addr,
      label: value.label || null,
      comment: value.comment || null,
      text: disasmMap.get(addr) || null,
    }),
  );
  return {
    version: 1,
    file,
    generatedAt: new Date().toISOString(),
    annotations: annotationsArray,
  };
};

export const persistAnnotations = (file, disasm, annotations) => {
  const normalized = normalizeAnnotations(annotations);
  if (typeof window === 'undefined') return normalized;
  saveAnnotations(file, normalized);
  const snapshot = buildAnnotationSnapshot(file, disasm, normalized);
  saveAnnotationSnapshot(file, snapshot);
  return normalized;
};

export const createAnnotationExport = (file, disasm = [], annotations = {}) => {
  const normalized = normalizeAnnotations(annotations);
  const disasmMap = new Map(
    (disasm || []).map((line) => [line.addr, { ...line }]),
  );
  const annotatedLines = sortAnnotationEntries(Object.entries(normalized)).map(
    ([addr, value]) => ({
      addr,
      label: value.label || null,
      comment: value.comment || null,
      text: disasmMap.get(addr)?.text || null,
    }),
  );
  return {
    schemaVersion: 1,
    file,
    generatedAt: new Date().toISOString(),
    annotations: annotatedLines,
    disassembly: (disasm || []).map((line) => ({ ...line })),
  };
};

export const createHistory = (initial = {}) => ({
  past: [],
  present: initial,
  future: [],
});

export const pushHistory = (history, nextPresent, meta) => {
  if (annotationsEqual(history.present, nextPresent)) return history;
  return {
    past: [...history.past, { state: history.present, meta }],
    present: nextPresent,
    future: [],
  };
};

export const undoHistory = (history) => {
  if (!history.past.length) return history;
  const past = [...history.past];
  const previous = past.pop();
  return {
    past,
    present: previous.state,
    future: [{ state: history.present, meta: previous.meta }, ...history.future],
  };
};

export const redoHistory = (history) => {
  if (!history.future.length) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, { state: history.present, meta: next.meta }],
    present: next.state,
    future: rest,
  };
};
