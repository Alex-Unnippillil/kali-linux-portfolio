import {
  Player,
  movePlayer,
  collectCoin,
  cloneTiles,
  countCoins,
} from '../public/apps/platformer/engine';

describe('platformer engine', () => {
  it('prevents the player from falling through solid tiles', () => {
    const player = new Player();
    player.x = 8;
    player.y = 0;
    player.vy = 600;

    const tiles = [
      [0, 0, 0],
      [1, 1, 1],
    ];

    movePlayer(player, tiles, 16, 0.1);

    expect(player.onGround).toBe(true);
    expect(player.y + player.h).toBeLessThanOrEqual(16);
  });

  it('detects when all coins have been collected', () => {
    const layout = [
      [0, 5, 0],
      [1, 1, 1],
    ];
    const tiles = cloneTiles(layout);

    expect(countCoins(tiles)).toBe(1);
    expect(collectCoin(tiles, 1, 0)).toBe(true);
    expect(countCoins(tiles)).toBe(0);
    expect(layout[0][1]).toBe(5);
  });
});
