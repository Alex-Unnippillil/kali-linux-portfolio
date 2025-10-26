import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackupApp from '../../../components/apps/backup';

describe('Backup Planner app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('allows preset selection and schedule persistence', async () => {
    render(<BackupApp />);
    const user = userEvent.setup();

    const homeRadio = screen.getByLabelText(/Home directories/i) as HTMLInputElement;
    expect(homeRadio).toBeChecked();

    const settingsRadio = screen.getByLabelText(/Settings profiles/i) as HTMLInputElement;
    await user.click(settingsRadio);
    expect(settingsRadio).toBeChecked();

    expect(window.localStorage.getItem('desktop:backup:preset')).toBe(
      JSON.stringify('settings'),
    );

    const frequencySelect = screen.getByLabelText(/Backup frequency/i) as HTMLSelectElement;
    await user.selectOptions(frequencySelect, 'weekly');

    const daySelect = screen.getByLabelText(/Weekday/i) as HTMLSelectElement;
    await user.selectOptions(daySelect, 'Friday');

    const timeInput = screen.getByLabelText(/Backup time/i) as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: '21:30' } });

    const retentionInput = screen.getByLabelText(/Retention/i) as HTMLInputElement;
    fireEvent.change(retentionInput, { target: { value: '5' } });

    const summary = screen.getByTestId('schedule-summary');
    await waitFor(() =>
      expect(summary).toHaveTextContent('Weekly on Friday at 21:30 — keeping 5 snapshots.'),
    );

    const storedSchedule = JSON.parse(
      window.localStorage.getItem('desktop:backup:schedule') ?? '{}',
    );
    expect(storedSchedule).toMatchObject({
      frequency: 'weekly',
      day: 'Friday',
      time: '21:30',
      retention: 5,
    });
  });

  it('completes a restore rehearsal with verified integrity logs', async () => {
    render(<BackupApp />);
    const user = userEvent.setup();

    const restoreSelect = screen.getByLabelText(/Restore point/i) as HTMLSelectElement;
    await waitFor(() => expect(restoreSelect.value).not.toBe(''));

    await user.click(screen.getByRole('button', { name: /Start restore/i }));

    const status = await screen.findByTestId('restore-status');
    await waitFor(() => expect(status).toHaveTextContent(/Integrity: Verified/i));

    const logList = await screen.findByTestId('restore-log');
    await waitFor(() => {
      const items = within(logList).getAllByRole('listitem');
      expect(items.length).toBeGreaterThan(2);
    });

    const table = await screen.findByTestId('restore-files');
    await waitFor(() => {
      expect(within(table).getAllByText(/Verified/).length).toBeGreaterThan(0);
    });
  });

  it('surfaces checksum mismatches for drift snapshots', async () => {
    render(<BackupApp />);
    const user = userEvent.setup();

    const workspacesRadio = screen.getByLabelText(/Workspaces/i) as HTMLInputElement;
    await user.click(workspacesRadio);

    const restoreSelect = screen.getByLabelText(/Restore point/i) as HTMLSelectElement;
    await waitFor(() =>
      expect(
        Array.from(restoreSelect.options).some(
          (option) => option.value === 'workspaces-2024-05-10-drift',
        ),
      ).toBe(true),
    );

    await user.selectOptions(restoreSelect, 'workspaces-2024-05-10-drift');
    await user.click(screen.getByRole('button', { name: /Start restore/i }));

    const status = await screen.findByTestId('restore-status');
    await waitFor(() => expect(status).toHaveTextContent(/Issues detected/i));

    const logList = await screen.findByTestId('restore-log');
    expect(within(logList).getByText(/checksum mismatch/i)).toBeInTheDocument();
  });
});
