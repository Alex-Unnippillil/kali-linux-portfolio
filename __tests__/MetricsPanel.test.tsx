import { render, screen, waitFor, within } from '@testing-library/react';
import MetricsPanel from '../components/dev/MetricsPanel';
import {
  __testing,
  recordRowsRendered,
  recordWorkerTime,
  updateMetricsConsent,
} from '../utils/metrics';

describe('MetricsPanel', () => {
  const originalNow = Date.now;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';
    __testing.reset();
    updateMetricsConsent({ analyticsEnabled: true, allowNetwork: true });
  });

  afterEach(() => {
    __testing.reset();
    Date.now = originalNow;
    window.localStorage.clear();
  });

  it('renders percentile summaries for recorded metrics', async () => {
    const base = 1_700_100_000_000;
    let current = base;
    Date.now = jest.fn(() => current);

    recordRowsRendered(100);
    current += 1000;
    recordRowsRendered(150);
    current += 1000;
    recordRowsRendered(90);
    current += 500;
    recordWorkerTime(45.5);

    __testing.forceFlush();

    render(<MetricsPanel />);

    expect(await screen.findByText('Performance Metrics')).toBeInTheDocument();

    const rowsHeader = await screen.findByText('Rows Rendered');
    const rowsSection = rowsHeader.closest('section');
    expect(rowsSection).not.toBeNull();

    await waitFor(() => {
      const container = rowsSection as HTMLElement;
      expect(within(container).getByText(/P75 \(last 5 min\)/)).toBeInTheDocument();
      expect(within(container).getByText('Samples')).toBeInTheDocument();
      const value = within(container)
        .getAllByText((content, element) =>
          element?.classList.contains('text-lg') && /rows$/.test(content.trim()),
        )[0];
      expect(value).toBeDefined();
    });

    expect(screen.queryByText(/Client analytics are disabled/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Metrics capture is paused/)).not.toBeInTheDocument();
  });
});

