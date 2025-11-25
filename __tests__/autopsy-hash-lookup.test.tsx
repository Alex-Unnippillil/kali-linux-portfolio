import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HashLookup from '../apps/autopsy/components/HashLookup';

describe('HashLookup rate limiting', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          'aaa': 'First file',
          'bbb': 'Second file',
        }),
      })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    delete (global as any).fetch;
  });

  it('limits lookup dispatches to three per second', async () => {
    render(<HashLookup />);

    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByLabelText('Hash lookup');
    fireEvent.change(input, { target: { value: 'aaaaaaaa' } });

    const queueButton = screen.getByRole('button', { name: /queue lookup/i });

    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(queueButton);
    }

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const rows = await screen.findAllByTestId('lookup-row');
    const starts = rows.map((row) => Number(row.getAttribute('data-start')));
    const baseline = starts[0];
    const offsets = starts.map((value) => value - baseline);

    expect(offsets.length).toBeGreaterThanOrEqual(4);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBeLessThan(1000);
    expect(offsets[2]).toBeLessThan(1000);
    expect(offsets[3]).toBeGreaterThanOrEqual(1000);
  });

  it('queues repeated manual submissions and shows pending indicator', async () => {
    render(<HashLookup />);

    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByLabelText('Hash lookup');
    fireEvent.change(input, { target: { value: 'bbbbbbbb' } });

    const queueButton = screen.getByRole('button', { name: /queue lookup/i });

    fireEvent.click(queueButton);
    fireEvent.click(queueButton);

    const indicator = screen.getByTestId('pending-indicator');
    expect(indicator.textContent).toMatch(/lookup[s]? pending/i);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    const rows = await screen.findAllByTestId('lookup-row');
    const sameHashRows = rows.filter(
      (row) => row.querySelector('.font-mono')?.textContent === 'bbbbbbbb'
    );
    expect(sameHashRows.length).toBeGreaterThanOrEqual(2);
  });
});
