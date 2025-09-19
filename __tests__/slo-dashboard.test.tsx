import { render, screen, within } from '@testing-library/react';
import SloDashboard from '../apps/resource-monitor/components/SloDashboard';
import { HistoryEntry } from '../apps/resource-monitor/components/history';

describe('SLO dashboard', () => {
  const baseEntry = (id: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
    id,
    url: '/api/test',
    method: 'GET',
    startTime: 0,
    duration: 120,
    status: 200,
    timestamp: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('marks latency SLO as breached and appends the regression note', () => {
    const now = Date.now();
    const durations = [100, 150, 400, 450, 500];
    const entries = durations.map((duration, index) =>
      baseEntry(index + 1, {
        duration,
        timestamp: now - index * 60_000,
      }),
    );

    render(<SloDashboard entries={entries} />);

    const latencyTile = screen.getByTestId('slo-tile-p95-latency');
    expect(latencyTile.className).toContain('bg-red-950');
    expect(
      within(latencyTile).getByText(/Latency regression detected — check caches and downstream dependencies./i),
    ).toBeInTheDocument();

    const availabilityTile = screen.getByTestId('slo-tile-api-availability');
    expect(availabilityTile.className).not.toContain('bg-red-950');
  });

  test('flags error budget breaches and surfaces the response note', () => {
    const now = Date.now();
    const entries: HistoryEntry[] = [
      baseEntry(1, { timestamp: now - 1000 }),
      baseEntry(2, { timestamp: now - 2000 }),
      baseEntry(3, { status: 503, duration: 900, timestamp: now - 3000 }),
      baseEntry(4, { error: new Error('network'), timestamp: now - 4000 }),
    ];

    render(<SloDashboard entries={entries} />);

    const errorTile = screen.getByTestId('slo-tile-error-budget');
    expect(errorTile.className).toContain('bg-red-950');
    expect(
      within(errorTile).getByText(/Error budget exhausted — initiate the incident review checklist./i),
    ).toBeInTheDocument();
  });
});
