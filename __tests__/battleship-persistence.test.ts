import { randomizePlacement } from '../apps/games/battleship/ai';
import {
  LAYOUT_STORAGE_KEY,
  expandLayout,
  isValidLayout,
  serializeShips,
  loadLayout,
  saveLayout,
  StoredLayout,
} from '../apps/games/battleship/state';

const createStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
};

test('randomized layouts are valid and expand to include cell coordinates', () => {
  const layout = randomizePlacement(true);
  const stored = serializeShips(layout);
  expect(isValidLayout(stored)).toBe(true);
  const expanded = expandLayout(stored);
  expanded.forEach((ship, idx) => {
    expect(ship.cells.length).toBe(ship.len);
    ship.cells.forEach((cell) => {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(100);
    });
    expect(ship.len).toBe(layout[idx].len);
  });
});

test('save and load round-trip preserves layout', () => {
  const storage = createStorage();
  const layout = serializeShips(randomizePlacement(true));
  saveLayout(layout, storage);
  const restored = loadLayout(storage);
  expect(restored).toEqual(layout);
});

test('invalid layouts are rejected and not written', () => {
  const storage = createStorage();
  const invalid: StoredLayout = [
    { len: 5, x: 0, y: 0, dir: 0 },
    { len: 4, x: 0, y: 1, dir: 0 },
    { len: 3, x: 0, y: 3, dir: 0 },
    { len: 3, x: 6, y: 5, dir: 1 },
    { len: 2, x: 9, y: 7, dir: 1 },
  ];
  expect(isValidLayout(invalid)).toBe(false);
  expect(() => saveLayout(invalid, storage)).toThrow('Invalid layout');
  expect(storage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
});

test('loadLayout returns null for corrupt data', () => {
  const storage = createStorage();
  storage.setItem(
    LAYOUT_STORAGE_KEY,
    JSON.stringify([{ len: 5, x: -2, y: 0, dir: 0 }]),
  );
  expect(loadLayout(storage)).toBeNull();
});
