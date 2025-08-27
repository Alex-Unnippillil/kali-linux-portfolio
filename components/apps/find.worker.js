self.onmessage = async (e) => {
  const { directoryHandle, query } = e.data || {};
  if (!directoryHandle || !query) {
    self.postMessage({ done: true });
    return;
  }
  async function* iterate(dir, path = '') {
    for await (const [name, handle] of dir.entries()) {
      const fullPath = path ? `${path}/${name}` : name;
      if (handle.kind === 'file') {
        yield { handle, path: fullPath };
      } else if (handle.kind === 'directory') {
        yield* iterate(handle, fullPath);
      }
    }
  }
  for await (const { handle, path } of iterate(directoryHandle)) {
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (line.includes(query)) {
          self.postMessage({ file: path, line: idx + 1, text: line });
        }
      });
    } catch {}
  }
  self.postMessage({ done: true });
};
