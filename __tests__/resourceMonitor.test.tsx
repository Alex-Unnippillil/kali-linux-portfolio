import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ResourceMonitorApp from '../apps/resource-monitor';

describe('Resource monitor controls', () => {
  class MockWorker {
    public listeners = new Map<string, Set<(event: MessageEvent<any>) => void>>();

    public messages: any[] = [];

    postMessage = jest.fn((message: any) => {
      this.messages.push(message);
    });

    addEventListener = (type: string, handler: (event: MessageEvent<any>) => void) => {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      this.listeners.get(type)!.add(handler);
    };

    removeEventListener = (type: string, handler: (event: MessageEvent<any>) => void) => {
      this.listeners.get(type)?.delete(handler);
    };

    terminate = jest.fn();

    emit(data: any) {
      const handlers = this.listeners.get('message');
      handlers?.forEach((handler) => handler({ data } as MessageEvent<any>));
    }
  }

  let workerInstance: MockWorker;
  let workerFactory: jest.Mock;
  let randomSpy: jest.SpyInstance<number, []>;
  const originalWorker = global.Worker;

  beforeEach(() => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);
    workerFactory = jest.fn(() => {
      workerInstance = new MockWorker();
      return workerInstance as unknown as Worker;
    });
    // @ts-ignore override global Worker
    global.Worker = workerFactory;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    randomSpy.mockRestore();
    workerFactory.mockReset();
    global.Worker = originalWorker;
  });

  it('keeps controls responsive while jobs queue under load', async () => {
    render(<ResourceMonitorApp />);

    const slider = await screen.findByLabelText(/parallelism limit/i);
    expect(slider).toBeEnabled();

    act(() => {
      workerInstance.emit({ type: 'metrics', cpu: 55 });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
      workerInstance.emit({ type: 'metrics', cpu: 62 });
    });

    fireEvent.change(slider, { target: { value: '4' } });

    await waitFor(() => {
      expect(screen.getByText(/limit:\s*4/i)).toBeInTheDocument();
    });
    expect(slider).toBeEnabled();

    const runningCount = Number(screen.getByTestId('running-count').textContent);
    expect(runningCount).toBeLessThanOrEqual(4);
  });

  it('engages backpressure when CPU usage exceeds the threshold', async () => {
    render(<ResourceMonitorApp />);

    const slider = await screen.findByLabelText(/parallelism limit/i);
    fireEvent.change(slider, { target: { value: '1' } });
    await waitFor(() => expect(screen.getByText(/limit:\s*1/i)).toBeInTheDocument());

    act(() => {
      workerInstance.emit({ type: 'metrics', cpu: 90 });
    });

    expect(await screen.findByText(/backpressure engaged/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    const runningCount = Number(screen.getByTestId('running-count').textContent);
    expect(runningCount).toBeLessThanOrEqual(1);

    const resumeButton = screen.getByRole('button', { name: /resume/i });
    expect(resumeButton).toBeDisabled();

    act(() => {
      workerInstance.emit({ type: 'metrics', cpu: 45 });
    });

    await waitFor(() => {
      expect(screen.queryByText(/backpressure engaged/i)).not.toBeInTheDocument();
    });

    expect(resumeButton).not.toBeDisabled();
  });
});
