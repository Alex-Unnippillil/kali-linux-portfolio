import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoReport from '../pages/nikto-report';

describe('NiktoReport', () => {
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
            {
              path: '/cgi-bin',
              finding: 'cgi script',
              references: ['CVE-1'],
              severity: 'Medium',
              details: 'details',
            },
          ]),
      })
    ) as any;
  });

  it('filters by path and severity and shows details', async () => {
    const user = userEvent.setup();
    render(<NiktoReport />);

    await screen.findByText('/admin');
    expect(screen.getAllByRole('row')).toHaveLength(3);

    await user.type(screen.getByPlaceholderText(/filter by path/i), 'cgi');
    expect(screen.queryByText('/admin')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/filter by path/i));
    await user.selectOptions(screen.getByDisplayValue('All'), 'High');
    expect(screen.getByText('/admin')).toBeInTheDocument();
    expect(screen.queryByText('/cgi-bin')).not.toBeInTheDocument();

    await user.click(screen.getByText('/admin'));
    expect(await screen.findByText(/Severity:/i)).toBeInTheDocument();
  });
});
