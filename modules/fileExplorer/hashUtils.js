const toUint8 = (buffer) => {
  if (!buffer) return new Uint8Array();
  if (buffer instanceof Uint8Array) return buffer;
  if (buffer.buffer instanceof ArrayBuffer && buffer.byteLength !== undefined) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer);
};

export const buffersEqual = (a, b) => {
  if (a === b) return true;
  const viewA = toUint8(a);
  const viewB = toUint8(b);
  if (viewA.byteLength !== viewB.byteLength) return false;
  for (let i = 0; i < viewA.byteLength; i += 1) {
    if (viewA[i] !== viewB[i]) return false;
  }
  return true;
};

export const createDuplicateGroups = (records = []) => {
  const byHash = new Map();
  records.forEach((record) => {
    if (!record || !record.hash) return;
    const existing = byHash.get(record.hash) || [];
    existing.push(record);
    byHash.set(record.hash, existing);
  });

  const groups = [];
  let counter = 0;

  byHash.forEach((items, hash) => {
    if (!Array.isArray(items) || items.length < 2) return;

    const partitions = [];

    items.forEach((item) => {
      if (!item) return;
      const size = item.size ?? (item.content ? toUint8(item.content).byteLength : 0);
      const segments = Array.isArray(item.segments)
        ? item.segments
        : Array.isArray(item.path)
        ? item.path
        : [];
      const pathString = item.pathString || segments.join('/');
      const name = item.name || segments[segments.length - 1] || pathString;
      const candidate = {
        hash,
        size,
        segments,
        path: pathString,
        name,
        type: item.type || '',
        content: item.content,
      };

      let matched = false;
      for (let i = 0; i < partitions.length; i += 1) {
        const part = partitions[i];
        if (part.size !== size) continue;
        if (buffersEqual(part.content, candidate.content)) {
          part.items.push(candidate);
          matched = true;
          break;
        }
      }
      if (!matched) {
        partitions.push({ size, content: candidate.content, items: [candidate] });
      }
    });

    partitions.forEach((partition) => {
      if (!partition || partition.items.length < 2) return;
      const files = partition.items.map((entry) => ({
        path: entry.path,
        segments: [...entry.segments],
        name: entry.name,
        size: entry.size,
        type: entry.type,
      }));
      counter += 1;
      groups.push({
        id: `${hash}-${counter}`,
        hash,
        size: partition.size,
        files,
      });
    });
  });

  return groups;
};
