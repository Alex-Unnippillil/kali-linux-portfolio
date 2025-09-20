import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ServicesApp from '../../../components/apps/services';

describe('ServicesApp', () => {

  it('lists services and filters by search query', () => {
    render(<ServicesApp />);

    expect(screen.getByText('Network Scanner')).toBeInTheDocument();
    expect(screen.getByText('Patch Daemon')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Search by name or description');
    fireEvent.change(search, { target: { value: 'patch' } });

    expect(screen.getByText('Patch Daemon')).toBeInTheDocument();
    expect(screen.queryByText('Network Scanner')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nope' } });
    expect(
      screen.getByText('No services match "nope".'),
    ).toBeInTheDocument();
  });

  it('starts and stops a manual service while surfacing logs', async () => {
    render(<ServicesApp />);

    const rowButton = screen.getByRole('button', { name: /^Patch Daemon/ });
    const row = rowButton.closest('tr') as HTMLTableRowElement | null;
    expect(row).not.toBeNull();

    const startButton = within(row as HTMLTableRowElement).getByRole('button', {
      name: /Start Patch Daemon/i,
    });
    fireEvent.click(startButton);

    expect(screen.getByTestId('status-patch-daemon')).toHaveTextContent('Running');

    fireEvent.click(rowButton);
    const logPanel = screen.getByText('Recent Logs').closest('td');
    expect(logPanel).not.toBeNull();
    if (logPanel) {
      expect(within(logPanel).getAllByRole('listitem')[0]).toHaveTextContent(
        'Patch Daemon started.',
      );
    }

    const stopButton = within(row as HTMLTableRowElement).getByRole('button', {
      name: /Stop Patch Daemon/i,
    });
    fireEvent.click(stopButton);

    expect(screen.getByTestId('status-patch-daemon')).toHaveTextContent('Stopped');
    if (logPanel) {
      expect(within(logPanel).getAllByRole('listitem')[0]).toHaveTextContent(
        'Patch Daemon stopped.',
      );
    }
  });

  it('enables and disables a service updating startup type and logs', async () => {
    render(<ServicesApp />);

    const rowButton = screen.getByRole('button', { name: /^Reporting Agent/ });
    fireEvent.click(rowButton);

    const row = rowButton.closest('tr');
    expect(row).not.toBeNull();

    const enableButton = screen.getByRole('button', { name: /Enable Reporting Agent/i });
    fireEvent.click(enableButton);

    if (row) {
      expect(within(row).getByText('Stopped')).toBeInTheDocument();
      expect(within(row).getByText('Automatic')).toBeInTheDocument();
    }

    const logPanel = screen.getByText('Recent Logs').closest('td');
    expect(logPanel).not.toBeNull();
    if (logPanel) {
      expect(within(logPanel).getAllByRole('listitem')[0]).toHaveTextContent(
        'Reporting Agent set to Automatic startup.',
      );
    }

    if (row) {
      const disableButton = within(row).getByRole('button', {
        name: /Disable Reporting Agent/i,
      });
      fireEvent.click(disableButton);
    }

    if (row) {
      expect(within(row).getByText('Disabled')).toBeInTheDocument();
    }
  });
});
