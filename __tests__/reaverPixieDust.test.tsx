import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PixieDustDemo, {
  PIXIE_STEP_DELAY,
  PIXIE_STEPS,
} from '@/apps/reaver/components/PixieDustDemo';
import { ReaverPanel } from '@/apps/reaver';

jest.mock('@/apps/reaver/components/APList', () => ({
  __esModule: true,
  default: () => <div data-testid="reaver-ap-list">Mocked AP list</div>,
}));

describe('PixieDustDemo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('advances steps sequentially and completes the demo', () => {
    render(<PixieDustDemo onCancel={jest.fn()} />);

    const secondProgress = screen.getByLabelText('Derive nonces and keys progress');

    act(() => {
      jest.advanceTimersByTime(PIXIE_STEPS[0].duration - PIXIE_STEP_DELAY);
    });

    expect(secondProgress).toHaveTextContent('0%');

    act(() => {
      jest.advanceTimersByTime(PIXIE_STEP_DELAY + PIXIE_STEPS[0].duration);
    });

    expect(Number(secondProgress.textContent?.replace('%', '') || 0)).toBeGreaterThan(0);

    const totalDuration = PIXIE_STEPS.reduce((sum, step) => sum + step.duration, 0);
    act(() => {
      jest.advanceTimersByTime(totalDuration + PIXIE_STEP_DELAY * PIXIE_STEPS.length);
    });

    expect(screen.getByText(/offline key recovered/i)).toBeInTheDocument();
  });
});

describe('ReaverPanel Pixie Dust integration', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockImplementation((url: RequestInfo | URL) => {
      const href = typeof url === 'string' ? url : url.toString();
      if (href.includes('routers')) {
        return Promise.resolve({
          json: () => Promise.resolve([{ model: 'Test Router', notes: 'Demo router' }]),
        }) as unknown as Promise<Response>;
      }
      if (href.includes('aps')) {
        return Promise.resolve({
          json: () => Promise.resolve([{ ssid: 'Demo', bssid: '00:00:00:00', wps: 'enabled' }]),
        }) as unknown as Promise<Response>;
      }
      return Promise.reject(new Error('Unknown resource'));
    });
    // @ts-ignore
    global.fetch = mockFetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
    global.fetch = originalFetch;
  });

  it('returns to the AP list when cancelling the guided demo', async () => {
    await act(async () => {
      render(<ReaverPanel />);
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const pending = mockFetch.mock.results
      .map((result) => result.value)
      .filter((value): value is Promise<unknown> => value instanceof Promise);

    await act(async () => {
      await Promise.all(pending);
    });

    const openButton = screen.getByRole('button', { name: /pixie dust guided demo/i });
    fireEvent.click(openButton);

    expect(screen.getByTestId('pixie-dust-demo')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel demo/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId('pixie-dust-demo')).not.toBeInTheDocument();
    expect(screen.getByTestId('reaver-ap-list')).toBeInTheDocument();
  });
});
