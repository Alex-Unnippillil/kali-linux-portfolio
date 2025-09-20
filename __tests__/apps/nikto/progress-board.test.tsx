import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressBoard, {
  initialProgressState,
  progressReducer,
} from '@/apps/nikto/components/ProgressBoard';
import type { NiktoFinding } from '@/apps/nikto/types';

describe('progressReducer state machine', () => {
  it('resets counters, tracks ticks, and finishes', () => {
    let state = progressReducer(initialProgressState, {
      type: 'reset',
      totalRequests: 2,
      expectedTotalMs: 600,
    });
    expect(state.status).toBe('idle');
    expect(state.totalRequests).toBe(2);
    expect(state.estimatedRemainingMs).toBe(600);

    state = progressReducer(state, { type: 'start' });
    expect(state.status).toBe('running');

    state = progressReducer(state, {
      type: 'tick',
      severity: 'High',
      durationMs: 350,
    });
    expect(state.requestsCompleted).toBe(1);
    expect(state.severityCounts.High).toBe(1);
    expect(state.totalDurationMs).toBe(350);
    expect(state.estimatedRemainingMs).toBe(250);

    state = progressReducer(state, { type: 'pause' });
    expect(state.status).toBe('paused');

    state = progressReducer(state, { type: 'resume' });
    expect(state.status).toBe('running');

    state = progressReducer(state, {
      type: 'tick',
      severity: null,
      durationMs: 250,
    });
    expect(state.status).toBe('finished');
    expect(state.requestsCompleted).toBe(2);
    expect(state.estimatedRemainingMs).toBe(0);
    expect(state.severityCounts.High).toBe(1);
  });

  it('ignores start when there are no requests', () => {
    const state = progressReducer(initialProgressState, { type: 'start' });
    expect(state.status).toBe('idle');
  });

  it('completes gracefully even if forced', () => {
    let state = progressReducer(initialProgressState, {
      type: 'reset',
      totalRequests: 3,
      expectedTotalMs: 900,
    });
    state = progressReducer(state, { type: 'complete' });
    expect(state.status).toBe('finished');
    expect(state.requestsCompleted).toBe(3);
    expect(state.estimatedRemainingMs).toBe(0);
  });
});

describe('ProgressBoard component', () => {
  const findings: NiktoFinding[] = [
    {
      path: '/admin',
      finding: 'Admin panel exposed',
      references: ['OSVDB-1'],
      severity: 'High',
      details: 'demo',
    },
  ];

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('pauses the loop and aborts pending mock requests', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    let resolveFetch: (() => void) | null = null;
    let aborted = 0;

    global.fetch = jest.fn((_, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        const onAbort = () => {
          aborted += 1;
          init?.signal?.removeEventListener('abort', onAbort);
          resolveFetch = null;
          reject(new DOMException('Aborted', 'AbortError'));
        };
        init?.signal?.addEventListener('abort', onAbort);
        resolveFetch = () => {
          init?.signal?.removeEventListener('abort', onAbort);
          resolveFetch = null;
          resolve({} as Response);
        };
      });
    }) as unknown as typeof fetch;

    render(<ProgressBoard findings={findings} />);

    await user.click(screen.getByRole('button', { name: /start run/i }));

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /pause/i }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(aborted).toBe(1);
    expect(screen.getByTestId('requests-count').textContent).toContain('0 /');

    await user.click(screen.getByRole('button', { name: /resume/i }));
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFetch?.();
      await Promise.resolve();
    });

    expect(screen.getByTestId('requests-count').textContent).toContain('1 /');
    expect(screen.getByTestId('severity-high').textContent).toContain('1');
  });
});
