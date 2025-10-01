import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Compare from '../components/apps/nmap-nse/Compare';

const sampleRuns = [
  {
    id: 'baseline',
    label: 'Baseline',
    startedAt: '2024-01-01T12:00:00Z',
    profile: 'nmap baseline',
    hosts: [
      {
        address: '192.0.2.10',
        hostname: 'web',
        ports: [
          { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
          { port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
        ],
      },
      {
        address: '192.0.2.30',
        hostname: 'app',
        ports: [
          { port: 8080, protocol: 'tcp', state: 'open', service: 'http-proxy' },
        ],
      },
    ],
  },
  {
    id: 'followup',
    label: 'Follow-up',
    startedAt: '2024-01-02T12:00:00Z',
    profile: 'nmap follow',
    hosts: [
      {
        address: '192.0.2.10',
        hostname: 'web',
        ports: [
          { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
          { port: 22, protocol: 'tcp', state: 'filtered', service: 'ssh' },
          { port: 443, protocol: 'tcp', state: 'open', service: 'https' },
        ],
      },
    ],
  },
];

describe('Compare component', () => {
  it('summarizes and filters diff results without workers', async () => {
    const originalWorker = global.Worker;
    // @ts-ignore
    global.Worker = undefined;

    try {
      const user = userEvent.setup();
      render(<Compare runs={sampleRuns} isLoading={false} />);

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /New services \(1\)/i })
        ).toBeInTheDocument()
      );

      expect(screen.getByRole('button', { name: /Lost services \(1\)/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Port state changes \(1\)/i })
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Lost services/i }));
      expect(screen.getByText(/8080/)).toBeInTheDocument();
      expect(screen.queryByText(/443/)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /All changes/i }));
      const filterInput = screen.getByPlaceholderText(
        /filter by host, service, or state/i
      );
      await user.clear(filterInput);
      await user.type(filterInput, '192.0.2.10');
      expect(screen.queryByText(/8080/)).not.toBeInTheDocument();
      expect(screen.getByText(/443/)).toBeInTheDocument();
      expect(screen.getByText(/State changed from/i)).toBeInTheDocument();
    } finally {
      // @ts-ignore
      global.Worker = originalWorker;
    }
  });
});
