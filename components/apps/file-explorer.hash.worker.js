import { createDuplicateGroups } from '../../modules/fileExplorer/hashUtils';

const state = {
  cancelled: false,
};

const resetState = () => {
  state.cancelled = false;
};

const traverseFiles = async (directoryHandle, path = [], collection = []) => {
  if (!directoryHandle || state.cancelled) return collection;
  for await (const [name, handle] of directoryHandle.entries()) {
    if (state.cancelled) return collection;
    if (handle.kind === 'file') {
      collection.push({ path: [...path, name], handle });
    } else if (handle.kind === 'directory') {
      await traverseFiles(handle, [...path, name], collection);
      if (state.cancelled) return collection;
    }
  }
  return collection;
};

const hashBuffer = async (buffer) => {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const view = new Uint8Array(digest);
  let hash = '';
  for (let i = 0; i < view.length; i += 1) {
    const hex = view[i].toString(16).padStart(2, '0');
    hash += hex;
  }
  return hash;
};

self.onmessage = async (event) => {
  const { type } = event.data || {};
  if (type === 'cancel') {
    state.cancelled = true;
    return;
  }

  if (type !== 'start') return;

  resetState();

  const { directoryHandle } = event.data;
  if (!directoryHandle) {
    self.postMessage({ type: 'error', message: 'No directory handle provided' });
    return;
  }

  try {
    const files = await traverseFiles(directoryHandle);
    if (state.cancelled) {
      self.postMessage({ type: 'cancelled' });
      return;
    }

    const total = files.length;
    if (total === 0) {
      self.postMessage({ type: 'complete', groups: [] });
      return;
    }

    const records = [];
    for (let index = 0; index < files.length; index += 1) {
      if (state.cancelled) {
        self.postMessage({ type: 'cancelled' });
        return;
      }
      const fileEntry = files[index];
      const file = await fileEntry.handle.getFile();
      const arrayBuffer = await file.arrayBuffer();
      const hash = await hashBuffer(arrayBuffer);
      records.push({
        hash,
        size: file.size,
        segments: fileEntry.path,
        name: file.name,
        type: file.type,
        content: arrayBuffer,
      });
      self.postMessage({
        type: 'progress',
        processed: index + 1,
        total,
      });
    }

    const groups = createDuplicateGroups(records);
    self.postMessage({ type: 'complete', groups });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'Scan failed' });
  }
};
