export const TILE_SIZE = 20;

export const isCenter = (pos) => Math.abs((pos % TILE_SIZE) - TILE_SIZE / 2) < 0.1;

export const countPellets = (maze) =>
  maze.reduce(
    (sum, row) => sum + row.filter((t) => t === 2 || t === 3).length,
    0
  );

export const isLevelComplete = (maze) => countPellets(maze) === 0;

export const ghostEatenScore = (score) => score * 2;

export const applyBufferedTurn = (pac, tileAt) => {
  const px = pac.x / TILE_SIZE;
  const py = pac.y / TILE_SIZE;
  if (pac.nextDir.x || pac.nextDir.y) {
    const nx = Math.floor(px + pac.nextDir.x * 0.5);
    const ny = Math.floor(py + pac.nextDir.y * 0.5);
    if (
      tileAt(nx, ny) !== 1 &&
      isCenter(pac.x) &&
      isCenter(pac.y)
    ) {
      pac.dir = pac.nextDir;
      pac.nextDir = { x: 0, y: 0 };
    }
  }
  return pac;
};
