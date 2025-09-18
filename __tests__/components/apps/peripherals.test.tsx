import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeripheralsApp from '../../../components/apps/peripherals';

describe('Peripherals app', () => {
  it('renders USB topology with vendor and driver details', () => {
    render(<PeripheralsApp />);

    expect(
      screen.getByRole('tree', { name: /usb device tree/i }),
    ).toBeInTheDocument();

    const storageNode = screen.getByTestId('device-forensic-storage');
    expect(storageNode).toBeInTheDocument();
    expect(within(storageNode).getByText('Forensic Storage Bay')).toBeVisible();
    expect(
      within(storageNode).getByText(/VID 0x174C \/ PID 0x5106/i),
    ).toBeInTheDocument();
    expect(within(storageNode).getByText(/Driver: uas/i)).toBeInTheDocument();
  });

  it('releases auto-closable handles during safe eject', async () => {
    const user = userEvent.setup();
    render(<PeripheralsApp />);

    const storageNode = screen.getByTestId('device-forensic-storage');
    const safeEject = within(storageNode).getByRole('button', {
      name: /safe eject forensic storage bay/i,
    });

    await user.click(safeEject);

    expect(
      within(storageNode).getByText(/safe to remove/i),
    ).toBeInTheDocument();
    expect(
      within(storageNode).getByText(/no open handles\./i),
    ).toBeInTheDocument();
  });

  it('retains manual handles when they cannot be closed automatically', async () => {
    const user = userEvent.setup();
    render(<PeripheralsApp />);

    const adapterNode = screen.getByTestId('device-pcap-adapter');
    const safeEject = within(adapterNode).getByRole('button', {
      name: /safe eject packet capture adapter/i,
    });

    await user.click(safeEject);

    expect(
      within(adapterNode).queryByText(/auto-release ready/i),
    ).not.toBeInTheDocument();
    expect(
      within(adapterNode).getByText(/manual close required/i),
    ).toBeInTheDocument();
  });

  it('surfaces problem devices with troubleshooting guidance', () => {
    render(<PeripheralsApp />);

    const problemNode = screen.getByTestId('device-rf-adapter');
    expect(problemNode).toBeInTheDocument();
    expect(
      within(problemNode).getByText(/driver mismatch detected/i),
    ).toBeInTheDocument();

    const triageLink = within(problemNode).getByRole('link', {
      name: /problem triage tips/i,
    });
    expect(triageLink).toHaveAttribute(
      'href',
      expect.stringContaining('docs/tasks.md#usb-problem-triage'),
    );

    const ejectButton = within(problemNode).getByRole('button', {
      name: /safe eject rf capture adapter/i,
    });
    expect(ejectButton).toBeDisabled();
  });
});
