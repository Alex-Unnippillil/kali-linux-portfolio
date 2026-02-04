import {
  buildSearchOptions,
  isBinaryContent,
  lineMatches,
  normalizeNeedle,
} from './find.worker.shared';

let cancelled = false;

self.onmessage = async (e) => {
  const data = e.data || {};
  if (data?.type === 'cancel') {
    cancelled = true;
    return;
  }

  const { directoryHandle, query, options } = data;
  if (!directoryHandle || !query) {
    self.postMessage({ type: 'done' });
    return;
  }
  cancelled = false;
  const searchOptions = buildSearchOptions(options);
  const needle = normalizeNeedle(query, searchOptions);
  let scanned = 0;
  let skipped = 0;

  async function* iterate(dir, path = '') {
    if (typeof dir.entries === 'function') {
      for await (const [name, handle] of dir.entries()) {
        if (cancelled) return;
        const fullPath = path ? `${path}/${name}` : name;
        if (handle.kind === 'file') {
          yield { handle, path: fullPath };
        } else if (handle.kind === 'directory') {
          yield* iterate(handle, fullPath);
        }
      }
      return;
    }
    if (typeof dir.values === 'function') {
      for await (const handle of dir.values()) {
        if (cancelled) return;
        const name = handle.name || 'untitled';
        const fullPath = path ? `${path}/${name}` : name;
        if (handle.kind === 'file') {
          yield { handle, path: fullPath };
        } else if (handle.kind === 'directory') {
          yield* iterate(handle, fullPath);
        }
      }
    }
  }

  for await (const { handle, path } of iterate(directoryHandle)) {
    if (cancelled) break;
    try {
      const file = await handle.getFile();
      if (!searchOptions.allowLargeFiles && file.size > searchOptions.maxFileSizeBytes) {
        skipped += 1;
        scanned += 1;
        self.postMessage({ type: 'progress', scanned, skipped });
        continue;
      }
      if (searchOptions.skipBinary) {
        const slice = await file.slice(0, 4096).arrayBuffer();
        if (isBinaryContent(slice)) {
          skipped += 1;
          scanned += 1;
          self.postMessage({ type: 'progress', scanned, skipped });
          continue;
        }
      }
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (lineMatches(line, needle, searchOptions)) {
          self.postMessage({ type: 'result', file: path, line: idx + 1, text: line });
        }
      });
      scanned += 1;
      if (scanned % 5 === 0) {
        self.postMessage({ type: 'progress', scanned, skipped });
      }
    } catch {
      skipped += 1;
    }
  }
  self.postMessage({ type: 'done', scanned, skipped, cancelled });
};
