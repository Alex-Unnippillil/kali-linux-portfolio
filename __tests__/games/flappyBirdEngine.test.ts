import { createFlappyEngine, PIPE_WIDTH } from '../../apps/games/flappy-bird/engine';

describe('flappy bird engine', () => {
  test('detects collisions with pipes', () => {
    const engine = createFlappyEngine({
      settings: { gravityVariant: 1, practiceMode: false, reducedMotion: true },
    });
    engine.start(123);
    engine.state.pipes = [
      {
        x: engine.state.bird.x - 5,
        baseTop: 0,
        baseBottom: 40,
        amplitude: 0,
        phase: 0,
        passed: false,
      },
    ];
    engine.state.bird.y = 5;

    const result = engine.step();

    expect(result?.crash).toBe(true);
    expect(engine.state.status).toBe('crashing');
  });

  test('increments score when passing pipes', () => {
    const engine = createFlappyEngine({
      settings: { gravityVariant: 1, practiceMode: false, reducedMotion: true },
    });
    engine.start(99);
    engine.state.pipes = [
      {
        x: engine.state.bird.x - PIPE_WIDTH - 20,
        baseTop: 40,
        baseBottom: 140,
        amplitude: 0,
        phase: 0,
        passed: false,
      },
    ];

    const result = engine.step();

    expect(result?.scored).toBe(1);
    expect(engine.state.score).toBe(1);
    expect(engine.state.pipes[0]?.passed).toBe(true);
  });

  test('uses deterministic pipes for a fixed seed', () => {
    const engineA = createFlappyEngine({
      settings: { gravityVariant: 1, practiceMode: false, reducedMotion: true },
    });
    const engineB = createFlappyEngine({
      settings: { gravityVariant: 1, practiceMode: false, reducedMotion: true },
    });

    engineA.start(555);
    engineB.start(555);

    for (let i = 0; i < 140; i += 1) {
      engineA.step();
      engineB.step();
    }

    expect(engineA.state.pipes.map((pipe) => pipe.baseTop)).toEqual(
      engineB.state.pipes.map((pipe) => pipe.baseTop),
    );
    expect(engineA.state.pipes.map((pipe) => pipe.x)).toEqual(
      engineB.state.pipes.map((pipe) => pipe.x),
    );
  });
});
