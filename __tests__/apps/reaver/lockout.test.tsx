import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import RouterProfiles from '../../../apps/reaver/components/RouterProfiles';

describe('RouterProfiles lockout behaviour', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('displays a cooldown banner and re-enables attempts after the timer expires', async () => {
    jest.useFakeTimers();
    let now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);

    const onChange = jest.fn();
    const onLockStateChange = jest.fn();

    const { rerender } = render(
      <RouterProfiles
        attempts={0}
        activeApId="ap-1"
        activeApLabel="AP One"
        onChange={onChange}
        onLockStateChange={onLockStateChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Router Vendor Profile'), {
      target: { value: 'netgear' },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'netgear' }),
      );
    });

    onLockStateChange.mockClear();

    rerender(
      <RouterProfiles
        attempts={5}
        activeApId="ap-1"
        activeApLabel="AP One"
        onChange={onChange}
        onLockStateChange={onLockStateChange}
      />,
    );

    expect(await screen.findByText(/Cooldown: 60s/)).toBeInTheDocument();

    expect(onLockStateChange).toHaveBeenCalledWith({
      locked: true,
      remainingSeconds: 60,
      apId: 'ap-1::netgear',
    });

    const advance = async (ms: number) => {
      await act(async () => {
        const step = 250;
        let remaining = ms;
        while (remaining > 0) {
          const delta = Math.min(step, remaining);
          now += delta;
          jest.advanceTimersByTime(delta);
          remaining -= delta;
        }
      });
    };

    await advance(1000);
    expect(await screen.findByText(/Cooldown: 59s/)).toBeInTheDocument();

    onLockStateChange.mockClear();
    await advance(59000);

    await waitFor(() => {
      expect(screen.queryByText(/Cooldown:/)).not.toBeInTheDocument();
    });

    expect(
      screen.getByText(/Attempts on AP One: 0 \/ 5/),
    ).toBeInTheDocument();

    const lastCall =
      onLockStateChange.mock.calls[onLockStateChange.mock.calls.length - 1];
    expect(lastCall?.[0]).toEqual({
      locked: false,
      remainingSeconds: 0,
      apId: 'ap-1::netgear',
    });
  });

  it('maintains attempt counts separately for each AP', async () => {
    const onChange = jest.fn();

    const { rerender } = render(
      <RouterProfiles
        attempts={0}
        activeApId="ap-1"
        activeApLabel="AP One"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Router Vendor Profile'), {
      target: { value: 'netgear' },
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'netgear' }),
      );
    });

    rerender(
      <RouterProfiles
        attempts={2}
        activeApId="ap-1"
        activeApLabel="AP One"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Attempts on AP One: 2 \/ 5/),
    ).toBeInTheDocument();

    rerender(
      <RouterProfiles
        attempts={2}
        activeApId="ap-2"
        activeApLabel="AP Two"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Attempts on AP Two: 0 \/ 5/),
    ).toBeInTheDocument();

    rerender(
      <RouterProfiles
        attempts={3}
        activeApId="ap-2"
        activeApLabel="AP Two"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Attempts on AP Two: 1 \/ 5/),
    ).toBeInTheDocument();

    rerender(
      <RouterProfiles
        attempts={3}
        activeApId="ap-1"
        activeApLabel="AP One"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(/Attempts on AP One: 2 \/ 5/),
    ).toBeInTheDocument();
  });
});
