import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NetworkScanner from '../components/apps/network-scanner';
import results from '../data/network-scanner.json';

const sampleResults = results as unknown as Parameters<typeof NetworkScanner>[0]['results'];

describe('NetworkScanner', () => {
  afterEach(() => {
    delete process.env.FEATURE_TOOL_APIS;
    delete process.env.NEXT_PUBLIC_FEATURE_TOOL_APIS;
  });

  it('prompts for the feature flag when Tool APIs are disabled', () => {
    render(<NetworkScanner results={sampleResults} />);

    expect(screen.getByText(/tool apis disabled/i)).toBeInTheDocument();
    expect(
      screen.getByText(/flag to load the network scanner simulation\./i),
    ).toBeInTheDocument();
  });

  it('renders canned scan data and allows filtering when enabled', async () => {
    process.env.FEATURE_TOOL_APIS = 'enabled';
    const user = userEvent.setup();

    render(<NetworkScanner results={sampleResults} />);

    expect(
      screen.getByRole('heading', { name: /network scanner simulation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/simulation only/i)).toBeInTheDocument();
    expect(screen.getByText(/10\.42\.1\.15/)).toBeInTheDocument();
    expect(screen.getByText('22/tcp')).toBeInTheDocument();
    expect(screen.getByText('80/tcp')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /filtered/i }));
    expect(screen.getByText('3306/tcp')).toBeInTheDocument();
    expect(screen.queryByText('22/tcp')).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/target host/i),
      'files-02.lab',
    );
    expect(screen.getByText(/10\.42\.2\.8/)).toBeInTheDocument();
    expect(screen.getByText('53/udp')).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/search ports/i);
    await user.clear(searchInput);
    await user.type(searchInput, 'smb');

    expect(screen.getByText('139/tcp')).toBeInTheDocument();
    expect(screen.queryByText('53/udp')).not.toBeInTheDocument();
  });
});

