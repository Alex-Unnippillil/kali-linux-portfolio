import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetasploitPost from '../../../apps/metasploit-post';

describe('Metasploit Post queue summary', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates status chips as the queue processes modules', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MetasploitPost />);

    const openBranch = async (label: string) => {
      const summary = screen.getByText(label);
      const details = summary.closest('details');
      if (!details || !details.hasAttribute('open')) {
        await user.click(summary);
      }
    };

    await openBranch('multi');
    await openBranch('recon');
    await user.click(screen.getByRole('button', { name: 'local_exploit_suggester' }));
    await user.click(screen.getByRole('button', { name: /add to queue/i }));

    await openBranch('windows');
    await openBranch('manage');
    await user.click(screen.getByRole('button', { name: 'enable_rdp' }));
    await user.click(screen.getByRole('button', { name: /add to queue/i }));

    const summaryCard = screen.getByTestId('queue-summary-card');
    const initialItems = within(summaryCard).getAllByRole('listitem');
    expect(initialItems).toHaveLength(2);
    expect(within(initialItems[0]).getByText(/Pending/i)).toBeInTheDocument();
    expect(within(initialItems[1]).getByText(/Pending/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run queue/i }));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await waitFor(() => {
      const items = within(summaryCard).getAllByRole('listitem');
      expect(within(items[0]).getByText(/Running/i)).toBeInTheDocument();
      expect(within(items[1]).getByText(/Pending/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await waitFor(() => {
      const items = within(summaryCard).getAllByRole('listitem');
      expect(within(items[0]).getByText(/Done/i)).toBeInTheDocument();
      expect(within(items[1]).getByText(/Pending/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await waitFor(() => {
      const items = within(summaryCard).getAllByRole('listitem');
      expect(within(items[1]).getByText(/Running/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    await waitFor(() => {
      const items = within(summaryCard).getAllByRole('listitem');
      expect(within(items[1]).getByText(/Done/i)).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(summaryCard).toHaveTextContent(/No modules queued/i);
    });

    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
});
