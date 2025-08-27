import GameLoop from '../apps/games/GameLoop';

let rafCb: FrameRequestCallback;

describe('GameLoop', () => {
  beforeEach(() => {
    rafCb = () => {};
    (global as any).requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    (global as any).cancelAnimationFrame = jest.fn();
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts and ticks', () => {
    const tick = jest.fn();
    const loop = new GameLoop(tick);
    loop.start();
    expect(requestAnimationFrame).toHaveBeenCalled();
    rafCb(16);
    expect(tick).toHaveBeenCalledWith(16);
  });

  it('handles input events', () => {
    const tick = jest.fn();
    const input = jest.fn();
    const loop = new GameLoop(tick, input);
    loop.start();
    const evt = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(evt);
    expect(input).toHaveBeenCalledWith(evt);
    loop.stop();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
