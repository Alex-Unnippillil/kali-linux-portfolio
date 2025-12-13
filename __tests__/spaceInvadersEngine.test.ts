import { createGame, invaderWorldPosition, step } from '../games/space-invaders/logic';

describe('space invaders engine', () => {
  const noopInput = { left: false, right: false, fire: false };

  it('keeps formation within bounds', () => {
    const game = createGame({ width: 320, height: 240, seed: 'bounds' });
    for (let i = 0; i < 1200; i += 1) {
      step(game, noopInput, 16);
    }
    const alive = game.invaders.filter((i) => i.alive);
    const xs = alive.map((inv) => {
      const pos = invaderWorldPosition(game, inv);
      return [pos.x, pos.x + pos.w];
    });
    const minX = Math.min(...xs.map(([x]) => x));
    const maxX = Math.max(...xs.map(([, x]) => x));
    expect(minX).toBeGreaterThanOrEqual(0);
    expect(maxX).toBeLessThanOrEqual(game.width);
  });

  it('stays deterministic across frame rates', () => {
    const gameA = createGame({ width: 320, height: 240, seed: 'sync' });
    const gameB = createGame({ width: 320, height: 240, seed: 'sync' });

    for (let i = 0; i < 600; i += 1) step(gameA, noopInput, 16);
    for (let i = 0; i < 1200; i += 1) step(gameB, noopInput, 8);

    const snapshot = (g: typeof gameA) => ({
      formationX: g.formationX,
      formationY: g.formationY,
      dir: g.formationDir,
      alive: g.invaders.filter((i) => i.alive).length,
      score: g.score,
    });

    expect(snapshot(gameA)).toEqual(snapshot(gameB));
  });

  it('lets bunkers absorb shots before invaders', () => {
    const game = createGame({ width: 200, height: 200, seed: 'bunker-first' });
    game.invaders = [{ alive: true, col: 0, row: 0 }];
    game.formationX = 60;
    game.formationY = 50;
    game.bunkers = [{ x: 95, y: 130, w: 10, h: 10, hp: 2 }];
    game.bullets = [
      {
        active: true,
        x: 100,
        y: 170,
        prevX: 100,
        prevY: 170,
        vx: 0,
        vy: -400,
        owner: 'player',
      },
    ];

    step(game, noopInput, 200);

    expect(game.bunkers[0].hp).toBe(1);
    expect(game.invaders[0].alive).toBe(true);
    expect(game.bullets[0].active).toBe(false);
  });

  it('increments score once per kill', () => {
    const game = createGame({ width: 200, height: 200, seed: 'score' });
    game.invaders = [{ alive: true, col: 0, row: 0 }];
    game.formationX = 60;
    game.formationY = 50;
    const target = game.invaders[0];
    const pos = invaderWorldPosition(game, target);
    game.bunkers = [];
    game.bullets = [
      {
        active: true,
        x: pos.x + pos.w / 2,
        y: pos.y + 20,
        prevX: pos.x + pos.w / 2,
        prevY: pos.y + 20,
        vx: 0,
        vy: -400,
        owner: 'player',
      },
    ];

    const events = step(game, noopInput, 150);

    expect(events.some((e) => e.type === 'hit' && e.target === 'invader')).toBe(true);
    expect(target.alive).toBe(false);
    expect(game.score).toBe(10);
    expect(game.bullets.every((b) => !b.active)).toBe(true);
  });

  it('caps rapid powerups while remaining deterministic', () => {
    let chosenSeed = '';
    let finalGame: ReturnType<typeof createGame> | null = null;
    for (let i = 0; i < 200; i += 1) {
      const seed = `seed-${i}`;
      const game = createGame({ width: 320, height: 240, seed });
      let rapidDrops = 0;
      for (let k = 0; k < 15 && rapidDrops < 4; k += 1) {
        const target = game.invaders[k];
        if (!target) break;
        const pos = invaderWorldPosition(game, target);
        game.bunkers = [];
        game.bullets = [
          {
            active: true,
            x: pos.x + pos.w / 2,
            y: pos.y + 80,
            prevX: pos.x + pos.w / 2,
            prevY: pos.y + 80,
            vx: 0,
            vy: -400,
            owner: 'player',
          },
        ];
        const events = step(game, noopInput, 400);
        const spawn = events.find((e) => e.type === 'powerup_spawn');
        if (spawn && spawn.power === 'rapid') {
          rapidDrops += 1;
          game.powerUps.forEach((p) => {
            p.x = game.player.x;
            p.y = game.player.y;
          });
          step(game, noopInput, 16);
        }
      }
      if (rapidDrops >= 2) {
        chosenSeed = seed;
        finalGame = game;
        break;
      }
    }
    expect(chosenSeed).not.toBe('');
    expect(finalGame).not.toBeNull();
    if (finalGame) {
      expect(finalGame.player.rapidMs).toBeLessThanOrEqual(8000);
    }
  });

  it('removes bunker tiles after enough hits', () => {
    const game = createGame({ width: 200, height: 200, seed: 'bunker-damage' });
    game.invaders = [{ alive: true, col: 0, row: 0 }];
    game.formationX = 200; // push invader off path
    game.formationY = 0;
    game.bunkers = [{ x: 90, y: 100, w: 20, h: 10, hp: 2 }];
    const bulletTemplate = {
      x: 100,
      prevX: 100,
      prevY: 0,
      vx: 0,
      vy: 400,
      owner: 'enemy' as const,
    };
    game.bullets = [
      { ...bulletTemplate, active: true, y: 0 },
      { ...bulletTemplate, active: true, y: 0 },
    ];

    step(game, noopInput, 300);
    game.bullets[0].active = true;
    game.bullets[0].y = 0;
    game.bullets[0].prevY = 0;
    step(game, noopInput, 300);

    expect(game.bunkers.length).toBe(0);
  });
});
