import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoPage from '../apps/nikto';

describe('NiktoPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
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
      })
    ) as any;
  });

  it('builds command preview and shows fix suggestion', async () => {
    const user = userEvent.setup();
    render(<NiktoPage />);
    await user.type(screen.getByLabelText(/host/i), 'example.com');
    expect(screen.getByText(/nikto -h example.com/i)).toBeInTheDocument();
    await waitFor(() => screen.getByText('/admin'));
    await user.click(screen.getByText('/admin'));
    expect(
      await screen.findByText(/Restrict access to the admin portal/i)
    ).toBeInTheDocument();
  });
});
