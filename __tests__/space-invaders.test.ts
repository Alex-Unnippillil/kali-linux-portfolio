import { bulletHitsInvader, waveAdvance } from '../components/apps/space-invaders';

describe('space invaders mechanics', () => {
  test('collision removes invader', () => {
    const invader = { x: 0, y: 0, alive: true } as any;
    const bullet = { x: 5, y: 5 } as any;
    const hit = bulletHitsInvader(invader, bullet);
    if (hit) invader.alive = false;
    expect(invader.alive).toBe(false);
  });

  test('wave advances correctly', () => {
    const cleared = [{ alive: false }, { alive: false }] as any[];
    const next = waveAdvance(cleared, 1);
    expect(next).toBe(2);
    const ongoing = [{ alive: true }] as any[];
    const same = waveAdvance(ongoing, 1);
    expect(same).toBe(1);
  });
});
