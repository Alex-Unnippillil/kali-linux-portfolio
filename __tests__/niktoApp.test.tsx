import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NiktoApp from '../components/apps/nikto';

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
});
