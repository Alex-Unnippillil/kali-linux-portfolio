import { stagePatch, applyPatches, exportPatches } from './patchUtils';

let paused = false;
let base = [];
let patches = [];
let history = [];
let future = [];

const patchesEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every(
    (patch, idx) =>
      patch.offset === b[idx].offset &&
      patch.value === b[idx].value &&
      patch.original === b[idx].original,
  );
};

const postState = () => {
  const bytes = applyPatches(base, patches);
  postMessage({
    type: 'bytes',
    bytes,
    patches,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  });
};

self.onmessage = (e) => {
  const data = e.data || {};
  if (data.type === 'pause') {
    paused = true;
    return;
  }
  if (data.type === 'resume') {
    paused = false;
    return;
  }
  if (paused) return;
  if (data.type === 'hex') {
    const hex = (data.hex || '').replace(/[^0-9a-fA-F]/g, '');
    base = hex.match(/.{1,2}/g) || [];
    patches = [];
    history = [];
    future = [];
    postState();
  } else if (data.type === 'patch') {
    const { offset, value } = data;
    const next = stagePatch(base, patches, offset, value);
    if (!patchesEqual(next, patches)) {
      history = [...history, patches];
      patches = next;
      future = [];
    }
    postState();
  } else if (data.type === 'revert') {
    const next = patches.filter((patch) => patch.offset !== data.offset);
    if (!patchesEqual(next, patches)) {
      history = [...history, patches];
      patches = next;
      future = [];
    }
    postState();
  } else if (data.type === 'clear') {
    if (patches.length > 0) {
      history = [...history, patches];
      patches = [];
      future = [];
    }
    postState();
  } else if (data.type === 'load') {
    const incoming = Array.isArray(data.patches) ? data.patches : [];
    patches = incoming.reduce(
      (acc, patch) => stagePatch(base, acc, patch.offset, patch.value),
      [],
    );
    history = [];
    future = [];
    postState();
  } else if (data.type === 'import') {
    const incoming = Array.isArray(data.patches) ? data.patches : [];
    const next = incoming.reduce(
      (acc, patch) => stagePatch(base, acc, patch.offset, patch.value),
      [],
    );
    if (!patchesEqual(next, patches)) {
      history = [...history, patches];
      patches = next;
      future = [];
    }
    postState();
  } else if (data.type === 'undo') {
    const prev = history[history.length - 1];
    if (prev) {
      history = history.slice(0, -1);
      future = [patches, ...future];
      patches = prev;
      postState();
    }
  } else if (data.type === 'redo') {
    const next = future[0];
    if (next) {
      future = future.slice(1);
      history = [...history, patches];
      patches = next;
      postState();
    }
  } else if (data.type === 'export') {
    postMessage({ type: 'export', patches: exportPatches(patches) });
  }
};
