export interface Point {
  x: number;
  y: number;
}

export class GameState {
  spawn: Point;
  checkpoint?: Point;
  coins = 0;

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
   * Records a collected coin and returns the total count.
   */
  addCoin() {
    this.coins++;
    return this.coins;
  }

  /**
   * Returns the current respawn position, preferring the last checkpoint
   * if one has been recorded.
   */
  getRespawnPoint(): Point {
    return this.checkpoint ? { ...this.checkpoint } : { ...this.spawn };
  }

  /**
   * Returns the position a player should respawn to when falling below
   * the provided boundary. If the player is above the boundary their
   * current position is returned.
   */
  respawnIfOutOfBounds(player: Point, boundaryY: number): Point {
    if (player.y > boundaryY) {
      return this.getRespawnPoint();
    }
    return player;
  }
}
