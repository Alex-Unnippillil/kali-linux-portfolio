import Player from "./Player";
import Maze from "./Maze";

export type GhostMode = "scatter" | "chase" | "frightened";
export type GhostType = "blinky" | "pinky" | "inky" | "clyde";

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
  inHouse: boolean;
  /** pellets eaten before this ghost is allowed to leave the house */
  leavePellets: number;
  /** last non-frightened mode used, for turn-around logic */
  private lastMode: GhostMode = "scatter";

  constructor(cfg: GhostConfig) {
    this.x = cfg.x;
    this.y = cfg.y;
    this.spawnX = cfg.x;
    this.spawnY = cfg.y;
    this.dir = { x: 1, y: 0 };
    this.color = cfg.color || "red";
    this.type = cfg.type;
    this.speed = 2;
    this.frightenedTimer = 0;
    this.inHouse = this.type !== "blinky";
    const leave: Record<GhostType, number> = {
      blinky: 0,
      pinky: 0,
      inky: 30,
      clyde: 60,
    };
    this.leavePellets = leave[cfg.type];
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
      case "blinky":
        return { x: px, y: py };
      case "pinky":
        return { x: px + 4 * pdx, y: py + 4 * pdy };
      case "inky": {
        const bl = blinky ?? this;
        const bx = Math.floor(bl.x / ts);
        const by = Math.floor(bl.y / ts);
        const tx = px + 2 * pdx;
        const ty = py + 2 * pdy;
        return { x: tx * 2 - bx, y: ty * 2 - by };
      }
      case "clyde": {
        const dx = Math.floor(this.x / ts) - px;
        const dy = Math.floor(this.y / ts) - py;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) return { x: px, y: py };
        return this.scatter;
      }
    }
  }

  /**
   * Return the tile this ghost should target based on the current mode.
   * In frightened mode ghosts don't aim for any tile so `null` is returned.
   */
  getTargetTile(
    mode: GhostMode,
    player: Player,
    maze: Maze,
    blinky?: Ghost,
  ) {
    if (mode === "frightened") return null;
    if (mode === "scatter") return this.scatter;
    return this.getChaseTarget(player, maze, blinky);
  }

  update(
    player: Player,
    maze: Maze,
    mode: GhostMode,
    blinky?: Ghost,
    pelletsEaten = 0,
  ) {
    if (this.inHouse) {
      if (pelletsEaten >= this.leavePellets) this.inHouse = false;
      else return;
    }
    if (this.frightenedTimer > 0) this.frightenedTimer--;
    let curMode: GhostMode = mode;
    if (this.frightenedTimer > 0) curMode = "frightened";

    if (curMode !== this.lastMode && curMode !== "frightened") {
      // reverse on mode switch per dossier
      this.dir = { x: -this.dir.x, y: -this.dir.y };
    }
    this.lastMode = curMode === "frightened" ? this.lastMode : curMode;

    const ts = maze.tileSize;
    const tileX = Math.floor(this.x / ts);
    const tileY = Math.floor(this.y / ts);
    const centerX = tileX * ts + ts / 2;
    const centerY = tileY * ts + ts / 2;
    const tolerance = this.speed;
    if (
      Math.abs(this.x - centerX) <= tolerance &&
      Math.abs(this.y - centerY) <= tolerance
    ) {
      this.x = centerX;
      this.y = centerY;
      let dir = this.dir;
      const opposite = { x: -this.dir.x, y: -this.dir.y };
      const choices = DIRS.filter((d) =>
        d.x === opposite.x && d.y === opposite.y ? false : !maze.isWallTile(
              tileX + d.x,
              tileY + d.y,
            ),
      );
      if (curMode === "frightened") {
        dir = choices[Math.floor(Math.random() * choices.length)] || dir;
      } else {
        const target = this.getTargetTile(curMode, player, maze, blinky);
        if (target) {
          let best = dir;
          let bestDist = Infinity;
          for (const c of choices) {
            const nx = tileX + c.x;
            const ny = tileY + c.y;
            const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
            if (dist < bestDist) {
              best = c;
              bestDist = dist;
            }
          }
          dir = best;
        }
      }
      this.dir = dir;
    }

    const tunnel = maze.isTunnel(this.x, this.y);
    const speed = tunnel ? this.speed * 0.5 : this.speed;
    this.x += this.dir.x * speed;
    this.y += this.dir.y * speed;
    if (this.x < -ts / 2) this.x = maze.width * ts + ts / 2;
    if (this.x > maze.width * ts + ts / 2) this.x = -ts / 2;
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.dir = { x: 1, y: 0 };
    this.frightenedTimer = 0;
    this.inHouse = this.type !== "blinky";
  }

  draw(ctx: CanvasRenderingContext2D, frightened: boolean) {
    ctx.fillStyle = frightened ? "blue" : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
