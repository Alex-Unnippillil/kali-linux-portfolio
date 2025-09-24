import GameLoop from '../components/apps/Games/common/loop/GameLoop';

describe('GameLoop class', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextId: number;
  let visibility: DocumentVisibilityState;

  beforeAll(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  beforeEach(() => {
    rafCallbacks = new Map();
    nextId = 1;
    visibility = 'visible';
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = nextId++;
      rafCallbacks.set(id, cb);
      return id;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clamps dt to maxDt and advances in fixed steps', () => {
    const ticks: number[] = [];
    const loop = new GameLoop((dt) => ticks.push(dt));
    loop.start();
    rafCallbacks.get(1)?.(0);
    rafCallbacks.get(2)?.(100);
    expect(ticks).toEqual([16, 16, 16]);
    loop.stop();
  });

  it('pauses ticking when the document is hidden', () => {
    const ticks: number[] = [];
    const loop = new GameLoop((dt) => ticks.push(dt));
    loop.start();
    rafCallbacks.get(1)?.(0);
    visibility = 'hidden';
    rafCallbacks.get(2)?.(40);
    expect(ticks).toEqual([]);
    visibility = 'visible';
    rafCallbacks.get(3)?.(80);
    expect(ticks).toEqual([16, 16]);
    loop.stop();
  });

  it('supports interpolation renders', () => {
    const tick = jest.fn();
    const render = jest.fn();
    const loop = new GameLoop(tick, undefined, { render, interpolation: true });
    loop.start();
    rafCallbacks.get(1)?.(8);
    expect(tick).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(0.5);
    loop.stop();
  });

  it('forwards input events to the handler', () => {
    const tick = jest.fn();
    const input = jest.fn();
    const loop = new GameLoop(tick, input);
    loop.start();
    const evt = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(evt);
    expect(input).toHaveBeenCalledWith(evt);
    loop.stop();
  });
});
