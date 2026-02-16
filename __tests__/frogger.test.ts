import {
  applyForwardProgressScore,
  clampDelta,
  createHomes,
  initLane,
  makeRng,
  resolveHomeEntry,
  tickTimer,
  updateLogs,
} from '../components/apps/frogger/engine';
import { PAD_POSITIONS } from '../components/apps/frogger';

describe('frogger engine (classic)', () => {
  test('home bay occupancy rules (occupied kills, valid succeeds)', () => {
    const homes = createHomes();
    const success = resolveHomeEntry({ x: PAD_POSITIONS[0], y: 0 }, homes, false);
    expect(success.dead).toBe(false);
    expect(success.score).toBe(50);

    const occupied = resolveHomeEntry(
      { x: PAD_POSITIONS[0], y: 0 },
      success.homes,
      false,
    );
    expect(occupied.dead).toBe(true);
    expect(occupied.cause).toBe('occupied_home');
  });

  test('timer reaching zero causes timeout', () => {
    const timed = tickTimer(0.3, 0.35);
    expect(timed.timeLeft).toBe(0);
    expect(timed.timedOut).toBe(true);
  });

  test('turtle diving kills frog on submerge moment', () => {
    const lane = initLane(
      { y: 2, dir: 1, speed: 0, spawnRate: 10, length: 2, kind: 'turtle' },
      7,
    );
    lane.entities = [{ x: 3, phase: -Math.PI / 2 }];
    const res = updateLogs([lane], { x: 3.2, y: 2 }, 0.016);
    expect(res.dead).toBe(true);
    expect(res.deathCause).toBe('turtle_dive');
  });

  test('alligator mouth unsafe but tail safe', () => {
    const lane = initLane(
      { y: 5, dir: 1, speed: 0, spawnRate: 10, length: 3, kind: 'gator' },
      8,
    );
    lane.entities = [{ x: 2 }];
    const safeTail = updateLogs([lane], { x: 2.2, y: 5 }, 0.016);
    expect(safeTail.dead).toBe(false);

    const unsafeMouth = updateLogs([lane], { x: 4.7, y: 5 }, 0.016);
    expect(unsafeMouth.dead).toBe(true);
    expect(unsafeMouth.deathCause).toBe('gator_mouth');
  });

  test('carried off-screen death condition', () => {
    const lane = initLane(
      { y: 1, dir: -1, speed: 2, spawnRate: 10, length: 3, kind: 'log' },
      10,
    );
    lane.entities = [{ x: 0 }];
    const result = updateLogs([lane], { x: 0.2, y: 1 }, 1);
    expect(result.dead).toBe(true);
    expect(result.deathCause).toBe('offscreen');
  });

  test('scoring cannot be farmed by oscillating vertical moves', () => {
    let bestY = 12;
    let score = 0;
    const a = applyForwardProgressScore(bestY, 11);
    bestY = a.bestY;
    score += a.scoreDelta;

    const b = applyForwardProgressScore(bestY, 12);
    bestY = b.bestY;
    score += b.scoreDelta;

    const c = applyForwardProgressScore(bestY, 11);
    bestY = c.bestY;
    score += c.scoreDelta;

    expect(score).toBe(10);
  });

  test('deterministic lane RNG sequences via seed', () => {
    const rngA = makeRng(123);
    const rngB = makeRng(123);
    expect([rngA(), rngA(), rngA()]).toEqual([rngB(), rngB(), rngB()]);
  });

  test('clamps large dt values', () => {
    expect(clampDelta(1.5)).toBe(0.25);
  });
});
