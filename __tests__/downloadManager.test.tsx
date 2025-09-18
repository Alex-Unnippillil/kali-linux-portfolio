import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { DownloadManagerProvider } from '../components/common/DownloadManager';
import useDownloads from '../hooks/useDownloads';

describe('DownloadManagerProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const setup = () =>
    renderHook(() => useDownloads(), {
      wrapper: ({ children }: { children?: ReactNode }) => (
        <DownloadManagerProvider>{children}</DownloadManagerProvider>
      ),
    });

  it('tracks progress, pause, resume, and completion', () => {
    const { result } = setup();

    let id = '';
    act(() => {
      id = result.current.startDownload({
        label: 'Test asset',
        totalBytes: 1000,
        chunkSize: 250,
        intervalMs: 100,
      });
    });

    const getDownload = () => result.current.getDownload(id)!;

    expect(getDownload().status).toBe('downloading');
    expect(getDownload().progress).toBe(0);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(getDownload().bytesDownloaded).toBeGreaterThan(0);
    expect(getDownload().status).toBe('downloading');

    act(() => {
      result.current.pauseDownload(id);
    });

    const pausedProgress = getDownload().bytesDownloaded;
    expect(getDownload().status).toBe('paused');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getDownload().bytesDownloaded).toBe(pausedProgress);

    act(() => {
      result.current.resumeDownload(id);
      jest.advanceTimersByTime(1000);
    });

    expect(getDownload().status).toBe('completed');
    expect(getDownload().bytesDownloaded).toBe(1000);
    expect(getDownload().progress).toBe(1);
  });

  it('handles failures and allows retrying a download', () => {
    const { result } = setup();

    let id = '';
    act(() => {
      id = result.current.startDownload({
        label: 'Fragile asset',
        totalBytes: 800,
        chunkSize: 200,
        intervalMs: 50,
        failAtBytes: 500,
      });
    });

    const getDownload = () => result.current.getDownload(id)!;

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(getDownload().status).toBe('failed');
    expect(getDownload().error).toMatch(/simulated network error/i);
    const failedBytes = getDownload().bytesDownloaded;

    act(() => {
      result.current.retryDownload(id);
      jest.advanceTimersByTime(1000);
    });

    expect(getDownload().status).toBe('completed');
    expect(getDownload().bytesDownloaded).toBe(800);
    expect(getDownload().bytesDownloaded).toBeGreaterThanOrEqual(failedBytes);
  });
});
