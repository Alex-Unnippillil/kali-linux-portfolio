import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import Dsniff from '@/components/apps/dsniff';

describe('Dsniff component', () => {
  it('shows fixture logs', async () => {
    render(<Dsniff />);
    expect((await screen.findAllByText('example.com')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('test.com')).length).toBeGreaterThan(0);
  });

  it('applies host filter', async () => {
    render(<Dsniff />);
    const logArea = screen.getByRole('log');
    await within(logArea).findByText('example.com');

    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(within(logArea).getAllByText(/example.com/).length).toBeGreaterThan(0);
    expect(within(logArea).queryByText(/test.com/)).toBeNull();
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
  it('obfuscates credentials by default and reveals on click', async () => {
    render(<Dsniff />);
    expect(await screen.findByText('***')).toBeInTheDocument();
    const showBtn = screen.getByText('Show');
    fireEvent.click(showBtn);
    expect(await screen.findByText('demo123')).toBeInTheDocument();
  });
});

