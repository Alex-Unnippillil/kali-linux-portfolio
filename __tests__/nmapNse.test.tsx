import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';

describe('NmapNSEApp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('filters scripts', async () => {
    const user = userEvent.setup();
    render(<NmapNSEApp />);

    const search = screen.getByLabelText(/search scripts/i);
    await user.type(search, 'ftp');
    const scriptSelect = screen.getByLabelText('script select');
    const options = within(scriptSelect).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('ftp-anon');
  });

  it('saves, loads and quick runs profiles', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<NmapNSEApp />);

    await user.type(
      screen.getByPlaceholderText('Target host'),
      'example.com'
    );
    await user.selectOptions(
      screen.getByLabelText('script select'),
      'ftp-anon'
    );
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(JSON.parse(localStorage.getItem('nmapProfiles') || '[]')).toEqual([
      { target: 'example.com', script: 'ftp-anon' },
    ]);

    unmount();
    render(<NmapNSEApp />);
    const profileSelect = screen.getByLabelText('profile select');
    await user.selectOptions(profileSelect, '0');
    expect(screen.getByPlaceholderText('Target host')).toHaveValue(
      'example.com'
    );
    expect(screen.getByLabelText('script select')).toHaveValue('ftp-anon');

    localStorage.setItem(
      'lastNmapProfile',
      JSON.stringify({ target: 'quick.com', script: 'dns-brute' })
    );
    await user.click(screen.getByRole('button', { name: /quick run/i }));
    expect(
      screen.getByText(/Nmap scan report for quick.com/i)
    ).toBeInTheDocument();
  });
});

