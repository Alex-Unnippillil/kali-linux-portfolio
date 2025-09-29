import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toPng } from 'html-to-image';
import SummaryDashboard, { buildSummaryRows } from '../apps/nessus/components/SummaryDashboard';
import { Severity } from '../apps/nessus/types';

jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,exported')),
}));

const mockCreateObjectURL = jest.fn(() => 'blob:mock');
const mockRevokeObjectURL = jest.fn();
const anchorClick = jest
  .spyOn(HTMLAnchorElement.prototype, 'click')
  .mockImplementation(() => undefined);

type SeverityRecord = Record<Severity, boolean>;

describe('SummaryDashboard exports', () => {
  beforeAll(() => {
    (global.URL as any).createObjectURL = mockCreateObjectURL;
    (global.URL as any).revokeObjectURL = mockRevokeObjectURL;
  });

  beforeEach(() => {
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  afterAll(() => {
    anchorClick.mockRestore();
  });

  const summary: Record<Severity, number> = {
    Critical: 7,
    High: 5,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  const severityFilters: SeverityRecord = {
    Critical: true,
    High: false,
    Medium: true,
    Low: true,
    Info: true,
  };

  it('buildSummaryRows zeroes filtered severities for display/export parity', () => {
    const rows = buildSummaryRows(summary, severityFilters);
    const highRow = rows.find((row) => row.severity === 'High');
    expect(highRow).toBeDefined();
    expect(highRow?.count).toBe(0);
    expect(highRow?.included).toBe(false);
  });

  it('exports CSV with counts matching rendered cards', async () => {
    const onExport = jest.fn();
    render(
      <SummaryDashboard
        summary={summary}
        trend={[17, 18]}
        filters={{ severity: severityFilters, tags: ['compliance'] }}
        onExport={onExport}
      />,
    );

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    const csvCall = onExport.mock.calls.find((call) => call[0] === 'csv');
    expect(csvCall).toBeDefined();
    const csv = csvCall?.[1] as string;
    const lines = csv.split('\n');

    const dataLines = lines.filter((line) =>
      ['Critical', 'High', 'Medium', 'Low', 'Info'].some((label) =>
        line.startsWith(`${label},`),
      ),
    );

    dataLines.forEach((line) => {
      const [severity, count, included] = line.split(',');
      const card = screen.getByTestId(`summary-card-${severity}`);
      expect(card).toHaveTextContent(count);
      const filterState = severityFilters[severity as Severity];
      expect(included).toBe(filterState ? 'true' : 'false');
    });

    expect(lines[0]).toContain('Active Severities');
    expect(lines[0]).toContain('Critical|Medium|Low|Info');
  });

  it('exports JSON snapshot aligned with cards and trend', async () => {
    const onExport = jest.fn();
    render(
      <SummaryDashboard
        summary={summary}
        trend={[17, 18]}
        filters={{ severity: severityFilters, tags: ['pci'] }}
        onExport={onExport}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /export json/i }));

    const jsonCall = onExport.mock.calls.find((call) => call[0] === 'json');
    expect(jsonCall).toBeDefined();
    const snapshot = JSON.parse(jsonCall?.[1] as string) as ReturnType<typeof JSON.parse>;

    const totalFromCards = ['Critical', 'High', 'Medium', 'Low', 'Info'].reduce(
      (acc, sev) => acc + Number(screen.getByTestId(`summary-card-${sev}`).textContent?.match(/\d+/)?.[0] ?? 0),
      0,
    );

    expect(snapshot.summary).toHaveLength(5);
    snapshot.summary.forEach((entry: { severity: Severity; count: number; included: boolean }) => {
      const card = screen.getByTestId(`summary-card-${entry.severity}`);
      expect(card).toHaveTextContent(String(entry.count));
      expect(entry.included).toBe(severityFilters[entry.severity]);
    });

    expect(snapshot.totals.overall).toBe(totalFromCards);
    expect(snapshot.totals.trend).toEqual([17, 18]);
    expect(snapshot.filters.tags).toEqual(['pci']);
  });

  it('exports image using html-to-image snapshot', async () => {
    const onExport = jest.fn();
    render(
      <SummaryDashboard
        summary={summary}
        trend={[10, 12]}
        filters={{ severity: severityFilters, tags: [] }}
        onExport={onExport}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /export image/i }));

    expect(toPng).toHaveBeenCalledTimes(1);
    const imgCall = onExport.mock.calls.find((call) => call[0] === 'image');
    expect(imgCall?.[1]).toBe('data:image/png;base64,exported');
  });
});
