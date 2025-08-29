import { stagePatch, applyPatches, exportPatches } from './patchUtils';

let paused = false;
let base = [];
let patches = [];

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
    postMessage({ type: 'bytes', bytes: base, patches });
  } else if (data.type === 'patch') {
    const { offset, value } = data;
    patches = stagePatch(base, patches, offset, value);
    const bytes = applyPatches(base, patches);
    postMessage({ type: 'bytes', bytes, patches });
  } else if (data.type === 'export') {
    postMessage({ type: 'export', patches: exportPatches(patches) });
  }
};
