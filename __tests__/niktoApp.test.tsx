import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoApp from '@/components/apps/nikto';

describe('NiktoApp', () => {
  it('parses dropped text report and displays data', async () => {
    render(<NiktoApp />);
    const zone = screen.getByTestId('drop-zone');
    const file = {
      name: 'report.txt',
      text: () => Promise.resolve('Host: example.com\n/admin High'),
    } as any;
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(await screen.findByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('/admin')).toBeInTheDocument();
  });

  it('filters entries by severity and path prefix', async () => {
    const user = userEvent.setup();
    render(<NiktoApp />);
    const zone = screen.getByTestId('drop-zone');
    const file = {
      name: 'report.txt',
      text: () =>
        Promise.resolve(
          'Host: example.com\n/admin High\n/cgi-bin/test Medium'
        ),
    } as any;
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    await screen.findByText('/admin');
    await user.type(
      screen.getByPlaceholderText(/filter path/i),
      '/cgi'
    );
    await user.selectOptions(
      screen.getByLabelText(/filter severity/i),
      'Medium'
    );
    expect(screen.queryByText('/admin')).not.toBeInTheDocument();
    expect(screen.getByText('/cgi-bin/test')).toBeInTheDocument();
  });
});
