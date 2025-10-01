import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Batch from '../components/apps/nmap-nse/Batch';

describe('Nmap NSE batch simulator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('processes queued jobs respecting ordering under constrained concurrency', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender } = render(
      <Batch
        target="alpha.example"
        selectedScripts={['http-title']}
        scriptArgs={{}}
        portFlag=""
        command="nmap --script http-title alpha.example"
      />
    );

    await user.click(
      screen.getByRole('button', { name: /queue current selection/i })
    );

    rerender(
      <Batch
        target="beta.example"
        selectedScripts={['http-title']}
        scriptArgs={{}}
        portFlag=""
        command="nmap --script http-title beta.example"
      />
    );

    await user.click(
      screen.getByRole('button', { name: /queue current selection/i })
    );

    const concurrencyInput = screen.getByLabelText(/concurrent workers/i);
    await user.clear(concurrencyInput);
    await user.type(concurrencyInput, '1');

    await user.click(screen.getByRole('button', { name: /run batch/i }));

    const jobs = screen.getAllByTestId('batch-job');
    const firstJob = jobs[0];
    const secondJob = jobs[1];

    expect(within(secondJob).getByText(/queued/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(within(firstJob).getByText(/running/i)).toBeInTheDocument();
    expect(within(secondJob).getByText(/queued/i)).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(within(firstJob).getByText(/succeeded/i)).toBeInTheDocument();
    expect(within(secondJob).getByText(/succeeded/i)).toBeInTheDocument();
  });

  it('retries failed simulations with explanation before succeeding', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <Batch
        target="gamma.example"
        selectedScripts={['dns-brute']}
        scriptArgs={{}}
        portFlag=""
        command="nmap --script dns-brute gamma.example"
      />
    );

    await user.click(
      screen.getByRole('button', { name: /queue current selection/i })
    );
    await user.click(screen.getByRole('button', { name: /run batch/i }));

    await act(async () => {
      jest.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    const job = screen.getByTestId('batch-job');
    await user.click(within(job).getByText(/logs/i));

    expect(
      within(job).getByText(
        /Simulated DNS brute script timed out – real scans require throttling and permission/i
      )
    ).toBeInTheDocument();
    expect(
      within(job).getByText(/Retrying \(attempt 2 of 2\)/i)
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(within(job).getByText(/succeeded/i)).toBeInTheDocument();
  });

  it('supports cancelling a running job', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <Batch
        target="delta.example"
        selectedScripts={['http-title']}
        scriptArgs={{}}
        portFlag=""
        command="nmap --script http-title delta.example"
      />
    );

    await user.click(
      screen.getByRole('button', { name: /queue current selection/i })
    );
    await user.click(screen.getByRole('button', { name: /run batch/i }));

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });

    const job = screen.getByTestId('batch-job');
    await user.click(
      within(job).getByRole('button', { name: /cancel/i })
    );

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await within(job).findByText((content, element) => {
      return (
        !!element &&
        element.tagName.toLowerCase() === 'span' &&
        /cancelled/i.test(content)
      );
    });
    await user.click(within(job).getByText(/logs/i));
    const cancelledLogs = within(job).getAllByText(/Cancelled by user/i);
    expect(cancelledLogs.length).toBeGreaterThan(0);
  });
});
