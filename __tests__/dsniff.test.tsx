import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import Dsniff from '../components/apps/dsniff';

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

  it('shows triage metrics and supports high-risk-only domain filtering', async () => {
    render(<Dsniff />);

    expect(await screen.findByText('Threat triage dashboard')).toBeInTheDocument();
    expect(screen.getByText('Captured events')).toBeInTheDocument();
    expect(screen.getByText('Credentials exposed')).toBeInTheDocument();

    const domainSummarySection = screen.getByTestId('domain-summary');
    fireEvent.click(screen.getByRole('button', { name: 'High-risk only' }));
    expect(within(domainSummarySection).queryByText('test.com')).not.toBeInTheDocument();
    expect(within(domainSummarySection).getByText('example.com')).toBeInTheDocument();
  });

  it('clears all filters with one action', async () => {
    render(<Dsniff />);
    const logArea = screen.getByRole('log');
    await within(logArea).findByText('example.com');

    fireEvent.change(screen.getByPlaceholderText('Filter captured lines'), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^HTTP$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect((within(logArea).getAllByText(/test.com/).length)).toBeGreaterThan(0);
  });
});
