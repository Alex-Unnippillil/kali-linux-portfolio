import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SchedulerApp from '../../../components/apps/scheduler/SchedulerApp';
import {
  addSchedulerLog,
  clearSchedulerLogs,
} from '../../../modules/scheduler/logs';

describe('SchedulerApp', () => {
  beforeEach(async () => {
    await clearSchedulerLogs();
  });

  it('shows a preview for a valid cron expression', async () => {
    render(<SchedulerApp />);

    fireEvent.change(screen.getByLabelText(/job name/i), {
      target: { value: 'Nightly backup' },
    });
    fireEvent.change(screen.getByPlaceholderText('0 2 * * *'), {
      target: { value: '0 2 * * *' },
    });

    const preview = await screen.findByTestId('schedule-preview');
    expect(preview).toHaveTextContent('Cron expression "0 2 * * *"');

    const rows = within(screen.getByTestId('upcoming-table')).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('adds the daily backup preset', async () => {
    render(<SchedulerApp />);

    fireEvent.click(
      screen.getByRole('button', { name: /enable daily backup preset/i }),
    );

    const headings = await screen.findAllByRole('heading', {
      level: 3,
      name: /Daily backup/i,
    });
    expect(headings).toHaveLength(1);
  });

  it('renders logs with exit code badges', async () => {
    await addSchedulerLog({
      jobId: 'job-1',
      jobName: 'Example job',
      scheduledTime: '2025-01-01T00:00:00.000Z',
      startedAt: '2025-01-01T00:00:01.000Z',
      finishedAt: '2025-01-01T00:02:00.000Z',
      exitCode: 0,
      notes: 'Simulated run',
    });

    render(<SchedulerApp />);

    const noteCell = await screen.findByText('Simulated run');
    const badge = noteCell
      .closest('tr')
      ?.querySelector('[data-testid="exit-code-badge"]');
    expect(badge).toHaveTextContent('Exit 0');
  });
});

