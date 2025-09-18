import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoReportClient from '../components/nikto/NiktoReportClient';
import type { NiktoFinding } from '../lib/reports/nikto';

describe('NiktoReportClient', () => {
  const baseData: NiktoFinding[] = [
    {
      path: '/admin',
      finding: 'admin portal',
      references: ['OSVDB-1'],
      severity: 'High',
      details: 'details',
    },
    {
      path: '/cgi-bin',
      finding: 'cgi script',
      references: ['CVE-1'],
      severity: 'Medium',
      details: 'details',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn((input: RequestInfo) => {
      const url = typeof input === 'string' ? input : input.url;
      const parsed = new URL(url, 'http://localhost');
      const path = parsed.searchParams.get('path')?.toLowerCase() ?? '';
      const severity = parsed.searchParams.get('severity');
      let findings = [...baseData];
      if (path) {
        findings = findings.filter((item) => item.path.toLowerCase().startsWith(path));
      }
      if (severity && severity !== 'All') {
        findings = findings.filter((item) => item.severity === severity);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            findings,
            matchCount: findings.length,
            availableSeverities: ['All', 'High', 'Medium'],
            timings: { serverMs: 5 },
          }),
      }) as unknown as Promise<Response>;
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('filters by path and severity and shows details', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <NiktoReportClient
        initialData={{
          findings: baseData,
          summaryCounts: { High: 1, Medium: 1 },
          filters: { severity: 'All', path: '' },
          matchCount: baseData.length,
          availableSeverities: ['All', 'High', 'Medium'],
          timings: { serverMs: 0 },
        }}
      />,
    );

    await screen.findByText('/admin');
    expect(screen.getAllByRole('row')).toHaveLength(3);

    await user.type(screen.getByPlaceholderText(/filter by path/i), '/cgi');
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('path=%2Fcgi'));
    expect(await screen.findByText('/cgi-bin')).toBeInTheDocument();
    expect(screen.queryByText('/admin')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/filter by path/i));
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await user.selectOptions(screen.getByLabelText(/severity/i), 'High');
    await screen.findByText('/admin');
    expect(screen.queryByText('/cgi-bin')).not.toBeInTheDocument();

    await user.click(screen.getByText('/admin'));
    expect(await screen.findByText(/Severity:/i)).toBeInTheDocument();
  });
});
