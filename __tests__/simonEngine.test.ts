import {
  handleInput,
  handleTimeout,
  inputWindowMs,
  startGame,
  stepSeconds,
  initialSimonState,
  playbackComplete,
} from '../games/simon/logic';

describe('Simon engine', () => {
  const baseOptions = {
    mode: 'classic' as const,
    tempoBpm: 100,
    playMode: 'normal' as const,
    timing: 'relaxed' as const,
    seed: 'seed',
  };

  it('advances score and extends sequence after correct inputs', () => {
    const starting = {
      ...initialSimonState,
      phase: 'input' as const,
      sequence: [0, 1, 2],
      roundId: 1,
    };

    let state = handleInput(starting, 0, baseOptions);
    state = handleInput(state, 1, baseOptions);
    state = handleInput(state, 2, baseOptions);

    expect(state.score).toBe(1);
    expect(state.phase).toBe('playback');
    expect(state.sequence).toHaveLength(4);
    expect(state.inputIndex).toBe(0);
  });

  it('ends run in strict mode after wrong input', () => {
    const strictOptions = { ...baseOptions, playMode: 'strict' as const };
    const starting = {
      ...initialSimonState,
      phase: 'input' as const,
      sequence: [1],
      roundId: 2,
    };

    const state = handleInput(starting, 0, strictOptions);

    expect(state.phase).toBe('gameover');
    expect(state.lastError).toBe('wrong');
    expect(state.score).toBe(starting.score);
  });

  it('scales tempo windows with speed and tempo', () => {
    const slow = stepSeconds({ ...baseOptions, tempoBpm: 60 }, 1);
    const fast = stepSeconds({ ...baseOptions, tempoBpm: 120 }, 1);
    expect(fast).toBeLessThan(slow);

    const strictSpeed = {
      ...baseOptions,
      timing: 'strict' as const,
      mode: 'speed' as const,
    };
    const earlyLevelWindow = inputWindowMs(strictSpeed, 1);
    const deepLevelWindow = inputWindowMs(strictSpeed, 10);

    expect(earlyLevelWindow).not.toBeNull();
    expect(deepLevelWindow).not.toBeNull();
    expect(deepLevelWindow).toBeLessThan(earlyLevelWindow ?? 0);
  });

  it('ignores inputs outside the input phase', () => {
    const playbackState = {
      ...initialSimonState,
      phase: 'playback' as const,
      sequence: [0],
      roundId: 3,
    };

    const result = handleInput(playbackState, 0, baseOptions);

    expect(result).toBe(playbackState);
  });

  it('handles deterministic starts and input timeouts', () => {
    const started = startGame(initialSimonState, baseOptions);
    expect(started.phase).toBe('playback');
    expect(started.sequence).toHaveLength(1);

    const afterPlayback = playbackComplete(started);
    const strictOptions = { ...baseOptions, playMode: 'strict' as const };
    const timedOut = handleTimeout(afterPlayback, strictOptions);

    expect(timedOut.phase).toBe('gameover');
    expect(timedOut.lastError).toBe('timeout');
  });
});
