import { GhostConfig } from './Ghost';

export interface LevelData {
  width: number;
  height: number;
  walls: string[];
  pellets: string[];
  powerUps: string[];
  fruit?: { x: number; y: number; score: number }[];
  player: { x: number; y: number };
  ghosts: GhostConfig[];
}

export default class Maze {
  tileSize = 20;
  width: number;
  height: number;
  walls: Set<string>;
  pellets: Set<string>;
  powerUps: Set<string>;
  fruit: { x: number; y: number; score: number }[];
  ghosts: GhostConfig[];
  playerStart: { x: number; y: number };

  constructor(data: LevelData) {
    this.width = data.width;
    this.height = data.height;
    this.walls = new Set(data.walls);
    this.pellets = new Set(
      data.pellets && data.pellets.length
        ? data.pellets
        : Array.from({ length: data.height * data.width })
            .map((_, i) => `${i % data.width},${Math.floor(i / data.width)}`)
            .filter((k) => !this.walls.has(k)),
    );
    this.powerUps = new Set(data.powerUps);
    this.fruit = data.fruit || [];
    this.ghosts = data.ghosts;
    this.playerStart = data.player;
  }

  static async load(name: string) {
    const res = await fetch(`/pacman/levels/${name}.json`);
    const data = await res.json();
    return new Maze(data as LevelData);
  }

  isWall(x: number, y: number) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return this.walls.has(`${tx},${ty}`);
  }

  eat(x: number, y: number) {
    const key = `${Math.floor(x / this.tileSize)},${Math.floor(y / this.tileSize)}`;
    if (this.powerUps.has(key)) {
      this.powerUps.delete(key);
      return 'power';
    }
    if (this.pellets.has(key)) {
      this.pellets.delete(key);
      return 'pellet';
    }
    const idx = this.fruit.findIndex((f) => f.x === Math.floor(x / this.tileSize) && f.y === Math.floor(y / this.tileSize));
    if (idx >= 0) {
      const f = this.fruit[idx];
      this.fruit.splice(idx, 1);
      return f;
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width * this.tileSize, this.height * this.tileSize);
    this.walls.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = '#0011aa';
      ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
    });
    this.pellets.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(
        x * this.tileSize + this.tileSize / 2,
        y * this.tileSize + this.tileSize / 2,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    this.powerUps.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(
        x * this.tileSize + this.tileSize / 2,
        y * this.tileSize + this.tileSize / 2,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    this.fruit.forEach((f) => {
      ctx.fillStyle = 'pink';
      ctx.beginPath();
      ctx.arc(
        f.x * this.tileSize + this.tileSize / 2,
        f.y * this.tileSize + this.tileSize / 2,
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
  }
}
