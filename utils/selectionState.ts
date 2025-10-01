export type SelectionValue = string | number;

export function toggleSelection<T extends SelectionValue>(
  current: ReadonlySet<T>,
  value: T | null | undefined,
): Set<T> {
  if (value == null) {
    return new Set(current);
  }
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function replaceSelection<T extends SelectionValue>(
  value: T | null | undefined,
): Set<T> {
  const next = new Set<T>();
  if (value != null) {
    next.add(value);
  }
  return next;
}

export function selectRange<T extends SelectionValue>(
  current: ReadonlySet<T>,
  order: Array<T | null | undefined>,
  anchorIndex: number,
  targetIndex: number,
  options: { additive?: boolean } = {},
): Set<T> {
  const { additive = false } = options;
  const next = additive ? new Set(current) : new Set<T>();
  if (!Array.isArray(order) || order.length === 0) {
    return next;
  }
  const clampedAnchor = Math.max(0, Math.min(order.length - 1, anchorIndex));
  const clampedTarget = Math.max(0, Math.min(order.length - 1, targetIndex));
  const start = Math.min(clampedAnchor, clampedTarget);
  const end = Math.max(clampedAnchor, clampedTarget);
  for (let index = start; index <= end; index += 1) {
    const id = order[index];
    if (id != null) {
      next.add(id);
    }
  }
  return next;
}

export function pruneSelection<T extends SelectionValue>(
  current: ReadonlySet<T>,
  validValues: Iterable<T>,
): Set<T> {
  const valid = new Set(validValues);
  if (valid.size === 0) {
    return current.size === 0 ? (current as Set<T>) : new Set<T>();
  }
  let changed = false;
  const next = new Set<T>();
  current.forEach((value) => {
    if (valid.has(value)) {
      next.add(value);
    } else {
      changed = true;
    }
  });
  if (!changed && next.size === current.size) {
    return current as Set<T>;
  }
  return next;
}
