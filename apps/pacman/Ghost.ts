import Player from './Player';
import Maze from './Maze';

export type GhostMode = 'scatter' | 'chase' | 'frightened';
export type GhostType = 'blinky' | 'pinky' | 'inky' | 'clyde';

export interface GhostConfig {
  x: number;
  y: number;
  color?: string;
  type: GhostType;
  mazeWidth: number;
  mazeHeight: number;
}

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export default class Ghost {
  x: number;
  y: number;
  dir: { x: number; y: number };
  color: string;
  type: GhostType;
  speed: number;
  spawnX: number;
  spawnY: number;
  scatter: { x: number; y: number };
  frightenedTimer: number;

  constructor(cfg: GhostConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.dir = { x: 1, y: 0 };
    this.color = cfg.color || 'red';
    this.type = cfg.type;
    this.speed = 2;
    this.frightenedTimer = 0;
    const w = cfg.mazeWidth;
    const h = cfg.mazeHeight;
    // scatter targets are the corners of the maze
    const corners: Record<GhostType, { x: number; y: number }> = {
      blinky: { x: w - 1, y: 0 },
      pinky: { x: 0, y: 0 },
      inky: { x: w - 1, y: h - 1 },
      clyde: { x: 0, y: h - 1 },
    };
    this.scatter = corners[cfg.type];
  }

  /** Set ghost into frightened mode for given frames */
  frighten(frames: number) {
    this.frightenedTimer = frames;
  }

  private getChaseTarget(player: Player, maze: Maze, blinky?: Ghost) {
    const ts = maze.tileSize;
    const px = Math.floor(player.x / ts);
    const py = Math.floor(player.y / ts);
    const pdx = player.dir.x;
    const pdy = player.dir.y;
    switch (this.type) {
      case 'blinky':
        return { x: px, y: py };
      case 'pinky':
        return { x: px + 4 * pdx, y: py + 4 * pdy };
      case 'inky': {
        const bl = blinky ?? this;
        const bx = Math.floor(bl.x / ts);
        const by = Math.floor(bl.y / ts);
        const tx = px + 2 * pdx;
        const ty = py + 2 * pdy;
        return { x: tx * 2 - bx, y: ty * 2 - by };
      }
      case 'clyde': {
        const dx = Math.floor(this.x / ts) - px;
        const dy = Math.floor(this.y / ts) - py;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) return { x: px, y: py };
        return this.scatter;
      }
    }
  }

  private pathfind(target: { x: number; y: number }, maze: Maze) {
    const ts = maze.tileSize;
    const sx = Math.floor(this.x / ts);
    const sy = Math.floor(this.y / ts);
    const visited = new Set<string>();
    const q: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
    q.push({ x: sx, y: sy, path: [] });
    visited.add(`${sx},${sy}`);
    while (q.length) {
      const cur = q.shift()!;
      if (cur.x === target.x && cur.y === target.y) {
        return cur.path[0] || { x: 0, y: 0 };
      }
      for (const d of DIRS) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = `${nx},${ny}`;
        if (visited.has(key) || maze.isWallTile(nx, ny)) continue;
        visited.add(key);
        q.push({ x: nx, y: ny, path: [...cur.path, d] });
      }
    }
    return { x: 0, y: 0 };
  }

  update(player: Player, maze: Maze, mode: GhostMode, blinky?: Ghost) {
    if (this.frightenedTimer > 0) this.frightenedTimer--;
    let curMode: GhostMode = mode;
    if (this.frightenedTimer > 0) curMode = 'frightened';
    let dir = this.dir;
    if (curMode === 'frightened') {
      const choices = DIRS.filter((d) => !maze.isWall(this.x + d.x * maze.tileSize / 2, this.y + d.y * maze.tileSize / 2));
      dir = choices[Math.floor(Math.random() * choices.length)] || dir;
    } else {
      const target = curMode === 'scatter' ? this.scatter : this.getChaseTarget(player, maze, blinky);
      dir = this.pathfind(target, maze);
    }
    this.dir = dir;
    const tunnel = maze.isTunnel(this.x, this.y);
    const speed = tunnel ? this.speed * 0.5 : this.speed;
    const nx = this.x + dir.x * speed;
    const ny = this.y + dir.y * speed;
    if (!maze.isWall(nx, ny)) {
      this.x = nx;
      this.y = ny;
    }
    // wrap around tunnels
    if (this.x < -maze.tileSize / 2) this.x = maze.width * maze.tileSize + maze.tileSize / 2;
    if (this.x > maze.width * maze.tileSize + maze.tileSize / 2) this.x = -maze.tileSize / 2;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.dir = { x: 1, y: 0 };
    this.frightenedTimer = 0;
  }

  draw(ctx: CanvasRenderingContext2D, frightened: boolean) {
    ctx.fillStyle = frightened ? 'blue' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
