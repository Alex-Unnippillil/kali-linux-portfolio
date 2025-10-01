export class RecycleBinUndoManager {
  constructor() {
    this.stack = [];
  }

  push(operation) {
    if (!operation || !Array.isArray(operation.files) || operation.files.length === 0) return;
    const snapshot = operation.groupSnapshot
      ? {
          ...operation.groupSnapshot,
          files: Array.isArray(operation.groupSnapshot.files)
            ? operation.groupSnapshot.files.map((file) => ({ ...file }))
            : [],
        }
      : undefined;
    const safeOperation = {
      ...operation,
      groupSnapshot: snapshot,
      files: operation.files.map((file) => ({ ...file })),
    };
    this.stack.push(safeOperation);
  }

  pop() {
    if (this.stack.length === 0) return null;
    return this.stack.pop() || null;
  }

  clear() {
    this.stack = [];
  }

  get size() {
    return this.stack.length;
  }
}

export const restoreDeletion = async (operation, restorer) => {
  if (!operation || typeof restorer !== 'function') return false;
  const entries = Array.isArray(operation.files) ? operation.files : [];
  for (let i = 0; i < entries.length; i += 1) {
    await restorer(entries[i]);
  }
  return entries.length > 0;
};
