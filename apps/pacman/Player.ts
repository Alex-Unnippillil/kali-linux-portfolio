export default class Player {
  x: number;
  y: number;
  dir: { x: number; y: number };
  nextDir: { x: number; y: number };
  speed: number;
  radius: number;
  powered: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.dir = { x: 0, y: 0 };
    this.nextDir = { x: 0, y: 0 };
    this.speed = 2;
    this.radius = 8;
    this.powered = 0; // frames remaining
  }

  setDirection(dx: number, dy: number) {
    this.nextDir = { x: dx, y: dy };
  }

  update(maze: {
    isWall: (x: number, y: number) => boolean;
    isWallTile?: (x: number, y: number) => boolean;
    isTunnel?: (x: number, y: number) => boolean;
    width: number;
    tileSize: number;
  }) {
    if (this.powered > 0) this.powered--;
    const ts = maze.tileSize;
    const tolerance = 2;
    const tileX = Math.floor(this.x / ts);
    const tileY = Math.floor(this.y / ts);
    const centerX = tileX * ts + ts / 2;
    const centerY = tileY * ts + ts / 2;
    if (this.nextDir.x !== this.dir.x || this.nextDir.y !== this.dir.y) {
      const targetX = tileX + this.nextDir.x;
      const targetY = tileY + this.nextDir.y;
      const wallCheck = maze.isWallTile
        ? maze.isWallTile(targetX, targetY)
        : maze.isWall(targetX * ts + ts / 2, targetY * ts + ts / 2);
      if (!wallCheck) {
        const dx = centerX - this.x;
        const dy = centerY - this.y;
        if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) {
          this.x = centerX;
          this.y = centerY;
          this.dir = this.nextDir;
        }
      }
    }
    const speed =
      maze.isTunnel && maze.isTunnel(this.x, this.y)
        ? this.speed * 0.8
        : this.speed;
    const nx = this.x + this.dir.x * speed;
    const ny = this.y + this.dir.y * speed;
    if (!maze.isWall(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }
    // wrap around tunnels
    const widthPx = maze.width * ts;
    if (this.x < -ts / 2) this.x = widthPx + ts / 2;
    if (this.x > widthPx + ts / 2) this.x = -ts / 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
