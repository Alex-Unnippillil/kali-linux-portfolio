import React from 'react';
import { act, render, screen } from '@testing-library/react';
import APList from '../../../apps/reaver/components/APList';

describe('Reaver access point discovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('paces discovered entries according to the interval', async () => {
    render(<APList intervalMs={1000} maxEntries={4} />);

    expect(screen.getAllByTestId('ap-skeleton').length).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(900);
      await Promise.resolve();
    });
    expect(screen.queryAllByTestId('ap-entry')).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(100);
      await Promise.resolve();
    });
    let entries = await screen.findAllByTestId('ap-entry');
    expect(entries).toHaveLength(1);
    expect(screen.getAllByTestId('ap-skeleton').length).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    entries = await screen.findAllByTestId('ap-entry');
    expect(entries).toHaveLength(2);
  });

  it('resets discovered access points when the interval changes', async () => {
    const { rerender } = render(
      <APList intervalMs={1000} maxEntries={4} />
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect((await screen.findAllByTestId('ap-entry')).length).toBe(1);

    rerender(<APList intervalMs={500} maxEntries={4} />);
    expect(screen.queryAllByTestId('ap-entry')).toHaveLength(0);
    expect(screen.getAllByTestId('ap-skeleton').length).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect((await screen.findAllByTestId('ap-entry')).length).toBe(1);
  });
});
