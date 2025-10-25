import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import OpenVASReport from '../index';

describe('OpenVASReport filters and details', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('filters findings by severity toggles', async () => {
    window.localStorage.setItem('lab-mode', 'true');
    render(<OpenVASReport />);

    await screen.findByText('OpenSSL Buffer Overflow');

    const criticalToggle = screen.getByRole('button', {
      name: /Critical severity filter/,
    });

    fireEvent.click(criticalToggle);

    await waitFor(() => {
      expect(
        screen.queryByText('OpenSSL Buffer Overflow'),
      ).not.toBeInTheDocument();
    });
  });

  it('filters findings by type toggles', async () => {
    window.localStorage.setItem('lab-mode', 'true');
    render(<OpenVASReport />);

    const configurationToggle = await screen.findByRole('button', {
      name: /Configuration type filter/,
    });

    fireEvent.click(configurationToggle);

    await waitFor(() => {
      expect(screen.queryByText('SSH Weak Cipher')).not.toBeInTheDocument();
    });
  });

  it('expands a row to reveal description, remediation, and timeline', async () => {
    window.localStorage.setItem('lab-mode', 'true');
    render(<OpenVASReport />);

    const row = await screen.findByText('OpenSSL Buffer Overflow');
    fireEvent.click(row);

    await screen.findByText('Remote code execution via crafted packet.');
    const remediationTexts = await screen.findAllByText(
      'Update OpenSSL to the latest version',
    );
    expect(remediationTexts.length).toBeGreaterThan(0);
    await screen.findByText('Detected during weekly scan.');
  });
});
