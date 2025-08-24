import Ghost, { GhostMode } from '@apps/pacman/Ghost';
import Player from '@apps/pacman/Player';
import Maze from '@apps/pacman/Maze';

describe('ghost targeting', () => {
  const maze = new Maze({
    width: 20,
    height: 20,
    walls: [],
    pellets: [],
    powerUps: [],
    player: { x: 0, y: 0 },
    ghosts: [],
  });
  const ts = maze.tileSize;

  test('blinky targets player tile', () => {
    const player = new Player(5 * ts + ts / 2, 5 * ts + ts / 2);
    player.dir = { x: 1, y: 0 };
    const blinky = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'blinky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    const target = blinky.getTargetTile('chase', player, maze, blinky);
    expect(target).toEqual({ x: 5, y: 5 });
  });

  test('pinky targets four tiles ahead', () => {
    const player = new Player(2 * ts + ts / 2, 2 * ts + ts / 2);
    player.dir = { x: 1, y: 0 };
    const pinky = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'pinky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    const target = pinky.getTargetTile('chase', player, maze);
    expect(target).toEqual({ x: 6, y: 2 });
  });

  test('inky uses vector from blinky', () => {
    const player = new Player(5 * ts + ts / 2, 5 * ts + ts / 2);
    player.dir = { x: 1, y: 0 };
    const blinky = new Ghost({
      x: 4 * ts + ts / 2,
      y: 5 * ts + ts / 2,
      type: 'blinky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    const inky = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'inky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    const target = inky.getTargetTile('chase', player, maze, blinky);
    expect(target).toEqual({ x: 10, y: 5 });
  });

  test('clyde targets player when far and scatter when near', () => {
    const farPlayer = new Player(10 * ts + ts / 2, ts / 2);
    farPlayer.dir = { x: 0, y: 0 };
    const clydeFar = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'clyde',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    expect(clydeFar.getTargetTile('chase', farPlayer, maze)).toEqual({ x: 10, y: 0 });

    const nearPlayer = new Player(ts + ts / 2, ts / 2);
    nearPlayer.dir = { x: 0, y: 0 };
    const clydeNear = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'clyde',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    expect(clydeNear.getTargetTile('chase', nearPlayer, maze)).toEqual(clydeNear.scatter);
  });

  test('scatter mode uses scatter corner', () => {
    const player = new Player(ts / 2, ts / 2);
    const ghost = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'pinky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    expect(ghost.getTargetTile('scatter', player, maze)).toEqual(ghost.scatter);
  });

  test('frightened mode has no target', () => {
    const player = new Player(ts / 2, ts / 2);
    const ghost = new Ghost({
      x: ts / 2,
      y: ts / 2,
      type: 'blinky',
      mazeWidth: maze.width,
      mazeHeight: maze.height,
    });
    expect(ghost.getTargetTile('frightened', player, maze)).toBeNull();
  });
});

