export const stagePatch = (base, patches, offset, value) => {
  const original = base[offset];
  const next = patches.filter((p) => p.offset !== offset);
  const norm =
    typeof value === 'string' ? value.trim().slice(0, 2).toLowerCase() : '';
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

export const validatePatchImport = (data, baseLength = Infinity) => {
  if (!Array.isArray(data)) {
    return { patches: [], errors: ['Import must be a JSON array of patches.'] };
  }
  const errors = [];
  const patches = [];
  data.forEach((patch, index) => {
    if (!patch || typeof patch !== 'object') {
      errors.push(`Patch ${index + 1} must be an object.`);
      return;
    }
    const { offset, value, original } = patch;
    if (!Number.isInteger(offset) || offset < 0) {
      errors.push(`Patch ${index + 1} has an invalid offset.`);
      return;
    }
    if (offset >= baseLength) {
      errors.push(`Patch ${index + 1} offset exceeds file length.`);
      return;
    }
    if (typeof value !== 'string' || !/^[0-9a-f]{2}$/i.test(value.trim())) {
      errors.push(`Patch ${index + 1} has an invalid value.`);
      return;
    }
    if (
      typeof original !== 'undefined' &&
      (typeof original !== 'string' || !/^[0-9a-f]{2}$/i.test(original.trim()))
    ) {
      errors.push(`Patch ${index + 1} has an invalid original byte.`);
      return;
    }
    patches.push({
      offset,
      value: value.trim().toLowerCase(),
      original:
        typeof original === 'string' ? original.trim().toLowerCase() : undefined,
    });
  });
  return { patches, errors };
};
