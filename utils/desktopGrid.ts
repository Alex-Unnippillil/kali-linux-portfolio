import { safeLocalStorage } from './safeStorage';

const STORAGE_KEY = 'desktop-grid:v1';

type LabelGetter = (id: string) => string;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const readStorage = (): string[] => {
  if (!safeLocalStorage) return [];
  try {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (isStringArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

const writeStorage = (order: string[]) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // ignore write errors
  }
};

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * Merge the stored desktop grid order with the provided ids.
 * Ensures removed icons are dropped and new ones are appended.
 */
export const syncDesktopGrid = (ids: string[]): string[] => {
  if (!ids.length) {
    writeStorage([]);
    return [];
  }

  const stored = readStorage();
  if (!stored.length) {
    writeStorage(ids);
    return [...ids];
  }

  const preserved = stored.filter((id) => ids.includes(id));
  const extras = ids.filter((id) => !preserved.includes(id));
  const combined = [...preserved, ...extras];

  if (!arraysEqual(stored, combined)) {
    writeStorage(combined);
  }

  return combined;
};

/**
 * Arrange icons alphabetically (locale aware) and persist the order.
 */
export const arrangeDesktopGrid = (
  ids: string[],
  getLabel: LabelGetter,
): string[] => {
  if (!ids.length) {
    writeStorage([]);
    return [];
  }

  const arranged = [...ids].sort((a, b) => {
    const labelA = getLabel(a) || a;
    const labelB = getLabel(b) || b;
    return labelA.localeCompare(labelB, undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  });

  writeStorage(arranged);
  return arranged;
};

/**
 * Persist the provided order without re-sorting.
 */
export const saveDesktopGrid = (ids: string[]) => {
  if (!ids.length) {
    writeStorage([]);
    return;
  }
  writeStorage([...ids]);
};

/**
 * Clear stored grid order. Primarily useful for tests or session resets.
 */
export const clearDesktopGrid = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
