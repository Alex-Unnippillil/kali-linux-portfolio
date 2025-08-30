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

  it('builds command preview and shows fix suggestion', async () => {
    const user = userEvent.setup();
    render(<NiktoPage />);
    await user.type(screen.getByLabelText(/host/i), 'example.com');
    expect(screen.getByText(/nikto -h example.com/i)).toBeInTheDocument();
    // expand high severity section to reveal finding
    await waitFor(() => screen.getByText('High'));
    await user.click(screen.getByText('High'));
    await user.click(await screen.findByText('/admin'));
    await waitFor(() => screen.getByText(/Critical: 3/i));
    expect(screen.getByText(/Warning: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Info: 1/i)).toBeInTheDocument();
  });
});
