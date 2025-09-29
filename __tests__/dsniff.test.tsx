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
    const hostRow = await screen.findByTestId('domain-row-192.168.0.10');
    expect(within(hostRow).getByText('***')).toBeInTheDocument();
    const showBtn = within(hostRow).getByText('Show');
    fireEvent.click(showBtn);
    expect(within(hostRow).getByText('demo123')).toBeInTheDocument();
  });

  it('reveals credentials in the detail panel after a single host click', async () => {
    render(<Dsniff />);
    const hostRow = await screen.findByTestId('domain-row-192.168.0.10');
    fireEvent.click(hostRow);

    const detailPanel = await screen.findByTestId('credential-detail-panel');
    expect(
      within(detailPanel).getByText(/Credentials for 192\.168\.0\.10/i),
    ).toBeInTheDocument();
    expect(await within(detailPanel).findByText('demo123')).toBeInTheDocument();
  });

  it('maintains selection when switching between protocol tabs', async () => {
    render(<Dsniff />);
    const hostRow = await screen.findByTestId('domain-row-192.168.0.10');
    fireEvent.click(hostRow);

    fireEvent.click(screen.getByRole('button', { name: /^arpspoof$/i }));
    let detailPanel = await screen.findByTestId('credential-detail-panel');
    expect(
      within(detailPanel).getByRole('heading', {
        name: /credentials for 192\.168\.0\.10/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^urlsnarf$/i }));
    detailPanel = await screen.findByTestId('credential-detail-panel');
    expect(
      within(detailPanel).getByRole('heading', {
        name: /credentials for 192\.168\.0\.10/i,
      }),
    ).toBeInTheDocument();
  });
});

