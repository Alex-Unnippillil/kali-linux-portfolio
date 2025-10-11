import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoPage from '../apps/nikto';

describe('NiktoPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: string) => {
      if (url.endsWith('report.json')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve([
              {
                path: '/admin',
                finding: 'admin portal',
                references: ['OSVDB-1'],
                severity: 'High',
                details: 'details',
              },
            ]),
        }) as any;
      }
      return Promise.resolve({
        text: () =>
          Promise.resolve(
            [
              '+ Server: Apache/2.4.41 (Ubuntu)',
              '+ The X-XSS-Protection header is not defined. This can allow XSS.',
              '+ /login.php: Database error reveals SQL injection vulnerability.',
              '+ /etc/passwd: Local File Inclusion vulnerability.',
              '+ http://example.com/remote.txt: Remote File Inclusion vulnerability.',
            ].join('\n')
          ),
      }) as any;
    }) as any;
  });

  it('builds command preview and toggles severity group details', async () => {
    const user = userEvent.setup();
    render(<NiktoPage />);
    await user.type(screen.getByLabelText(/host/i), 'example.com');
    expect(screen.getByText(/nikto -h example.com/i)).toBeInTheDocument();
    const highCard = await screen.findByText(/High Findings/i);
    expect(highCard).toBeInTheDocument();
    await waitFor(() => screen.getByText(/Recommended remediation/i));
    const toggleButton = screen.getByRole('button', { name: /hide details/i });
    await user.click(toggleButton);
    await waitFor(() => expect(screen.queryByText(/Recommended remediation/i)).not.toBeInTheDocument());
    const showButton = screen.getByRole('button', { name: /show details/i });
    await user.click(showButton);
    await waitFor(() => screen.getByText(/Recommended remediation/i));
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    await waitFor(() => screen.getByText(/Critical: 3/i));
    expect(screen.getByText(/Warning: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Info: 1/i)).toBeInTheDocument();
  });
});
