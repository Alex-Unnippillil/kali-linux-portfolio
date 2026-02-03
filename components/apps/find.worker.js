let activeIndexId = 0;
let fileIndex = [];

async function* iterateDirectory(dir, path = '') {
  for await (const [name, handle] of dir.entries()) {
    const fullPath = path ? `${path}/${name}` : name;
    if (handle.kind === 'file') {
      yield { handle, path: fullPath };
    } else if (handle.kind === 'directory') {
      yield* iterateDirectory(handle, fullPath);
    }
  }
}

async function buildIndex(directoryHandle, indexId) {
  fileIndex = [];
  let indexed = 0;
  for await (const { handle, path } of iterateDirectory(directoryHandle)) {
    if (indexId !== activeIndexId) return;
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      fileIndex.push({ path, lines });
      indexed += 1;
      self.postMessage({ type: 'index-progress', indexed });
    } catch {
      indexed += 1;
      self.postMessage({ type: 'index-progress', indexed });
    }
  }
  if (indexId === activeIndexId) {
    self.postMessage({ type: 'index-complete', total: indexed });
  }
}

self.onmessage = async (e) => {
  const { type, directoryHandle, query } = e.data || {};
  if (type === 'index') {
    if (!directoryHandle) {
      self.postMessage({ type: 'index-complete', total: 0 });
      return;
    }
    activeIndexId += 1;
    buildIndex(directoryHandle, activeIndexId);
    return;
  }
  if (type === 'search') {
    if (!query) {
      self.postMessage({ type: 'search-complete' });
      return;
    }
    for (const entry of fileIndex) {
      entry.lines.forEach((line, idx) => {
        if (line.includes(query)) {
          self.postMessage({
            type: 'search-result',
            file: entry.path,
            line: idx + 1,
            text: line,
          });
        }
      });
    }
    self.postMessage({ type: 'search-complete' });
  }
};
