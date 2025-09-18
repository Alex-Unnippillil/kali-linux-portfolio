import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NessusApp from '../apps/nessus';

describe('Nessus category filters', () => {
  const plugins = [
    {
      id: 1,
      name: 'Plugin A',
      severity: 'High',
      cwe: [],
      cve: [],
      tags: ['network'],
      category: 'Network',
    },
    {
      id: 2,
      name: 'Plugin B',
      severity: 'Low',
      cwe: [],
      cve: [],
      tags: ['config'],
      category: 'Configuration',
    },
  ];

  const emptyScan = { findings: [] };

  beforeEach(() => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('plugins.json')) {
        return Promise.resolve({
          json: () => Promise.resolve(plugins),
        }) as any;
      }
      if (url.includes('scanA.json') || url.includes('scanB.json')) {
        return Promise.resolve({
          json: () => Promise.resolve(emptyScan),
        }) as any;
      }
      return Promise.resolve({
        json: () => Promise.resolve([]),
      }) as any;
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('updates pending checks when category toggles change', async () => {
    render(<NessusApp />);

    await waitFor(() => expect(screen.getByText('Plugin A')).toBeInTheDocument());
    expect(screen.getByText(/Pending checks: 2/)).toBeInTheDocument();

    const [networkToggle] = screen.getAllByRole('button', { name: 'Network' });
    fireEvent.click(networkToggle);

    await waitFor(() =>
      expect(screen.getByText(/Pending checks: 1/)).toBeInTheDocument()
    );
    expect(screen.queryByText('Plugin A')).not.toBeInTheDocument();
    expect(screen.getByText('Plugin B')).toBeInTheDocument();

    fireEvent.click(networkToggle);
    await waitFor(() =>
      expect(screen.getByText(/Pending checks: 2/)).toBeInTheDocument()
    );
    expect(screen.getByText('Plugin A')).toBeInTheDocument();
  });
});
