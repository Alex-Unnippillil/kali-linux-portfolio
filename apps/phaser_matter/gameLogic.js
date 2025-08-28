export class GameState {
    constructor(spawn) {
        this.spawn = { ...spawn };
    }
    /**
     * Updates the active checkpoint, used as respawn point after death.
     */
    setCheckpoint(p) {
        this.checkpoint = { ...p };
    }
    /**
     * Returns the position a player should respawn to when falling below
     * the provided boundary. If the player is above the boundary their
     * current position is returned.
     */
    respawnIfOutOfBounds(player, boundaryY) {
        if (player.y > boundaryY) {
            return this.checkpoint ? { ...this.checkpoint } : { ...this.spawn };
        }
        return player;
    }
}
