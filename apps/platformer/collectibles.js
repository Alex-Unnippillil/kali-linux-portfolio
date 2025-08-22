export function collectCoin(tiles, x, y) {
  if (tiles[y] && tiles[y][x] === 5) {
    tiles[y][x] = 0;
    return true;
  }
  return false;
}
