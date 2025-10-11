import { getMedal, checkCollision } from '../components/apps/car-racer';
import {
  loadHighScore,
  recordHighScore,
} from '../components/apps/Games/common/useHighScore';

describe('car racer medals', () => {
  test('awards medals based on score', () => {
    expect(getMedal(0)).toBeNull();
    expect(getMedal(600)).toBe('bronze');
    expect(getMedal(1100)).toBe('silver');
    expect(getMedal(1600)).toBe('gold');
  });
});

describe('car racer collisions', () => {
  test('detects overlapping entities in the same lane', () => {
    const car = { lane: 1, y: 100, height: 50 };
    const obstacle = { lane: 1, y: 120, height: 40 };
    expect(checkCollision(car, obstacle)).toBe(true);
  });

  test('ignores obstacles in different lanes or far apart', () => {
    const car = { lane: 1, y: 100, height: 50 };
    expect(checkCollision(car, { lane: 2, y: 120, height: 40 })).toBe(false);
    expect(checkCollision(car, { lane: 1, y: 200, height: 40 })).toBe(false);
  });
});

class MemoryStorage {
  private store = new Map<string, string>();

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.store.set(key, value));
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('car racer high score persistence', () => {
  test('records new personal bests and ignores lower scores', () => {
    const storage = new MemoryStorage();
    expect(loadHighScore('car-racer', { storage })).toBe(0);
    recordHighScore('car-racer', 500, { storage });
    expect(loadHighScore('car-racer', { storage })).toBe(500);
    recordHighScore('car-racer', 200, { storage });
    expect(loadHighScore('car-racer', { storage })).toBe(500);
    recordHighScore('car-racer', 900, { storage });
    expect(loadHighScore('car-racer', { storage })).toBe(900);
  });

  test('migrates legacy keys on first read', () => {
    const storage = new MemoryStorage({ 'legacy-car-racer': '750' });
    expect(
      loadHighScore('car-racer', { storage, legacyKeys: ['legacy-car-racer'] }),
    ).toBe(750);
    expect(storage.getItem('game:highscore:car-racer')).toBe('750');
  });
});
