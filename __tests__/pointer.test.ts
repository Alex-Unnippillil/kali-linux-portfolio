import { pointerHandlers } from '../utils/pointer';

describe('pointerHandlers', () => {
  it('captures the pointer and calls the handler on pointer down', () => {
    const handler = jest.fn();
    const preventDefault = jest.fn();
    const setPointerCapture = jest.fn();
    const handlers = pointerHandlers(handler);

    handlers.onPointerDown({
      preventDefault,
      currentTarget: { setPointerCapture } as any,
      pointerId: 5,
    } as any);

    expect(preventDefault).toHaveBeenCalled();
    expect(setPointerCapture).toHaveBeenCalledWith(5);
    expect(handler).toHaveBeenCalled();
  });

  it('releases pointer capture on pointer up', () => {
    const handler = jest.fn();
    const releasePointerCapture = jest.fn();
    const hasPointerCapture = jest.fn().mockReturnValue(true);
    const handlers = pointerHandlers(handler);

    handlers.onPointerUp({
      currentTarget: { releasePointerCapture, hasPointerCapture } as any,
      pointerId: 2,
    } as any);

    expect(releasePointerCapture).toHaveBeenCalledWith(2);
  });
});
