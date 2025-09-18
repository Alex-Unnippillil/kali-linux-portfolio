import React from 'react';
import { render, act } from '@testing-library/react';
import ResourceMonitor from '../components/apps/resource_monitor';

describe('ResourceMonitor visibility integration', () => {
  const originalWorker = global.Worker;
  let workerInstance: { postMessage: jest.Mock; terminate: jest.Mock };
  let rafMock: jest.SpyInstance;
  let cafMock: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    workerInstance = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
    };
    global.Worker = jest.fn(() => workerInstance) as any;

    rafMock = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
      });

    cafMock = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle: number) => {
        clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
      });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    rafMock.mockRestore();
    cafMock.mockRestore();
    global.Worker = originalWorker;
  });

  it('pauses workers when hidden and resumes when visible', () => {
    const { rerender, unmount } = render(<ResourceMonitor visible />);

    expect(workerInstance.postMessage).toHaveBeenCalledWith({ type: 'start' });

    workerInstance.postMessage.mockClear();
    rerender(<ResourceMonitor visible={false} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(workerInstance.postMessage).toHaveBeenCalledWith({ type: 'stop' });

    workerInstance.postMessage.mockClear();
    rerender(<ResourceMonitor visible />);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(workerInstance.postMessage).toHaveBeenCalledWith({ type: 'start' });

    workerInstance.postMessage.mockClear();
    unmount();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(workerInstance.terminate).toHaveBeenCalled();
    expect(workerInstance.postMessage).not.toHaveBeenCalled();
    expect(cafMock).toHaveBeenCalled();
  });
});
