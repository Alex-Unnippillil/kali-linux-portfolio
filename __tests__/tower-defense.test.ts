import {
  ENEMY_TYPES,
  getTowerDPS,
  getTowerStatsAtLevel,
  getUpgradeCost,
  TOWER_TYPES,
} from '../apps/games/tower-defense';

describe('tower defense data model', () => {
  test('enemy roster has classic archetypes', () => {
    expect(ENEMY_TYPES).toHaveProperty('normal');
    expect(ENEMY_TYPES).toHaveProperty('fast');
    expect(ENEMY_TYPES).toHaveProperty('tank');
  });

  test('tower roster has four build options', () => {
    expect(Object.keys(TOWER_TYPES)).toEqual(['basic', 'rapid', 'sniper', 'splash']);
  });

  test('tower DPS increases with upgrades', () => {
    const base = getTowerDPS('basic', 1);
    const upgraded = getTowerDPS('basic', 3);
    expect(upgraded).toBeGreaterThan(base);
  });

  test('upgrade costs scale with tower level', () => {
    const lv1 = getUpgradeCost('sniper', 1);
    const lv2 = getUpgradeCost('sniper', 2);
    expect(lv2).toBeGreaterThan(lv1);
  });

  test('tower stats helper returns sane values', () => {
    const stats = getTowerStatsAtLevel('splash', 2);
    expect(stats.damage).toBeGreaterThan(0);
    expect(stats.range).toBeGreaterThan(0);
    expect(stats.fireRate).toBeGreaterThan(0);
  });
});
