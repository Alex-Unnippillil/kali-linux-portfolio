import { fireEvent, render, screen } from '@testing-library/react';
import DiskManagerApp from '../../../components/apps/disk-manager';

describe('DiskManagerApp', () => {
  it('renders partitions and updates the selected partition', () => {
    render(<DiskManagerApp />);

    const homeButton = screen.getByRole('button', { name: /select partition home/i });
    fireEvent.click(homeButton);
    expect(screen.getByTestId('selected-partition-name')).toHaveTextContent('Home');

    const vaultButton = screen.getByRole('button', { name: /select partition vault/i });
    fireEvent.click(vaultButton);
    expect(screen.getByTestId('selected-partition-name')).toHaveTextContent('Vault');
  });

  it('prevents formatting encrypted partitions', async () => {
    render(<DiskManagerApp />);

    const vaultButton = screen.getByRole('button', { name: /select partition vault/i });
    fireEvent.click(vaultButton);
    fireEvent.click(screen.getByRole('button', { name: /format/i }));

    expect(await screen.findByText(/encrypted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Format Partition/i)).not.toBeInTheDocument();
  });

  it('requires confirmation before formatting and logs the result', async () => {
    render(<DiskManagerApp />);

    const homeButton = screen.getByRole('button', { name: /select partition home/i });
    fireEvent.click(homeButton);
    fireEvent.click(screen.getByRole('button', { name: /^format$/i }));

    const confirmFormat = screen.getByRole('button', { name: /confirm format/i });
    fireEvent.click(confirmFormat);
    expect(await screen.findByText(/Type "Home" to confirm formatting/i)).toBeInTheDocument();

    const confirmInput = screen.getByLabelText(/Type "Home" to confirm formatting/i);
    fireEvent.change(confirmInput, { target: { value: 'Home' } });
    const filesystemSelect = screen.getByLabelText(/new filesystem/i);
    fireEvent.change(filesystemSelect, { target: { value: 'xfs' } });
    fireEvent.click(confirmFormat);

    expect(await screen.findByText(/Format simulated/i)).toBeInTheDocument();
    expect(screen.getByText(/Formatted Home as xfs/i)).toBeInTheDocument();
  });

  it('updates logs when mounting a partition', async () => {
    render(<DiskManagerApp />);

    const diskSelect = screen.getByLabelText(/disk/i);
    fireEvent.change(diskSelect, { target: { value: 'disk-2' } });

    fireEvent.click(screen.getByRole('button', { name: /mount/i }));
    const mountInput = screen.getByLabelText(/mount point/i);
    fireEvent.change(mountInput, { target: { value: '/mnt/usb' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm mount/i }));

    expect(await screen.findByText(/Mount simulated/i)).toBeInTheDocument();
    expect(screen.getByText(/Mounted Backup at \/mnt\/usb/i)).toBeInTheDocument();
  });
});
