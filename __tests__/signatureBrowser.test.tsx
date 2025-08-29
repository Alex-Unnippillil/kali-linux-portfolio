import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignatureBrowser from '../apps/nikto/components/SignatureBrowser';

describe('SignatureBrowser', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve([
            {
              check: 'Apache mod_status Information Disclosure',
              category: 'Information Disclosure',
              example: '/server-status',
            },
            {
              check: 'PHP info() page found',
              category: 'Misconfiguration',
              example: '/phpinfo.php',
            },
          ]),
      })
    ) as any;
  });

  it('searches and filters signatures', async () => {
    const user = userEvent.setup();
    render(<SignatureBrowser />);

    await screen.findByText('Apache mod_status Information Disclosure');

    await user.type(screen.getByPlaceholderText(/search/i), 'php');
    expect(screen.getByText('PHP info() page found')).toBeInTheDocument();
    expect(
      screen.queryByText('Apache mod_status Information Disclosure')
    ).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search/i));
    await user.selectOptions(screen.getByDisplayValue('All'), 'Misconfiguration');
    expect(screen.getByText('PHP info() page found')).toBeInTheDocument();
    expect(
      screen.queryByText('Apache mod_status Information Disclosure')
    ).not.toBeInTheDocument();
  });
});
