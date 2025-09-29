import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import Hashcat from '../index';
import type { BenchmarkWorkerOutgoingMessage } from '../worker-types';

class MockWorker {
  public onmessage: ((event: MessageEvent<BenchmarkWorkerOutgoingMessage>) => void) | null = null;

  public postMessage = jest.fn();

  public terminate = jest.fn();

  public addEventListener = jest.fn();

  public removeEventListener = jest.fn();

  emit(message: BenchmarkWorkerOutgoingMessage) {
    this.onmessage?.({ data: message } as MessageEvent<BenchmarkWorkerOutgoingMessage>);
  }
}

describe('Hashcat benchmark worker integration', () => {
  let originalWorker: typeof Worker | undefined;
  let mockWorkerInstance: MockWorker;
  let workerConstructor: jest.Mock;

  beforeEach(() => {
    originalWorker = global.Worker;
    workerConstructor = jest.fn(() => {
      mockWorkerInstance = new MockWorker();
      return mockWorkerInstance as unknown as Worker;
    });
    (global as unknown as { Worker: typeof Worker }).Worker = workerConstructor as unknown as typeof Worker;
  });

  afterEach(() => {
    (global as unknown as { Worker?: typeof Worker }).Worker = originalWorker as typeof Worker;
    jest.resetAllMocks();
  });

  it('starts a benchmark and reacts to worker progress while keeping UI interactive', async () => {
    const { getByText, getByPlaceholderText } = render(<Hashcat />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(getByText('Start Benchmark'));

    expect(workerConstructor).toHaveBeenCalledTimes(1);
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'start',
        payload: expect.objectContaining({ scenario: expect.any(String) }),
      }),
    );

    act(() => {
      mockWorkerInstance.emit({
        type: 'progress',
        progress: 42,
        eta: '00:30',
        speed: 2400,
        recovered: 0,
        log: 'GPU0 applying best64 ruleset',
        scenario: 'Quick audit',
      });
    });

    expect(getByText('ETA: 00:30')).toBeInTheDocument();

    const dictInput = getByPlaceholderText('rockyou.txt') as HTMLInputElement;
    fireEvent.change(dictInput, { target: { value: 'demo.txt' } });
    expect(dictInput.value).toBe('demo.txt');
  });

  it('sends stop to the worker and updates the summary', async () => {
    const { getByText, getByTestId } = render(<Hashcat />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(getByText('Start Benchmark'));
    fireEvent.click(getByText('Stop Benchmark'));

    expect(mockWorkerInstance.postMessage).toHaveBeenLastCalledWith({ type: 'stop' });
    expect(getByTestId('benchmark-summary').textContent).toMatch(/Stop requested/);
  });

  it('terminates the worker on unmount', async () => {
    const { unmount } = render(<Hashcat />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockWorkerInstance.terminate).not.toHaveBeenCalled();
    unmount();
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });
});
