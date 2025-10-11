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

  it('renders canned output panels backed by fixtures', async () => {
    render(<Dsniff />);
    const library = await screen.findByTestId('canned-output-library');
    expect(
      within(library).getByLabelText('urlsnarf canned output')
    ).toHaveTextContent('HTTP example.com /index.html');

    const arpspoofTab = within(library).getByRole('tab', { name: /arpspoof/i });
    fireEvent.click(arpspoofTab);
    expect(
      within(library).getByLabelText('arpspoof canned output')
    ).toHaveTextContent('ARP reply 192.168.0.1');
  });

  it('builds lab-safe commands once lab mode is enabled', async () => {
    render(<Dsniff />);

    const copyButton = screen.getByText('Copy command');
    expect(copyButton).toBeDisabled();

    const toggle = screen.getByLabelText('Toggle lab mode');
    fireEvent.click(toggle);
    expect(copyButton).not.toBeDisabled();

    fireEvent.change(screen.getByLabelText('Tool'), {
      target: { value: 'arpspoof' },
    });

    const preview = screen.getByTestId('command-preview');
    expect(
      within(preview).getByText(/sudo arpspoof/)
    ).toHaveTextContent(
      'sudo arpspoof -i demo-eth0 -t 198.51.100.10 198.51.100.1 # lab-safe simulation'
    );

    fireEvent.change(screen.getByLabelText('Interface'), {
      target: { value: 'demo-wlan0' },
    });

    expect(
      within(preview).getByText(/sudo arpspoof/)
    ).toHaveTextContent('demo-wlan0');
  });
});

