export class Terrain {
  constructor(tileSize = 16, tiles = []) {
    this.tileSize = tileSize;
    this.tiles = tiles;
  }

  getTile(tx, ty) {
    return this.tiles[ty] ? this.tiles[ty][tx] || 0 : 0;
  }

  isSolid(tx, ty) {
    const tile = this.getTile(tx, ty);
    // treat non-zero tiles that aren't collectibles or slopes as solid blocks
    return tile !== 0 && tile !== 5 && !this.isSlopeTile(tile);
  }

  isSlopeTile(tile) {
    return tile === 2 || tile === 3;
  }

  getSlopeY(tile, x) {
    // x is the x offset within the tile (0..tileSize)
    if (tile === 2) return this.tileSize - x; // rising left -> right
    if (tile === 3) return x; // falling left -> right
    return 0;
  }

  isSolidPixel(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return this.isSolid(tx, ty);
  }
}
