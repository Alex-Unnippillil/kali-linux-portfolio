export default class Shield {
  x: number;
  y: number;
  w: number;
  h: number;
  /** size of each destructible tile */
  tile: number;
  /** two dimensional array tracking which tiles remain */
  tiles: boolean[][];
  hp: number;

  constructor(x: number, y: number, w = 30, h = 20, tile = 5) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.tile = tile;
    const rows = Math.floor(h / tile);
    const cols = Math.floor(w / tile);
    this.tiles = Array.from({ length: rows }, () => Array(cols).fill(true));
    this.hp = rows * cols;
  }

  /**
   * Remove the tile hit by a projectile at the given world coordinates.
   */
  hit(x: number, y: number) {
    const col = Math.floor((x - this.x) / this.tile);
    const row = Math.floor((y - this.y) / this.tile);
    if (
      row >= 0 &&
      row < this.tiles.length &&
      col >= 0 &&
      col < this.tiles[0].length &&
      this.tiles[row][col]
    ) {
      this.tiles[row][col] = false;
      this.hp -= 1;
    }
  }

  get alive() {
    return this.hp > 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return;
    const intensity = (this.hp / (this.tiles.length * this.tiles[0].length)) * 255;
    ctx.fillStyle = `rgb(${intensity},${intensity},0)`;
    for (let r = 0; r < this.tiles.length; r += 1) {
      for (let c = 0; c < this.tiles[r].length; c += 1) {
        if (this.tiles[r][c])
          ctx.fillRect(
            this.x + c * this.tile,
            this.y + r * this.tile,
            this.tile,
            this.tile,
          );
      }
    }
  }
}
