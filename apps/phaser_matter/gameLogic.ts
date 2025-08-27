export interface Point {
  x: number;
  y: number;
}

export class GameState {
  spawn: Point;
  checkpoint?: Point;

  constructor(spawn: Point) {
    this.spawn = { ...spawn };
  }

  /**
   * Updates the active checkpoint, used as respawn point after death.
   */
  setCheckpoint(p: Point) {
    this.checkpoint = { ...p };
  }

  /**
   * Returns the position a player should respawn to when falling below
   * the provided boundary. If the player is above the boundary their
   * current position is returned.
   */
  respawnIfOutOfBounds(player: Point, boundaryY: number): Point {
    if (player.y > boundaryY) {
      return this.checkpoint ? { ...this.checkpoint } : { ...this.spawn };
    }
    return player;
  }
}
