import { act, render } from '@testing-library/react';
import NetworkTest from '../components/apps/diagnostics/NetworkTest';

describe('NetworkTest visibility behaviour', () => {
  let fetchSpy: jest.SpyInstance;
  let hidden = false;
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

  const sampleResponse = {
    seq: 0,
    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
    downloadMbps: 120,
    uploadMbps: 55,
    latencyMs: 24,
    jitterMs: 3,
    packetLoss: 0.12,
  };

  const advanceTimers = async (ms: number) => {
    await act(async () => {
      jest.advanceTimersByTime(ms);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    hidden = false;
    jest.useFakeTimers();
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...sampleResponse }),
      } as Response),
    );
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalHidden) {
      Object.defineProperty(document, 'hidden', originalHidden);
    } else {
      delete (document as any).hidden;
    }
  });

  it('pauses sampling when hidden and resumes when visible', async () => {
    const { unmount } = render(
      <NetworkTest isRunning intervalMs={50} burstSize={1} />,
    );

    await advanceTimers(60);
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockClear();

    act(() => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await advanceTimers(200);
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await advanceTimers(60);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    unmount();
  });
});
