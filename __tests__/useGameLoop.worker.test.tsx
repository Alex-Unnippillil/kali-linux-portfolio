import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../utils/feature', () => ({ hasOffscreenCanvas: jest.fn() }));

const { hasOffscreenCanvas } = require('../utils/feature') as {
  hasOffscreenCanvas: jest.Mock;
};
const useGameLoop = require('../components/apps/Games/common/useGameLoop').default as (
  cb: (delta: number) => void,
  running?: boolean,
) => void;

describe('useGameLoop worker integration', () => {
  const originalRaf = global.requestAnimationFrame;
  const originalCancel = global.cancelAnimationFrame;

  afterEach(() => {
    hasOffscreenCanvas.mockReset();
    if (originalRaf) {
      global.requestAnimationFrame = originalRaf;
    } else {
      // @ts-ignore
      delete global.requestAnimationFrame;
    }
    if (originalCancel) {
      global.cancelAnimationFrame = originalCancel;
    } else {
      // @ts-ignore
      delete global.cancelAnimationFrame;
    }
  });

  it('falls back to requestAnimationFrame when OffscreenCanvas is unavailable', async () => {
    hasOffscreenCanvas.mockReturnValue(false);

    const callback = jest.fn();
    const raf = jest.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(32), 0);
      return 1 as unknown as number;
    });
    const cancel = jest.fn();
    global.requestAnimationFrame = raf;
    global.cancelAnimationFrame = cancel;

    const TestComponent = ({ running }: { running: boolean }) => {
      useGameLoop(callback, running);
      return null;
    };

    const { rerender, unmount } = render(<TestComponent running />);
    expect(raf).toHaveBeenCalled();

    rerender(<TestComponent running={false} />);
    unmount();
    expect(cancel).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('routes ticks through the worker when OffscreenCanvas is supported', () => {
    hasOffscreenCanvas.mockReturnValue(true);

    const callback = jest.fn();
    const TestComponent = () => {
      useGameLoop(callback, true);
      return null;
    };

    const { unmount } = render(<TestComponent />);

    expect(callback).toHaveBeenCalledWith(expect.any(Number));
    const WorkerMock = (global as any).__WorkerMock as { instances: any[] };
    expect(WorkerMock.instances.length).toBeGreaterThan(0);

    unmount();
    expect(WorkerMock.instances.length).toBe(0);
  });
});
