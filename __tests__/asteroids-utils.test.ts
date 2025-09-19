import {
  wrap,
  createBulletPool,
  spawnBullet,
  updateBullets,
  splitAsteroidTree,
  updateShipPosition,
  handleBulletAsteroidCollision,
  spawnPowerUp,
  applyPowerUp,
  addToInventory,
  useInventory,
  POWER_UPS,
} from '@/components/apps/asteroids-utils';

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

describe('handleBulletAsteroidCollision', () => {
  it('removes asteroid on collision', () => {
    const asteroids = [{ x: 0, y: 0, dx: 0, dy: 0, r: 10 }];
    const bullet = { x: 5, y: 0, r: 2, active: true };
    const hit = handleBulletAsteroidCollision(asteroids, bullet);
    expect(hit).toBe(true);
    expect(asteroids).toHaveLength(0);
    expect(bullet.active).toBe(false);
  });
});

describe('updateShipPosition', () => {
  it('wraps ship around screen edges', () => {
    const ship = { x: 115, y: 50, velX: 0, velY: 0, r: 10 };
    updateShipPosition(ship, 100, 100);
    expect(ship.x).toBe(-5);
  });
});

describe('power-ups', () => {
  it('spawns a valid power-up', () => {
    const list = [];
    spawnPowerUp(list, 0, 0);
    expect(list).toHaveLength(1);
    expect(Object.values(POWER_UPS)).toContain(list[0].type);
  });

  it('applies effects when collected', () => {
    const ship = { shield: 0, rapidFire: 0 };
    let lives = 3;
    lives = applyPowerUp({ type: POWER_UPS.SHIELD }, ship, lives, 50, 30);
    expect(ship.shield).toBe(50);
    expect(lives).toBe(3);
    lives = applyPowerUp({ type: POWER_UPS.EXTRA_LIFE }, ship, lives);
    expect(lives).toBe(4);
    lives = applyPowerUp({ type: POWER_UPS.RAPID_FIRE }, ship, lives, 50, 40);
    expect(ship.rapidFire).toBe(40);
  });
});

describe('inventory', () => {
  it('stores and uses power-ups', () => {
    const inv: string[] = [];
    addToInventory(inv, POWER_UPS.SHIELD);
    addToInventory(inv, POWER_UPS.EXTRA_LIFE);
    const ship: any = { shield: 0, rapidFire: 0 };
    let lives = 3;
    lives = useInventory(inv, 0, ship, lives, 50, 30);
    expect(ship.shield).toBe(50);
    expect(inv).toHaveLength(1);
    lives = useInventory(inv, 0, ship, lives, 50, 30);
    expect(lives).toBe(4);
    expect(inv).toHaveLength(0);
  });
});
