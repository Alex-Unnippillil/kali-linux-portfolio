import {
  computeGhostTarget,
  getAvailableDirections,
  DEFAULT_SCATTER_CORNERS,
  DIRECTIONS,
} from '../games/pacman/logic';
import type { GhostState } from '../games/pacman/logic';

describe('pacman logic helpers', () => {
  const maze = [
    [0, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 0],
  ];
  const tileSize = 20;
  const pac = { x: 2 * tileSize, y: 2 * tileSize, dir: { x: 1, y: 0 } };
  const ghosts: GhostState[] = [
    { name: 'blinky', x: 1 * tileSize, y: 1 * tileSize, dir: { x: 0, y: -1 } },
    { name: 'pinky', x: 1 * tileSize, y: 1 * tileSize, dir: { x: 0, y: -1 } },
    { name: 'inky', x: 1 * tileSize, y: 1 * tileSize, dir: { x: 0, y: -1 } },
    { name: 'clyde', x: 3 * tileSize, y: 2 * tileSize, dir: { x: 0, y: -1 } },
  ];

  it('filters available directions to avoid walls and reverse moves', () => {
    const ghost = { name: 'blinky', x: tileSize, y: tileSize, dir: { x: 1, y: 0 } };
    const options = getAvailableDirections(maze, {
      position: { x: 1, y: 1 },
      direction: ghost.dir,
    });
    expect(options).toEqual([
      DIRECTIONS[0],
      DIRECTIONS[2],
      DIRECTIONS[3],
    ]);
  });

  it('uses scatter corners while in scatter mode', () => {
    const target = computeGhostTarget(ghosts[0], pac, ghosts, {
      tileSize,
      mode: 'scatter',
      frightened: false,
    });
    expect(target).toEqual(DEFAULT_SCATTER_CORNERS.blinky);
  });

  it('returns null when ghosts are frightened', () => {
    const target = computeGhostTarget(ghosts[1], pac, ghosts, {
      tileSize,
      mode: 'chase',
      frightened: true,
    });
    expect(target).toBeNull();
  });

  it('computes chase targets for unique ghost personalities', () => {
    const blinkyTarget = computeGhostTarget(ghosts[0], pac, ghosts, {
      tileSize,
      mode: 'chase',
      frightened: false,
    });
    expect(blinkyTarget).toEqual({ x: 2, y: 2 });

    const pinkyTarget = computeGhostTarget(ghosts[1], pac, ghosts, {
      tileSize,
      mode: 'chase',
      frightened: false,
    });
    expect(pinkyTarget).toEqual({ x: 6, y: 2 });

    const inkyTarget = computeGhostTarget(ghosts[2], pac, ghosts, {
      tileSize,
      mode: 'chase',
      frightened: false,
    });
    expect(inkyTarget).toEqual({ x: 7, y: 3 });

    const farClydeState: GhostState = {
      ...ghosts[3],
      x: 12 * tileSize,
      y: 12 * tileSize,
    };
    const farGhosts: GhostState[] = [...ghosts.slice(0, 3), farClydeState];
    const farClyde = computeGhostTarget(farClydeState, pac, farGhosts, {
      tileSize,
      mode: 'chase',
      frightened: false,
    });
    expect(farClyde).toEqual({ x: 2, y: 2 });

    const closeClydeState: GhostState = {
      ...ghosts[3],
      x: 2 * tileSize,
      y: 2 * tileSize,
    };
    const closeGhosts: GhostState[] = [...ghosts.slice(0, 3), closeClydeState];
    const closeClyde = computeGhostTarget(closeClydeState, pac, closeGhosts, {
      tileSize,
      mode: 'chase',
      frightened: false,
    });
    expect(closeClyde).toEqual(DEFAULT_SCATTER_CORNERS.clyde);
  });
});
