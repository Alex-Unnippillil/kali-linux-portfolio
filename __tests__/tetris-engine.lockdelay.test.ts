import { createInitialState, dispatch, step } from '../games/tetris/engine';

describe('tetris engine lock delay', () => {
  it('freezes lock delay while paused or unfocused', () => {
    let state = createInitialState({ lockDelayMs: 500 });
    state = {
      ...state,
      active: { type: 'I', rotation: 0, x: 0, y: state.totalHeight - 2 },
    };

    state = step(state, 200);
    expect(state.lockElapsedMs).toBe(200);

    const paused = dispatch(state, { type: 'pause' });
    const pausedStep = step(paused, 400);
    expect(pausedStep.lockElapsedMs).toBe(paused.lockElapsedMs);

    const blurred = dispatch(pausedStep, { type: 'setFocused', focused: false });
    const blurredStep = step(blurred, 400);
    expect(blurredStep.lockElapsedMs).toBe(blurred.lockElapsedMs);
  });

  it('resets lock delay with a capped number of resets', () => {
    let state = createInitialState({ lockDelayMs: 500, lockResetLimit: 1 });
    state = {
      ...state,
      active: { type: 'I', rotation: 0, x: 0, y: state.totalHeight - 2 },
      lockElapsedMs: 300,
    };

    state = dispatch(state, { type: 'startMove', dir: 1 });
    expect(state.lockElapsedMs).toBe(0);
    expect(state.lockResetsUsed).toBe(1);

    const second = dispatch(state, { type: 'startMove', dir: -1 });
    expect(second.lockResetsUsed).toBe(1);
  });
});
