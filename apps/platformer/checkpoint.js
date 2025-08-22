export class Checkpoint {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  activate(player, saveFn) {
    player.spawn = { x: this.x, y: this.y };
    if (typeof saveFn === 'function') {
      saveFn({ x: this.x, y: this.y });
    }
  }
}
