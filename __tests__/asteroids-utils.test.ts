import { wrap, createBulletPool, spawnBullet, updateBullets, splitAsteroidTree } from '../components/apps/asteroids-utils';

describe('wrap', () => {
  it('wraps positive overflow', () => {
    expect(wrap(105, 100)).toBe(5);
  });
  it('wraps negative values', () => {
    expect(wrap(-5, 100)).toBe(95);
  });
  it('wraps with margin', () => {
    expect(wrap(115, 100, 10)).toBe(-5);
    expect(wrap(-15, 100, 10)).toBe(105);
  });
});

describe('bullet pool', () => {
  it('reuses bullets after they expire', () => {
    const pool = createBulletPool(1);
    const first = spawnBullet(pool, 0, 0, 0, 0, 1);
    updateBullets(pool); // bullet expires
    const second = spawnBullet(pool, 0, 0, 0, 0, 1);
    expect(second).toBe(first);
  });

  it('returns null when pool exhausted', () => {
    const pool = createBulletPool(1);
    spawnBullet(pool, 0, 0, 0, 0, 10);
    const second = spawnBullet(pool, 0, 0, 0, 0, 10);
    expect(second).toBeNull();
  });
});

describe('splitAsteroidTree', () => {
  it('creates a balanced split tree', () => {
    const tree = splitAsteroidTree(80, 20);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].children).toHaveLength(2);
    const leafSizes = [
      tree.children[0].children[0].size,
      tree.children[0].children[1].size,
      tree.children[1].children[0].size,
      tree.children[1].children[1].size,
    ];
    expect(leafSizes.every((s) => s === 20)).toBe(true);
  });
});
