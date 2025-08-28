import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Dsniff from '../components/apps/dsniff';

describe('Dsniff component', () => {
  it('shows fixture logs', async () => {
    render(<Dsniff />);
    expect(await screen.findByText('example.com')).toBeInTheDocument();
    expect(await screen.findByText('test.com')).toBeInTheDocument();
  });

  it('applies host filter', async () => {
    render(<Dsniff />);
    await screen.findByText('example.com');

    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getAllByText(/example.com/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/test.com/)).toBeNull();
  });

  it('displays pcap summary and remediation', async () => {
    render(<Dsniff />);
    expect(
      await screen.findByText('PCAP credential leakage demo')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/HTTPS\/TLS to encrypt credentials/i)
    ).toBeInTheDocument();
  });
});

