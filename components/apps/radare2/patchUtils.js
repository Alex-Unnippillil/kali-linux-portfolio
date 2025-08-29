export const stagePatch = (base, patches, offset, value) => {
  const original = base[offset];
  const next = patches.filter((p) => p.offset !== offset);
  const norm = typeof value === 'string' ? value.trim().slice(0, 2).toLowerCase() : '';
  if (
    typeof original !== 'undefined' &&
    /^[0-9a-f]{2}$/i.test(norm) &&
    original.toLowerCase() !== norm
  ) {
    next.push({ offset, original, value: norm });
  }
  return next;
};

export const applyPatches = (base, patches) => {
  const out = [...base];
  patches.forEach(({ offset, value }) => {
    if (offset >= 0 && offset < out.length) out[offset] = value;
  });
  return out;
};

export const exportPatches = (patches) => patches;
