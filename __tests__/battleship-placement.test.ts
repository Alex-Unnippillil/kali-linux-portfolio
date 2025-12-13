import { cellsForShip, validatePlacement, Placement } from '../apps/games/battleship/rules';
import { BOARD_SIZE } from '../apps/games/battleship/ai';

describe('validatePlacement', () => {
  const makeShip = (x: number, y: number, len: number, dir: 0 | 1): Placement => {
    const cells = cellsForShip(x, y, dir, len, BOARD_SIZE);
    if (!cells) throw new Error('Invalid ship for test');
    return { x, y, dir, len, cells };
  };

  it('accepts a valid non-adjacent layout', () => {
    const layout = [
      makeShip(0, 0, 5, 0),
      makeShip(2, 2, 4, 0),
      makeShip(1, 4, 3, 0),
    ];
    const result = validatePlacement(layout, { size: BOARD_SIZE, noTouch: true });
    expect(result.ok).toBe(true);
  });

  it('rejects overlap and bounds violations', () => {
    const overlapping = [makeShip(0, 0, 2, 0), makeShip(1, 0, 3, 0)];
    const overlapResult = validatePlacement(overlapping, { size: BOARD_SIZE, noTouch: false });
    expect(overlapResult.ok).toBe(false);

    const outOfBounds: Placement[] = [{ x: 9, y: 9, dir: 0, len: 3, cells: [99, 100, 101] }];
    const boundsResult = validatePlacement(outOfBounds, { size: BOARD_SIZE, noTouch: false });
    expect(boundsResult.ok).toBe(false);
  });

  it('enforces adjacency when requested and allows touching otherwise', () => {
    const touching = [makeShip(0, 0, 2, 0), makeShip(0, 1, 2, 0)];
    const strict = validatePlacement(touching, { size: BOARD_SIZE, noTouch: true });
    expect(strict.ok).toBe(false);

    const relaxed = validatePlacement(touching, { size: BOARD_SIZE, noTouch: false });
    expect(relaxed.ok).toBe(true);
  });
});
