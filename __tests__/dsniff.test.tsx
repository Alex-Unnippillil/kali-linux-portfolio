import React from 'react';
import {
  render,
  fireEvent,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
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

  it('steps through capture frames and updates explanation', async () => {
    render(<Dsniff />);
    await screen.findByText('PCAP credential leakage demo');
    const explanation = screen.getByTestId('frame-explanation');
    expect(explanation).toHaveTextContent(
      /attacker poisons the victim's arp cache/i,
    );

    const nextButton = screen.getByRole('button', { name: /next frame/i });
    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(explanation).toHaveTextContent(/the gateway is poisoned/i),
    );
    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(explanation).toHaveTextContent(/victim browses to the login page/i),
    );
  });

  it('highlights topology and ARP entries for the active frame', async () => {
    render(<Dsniff />);
    const topologyPanel = await screen.findByTestId('topology-panel');
    const attackerNode = within(topologyPanel).getByText(/attacker \(dsniff\)/i);
    const attackerItem = attackerNode.closest('li') as HTMLElement;
    expect(attackerItem).toHaveAttribute('aria-current', 'true');
    const serverNode = within(topologyPanel).getByText(/web server/i);
    const serverItem = serverNode.closest('li') as HTMLElement;
    expect(serverItem).not.toHaveAttribute('aria-current', 'true');

    const arpTable = screen.getByTestId('arp-table');
    const gatewayRow = within(arpTable)
      .getByText('192.168.0.1')
      .closest('tr') as HTMLElement;
    const victimRow = within(arpTable)
      .getByText('192.168.0.5')
      .closest('tr') as HTMLElement;
    expect(gatewayRow.className).toMatch(/bg-ubt-blue\/40/);
    expect(victimRow.className).toMatch(/bg-ubt-blue\/40/);

    const nextButton = screen.getByRole('button', { name: /next frame/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    await waitFor(() =>
      expect(serverItem).toHaveAttribute('aria-current', 'true'),
    );
    await waitFor(() =>
      expect(gatewayRow.className).not.toMatch(/bg-ubt-blue\/40/),
    );
    await waitFor(() =>
      expect(victimRow.className).toMatch(/bg-ubt-blue\/40/),
    );
  });

  it('exports the current capture slice', async () => {
    render(<Dsniff />);
    await screen.findByText('PCAP credential leakage demo');

    const createObjectURL = jest.fn(() => 'blob:dsniff');
    const revokeObjectURL = jest.fn();
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;

    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest.spyOn(document.body, 'removeChild');

    fireEvent.click(screen.getByRole('button', { name: /export slice/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    appendSpy.mockRestore();
    removeSpy.mockRestore();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: originalCreate,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevoke,
    });
  });
});

