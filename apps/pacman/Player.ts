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

  update(maze: { isWall: (x: number, y: number) => boolean; tileSize: number }) {
    // handle power timer
    if (this.powered > 0) this.powered--;
    // try to turn
    const tx = this.x + this.nextDir.x * this.speed;
    const ty = this.y + this.nextDir.y * this.speed;
    if (!maze.isWall(tx, ty)) {
      this.dir = this.nextDir;
    }
    const nx = this.x + this.dir.x * this.speed;
    const ny = this.y + this.dir.y * this.speed;
    if (!maze.isWall(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
