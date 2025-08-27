import { isLevelComplete, ghostEatenScore, applyBufferedTurn, TILE_SIZE } from '../components/apps/pacmanUtils';

describe('pacman utility mechanics', () => {
  test('pellet count zero ends level', () => {
    const maze = [
      [0, 1, 0],
      [1, 0, 1],
    ];
    expect(isLevelComplete(maze)).toBe(true);
  });

  test('ghost eaten doubles score', () => {
    expect(ghostEatenScore(100)).toBe(200);
  });

  test('swipe queueing works', () => {
    const pac = {
      x: TILE_SIZE / 2,
      y: TILE_SIZE / 2,
      dir: { x: 1, y: 0 },
      nextDir: { x: 0, y: -1 },
    };
    const tileAt = () => 0;
    applyBufferedTurn(pac, tileAt);
    expect(pac.dir).toEqual({ x: 0, y: -1 });
    expect(pac.nextDir).toEqual({ x: 0, y: 0 });
  });
});
