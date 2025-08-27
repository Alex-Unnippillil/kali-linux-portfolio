import { pointerHandlers } from '../utils/pointer';

describe('pointerHandlers', () => {
  it('calls handler on click', () => {
    const handler = jest.fn();
    const handlers = pointerHandlers(handler);
    handlers.onClick();
    expect(handler).toHaveBeenCalled();
  });

  it('calls handler and prevents default on touchstart', () => {
    const handler = jest.fn();
    const preventDefault = jest.fn();
    const handlers = pointerHandlers(handler);
    handlers.onTouchStart({ preventDefault } as any);
    expect(preventDefault).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });
});
