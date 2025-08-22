export class Terrain {
  constructor(tileSize = 16, tiles = []) {
    this.tileSize = tileSize;
    this.tiles = tiles;
  }

  isSolid(tx, ty) {
    return !!(this.tiles[ty] && this.tiles[ty][tx]);
  }

  isSolidPixel(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return this.isSolid(tx, ty);
  }
}
