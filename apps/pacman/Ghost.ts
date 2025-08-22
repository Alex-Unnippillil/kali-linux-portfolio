import Player from './Player';
import Maze from './Maze';

export type BehaviorType = 'chase' | 'ambush' | 'random';

export interface GhostConfig {
  x: number;
  y: number;
  color?: string;
  behavior: BehaviorType;
}

type BehaviorFn = (ghost: Ghost, player: Player, maze: Maze) => { x: number; y: number };

const behaviorFns: Record<BehaviorType, BehaviorFn> = {
  random: () => {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  },
  chase: (g, p) => {
    return { x: Math.sign(p.x - g.x), y: Math.sign(p.y - g.y) };
  },
  ambush: (g, p, m) => {
    const tx = p.x + p.dir.x * m.tileSize * 4;
    const ty = p.y + p.dir.y * m.tileSize * 4;
    return { x: Math.sign(tx - g.x), y: Math.sign(ty - g.y) };
  },
};

export default class Ghost {
  x: number;
  y: number;
  color: string;
  behavior: BehaviorType;
  speed: number;
  spawnX: number;
  spawnY: number;

  constructor(cfg: GhostConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.color = cfg.color || 'red';
    this.behavior = cfg.behavior;
    this.speed = 2;
  }

  update(player: Player, maze: Maze) {
    const dir = behaviorFns[this.behavior](this, player, maze);
    const nx = this.x + dir.x * this.speed;
    const ny = this.y + dir.y * this.speed;
    if (!maze.isWall(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
  }

  draw(ctx: CanvasRenderingContext2D, frightened: boolean) {
    ctx.fillStyle = frightened ? 'blue' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
