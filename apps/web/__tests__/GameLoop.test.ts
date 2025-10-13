import GameLoop from '../components/apps/Games/common/loop/GameLoop';

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

  it('ticks using fixed timestep and clamps large deltas', () => {
    const tick = jest.fn();
    const loop = new GameLoop(tick, undefined, { maxDt: 32 });
    loop.start();
    rafCb(1000);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(tick).toHaveBeenNthCalledWith(1, 16);
  });

  it('renders with interpolation', () => {
    const tick = jest.fn();
    const render = jest.fn();
    const loop = new GameLoop(tick, undefined, { render, interpolation: true });
    loop.start();
    rafCb(8);
    expect(tick).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(0.5);
    loop.stop();
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
