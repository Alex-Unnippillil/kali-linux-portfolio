import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEPage from '../apps/nmap-nse';

describe('Nmap NSE page header interactions', () => {
  it('shows breadcrumb and copy buttons once a script is selected and run', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        json: () =>
          Promise.resolve({
            safe: [
              {
                name: 'ftp-anon',
                description: 'Checks for anonymous FTP access.',
                example: 'Sample FTP output',
              },
            ],
          }),
      } as unknown as Response);

    const user = userEvent.setup();
    render(<NmapNSEPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const scriptButton = await screen.findByRole('button', { name: 'ftp-anon' });
    await user.click(scriptButton);

    expect(screen.getByTestId('nmap-breadcrumb')).toHaveTextContent('safe › ftp-anon');
    expect(
      screen.getByRole('button', { name: /copy sample output/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run/i }));

    expect(
      await screen.findByRole('button', { name: /copy result json/i })
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });
});

