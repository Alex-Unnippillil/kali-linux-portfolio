import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';

describe('NmapNSEApp', () => {
  it('loads categories and copies composed command', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn() },
      writable: true,
    });

    render(<NmapNSEApp />);

    expect(screen.getByLabelText('category select')).toHaveValue('discovery');
    expect(screen.getByLabelText('script select')).toHaveValue('http-title');

    await user.selectOptions(
      screen.getByLabelText('script select'),
      'ftp-anon'
    );
    expect(
      screen.getByText(/anonymous FTP access/i)
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Target host'), 'example.com');
    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'nmap --script ftp-anon example.com'
    );
    expect(screen.getByText(/Example Output/i).nextSibling?.textContent).toMatch(
      /ftp-anon/
    );
  });
});
