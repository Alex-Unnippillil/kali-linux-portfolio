import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import BootingScreen, {
  BOOT_MESSAGE_INTERVAL_MS,
  BOOT_MESSAGES,
} from '../components/screen/booting_screen';

describe('BootingScreen message sequencing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const getMessageStates = () =>
    screen
      .getAllByRole('listitem')
      .map((item) => item.getAttribute('data-state'));

  it('advances boot messages in sequence while visible', () => {
    render(<BootingScreen visible turnOn={jest.fn()} isShutDown={false} />);

    expect(getMessageStates()).toEqual(['active', 'upcoming', 'upcoming']);

    act(() => {
      jest.advanceTimersByTime(BOOT_MESSAGE_INTERVAL_MS);
    });
    expect(getMessageStates()).toEqual(['complete', 'active', 'upcoming']);

    act(() => {
      jest.advanceTimersByTime(BOOT_MESSAGE_INTERVAL_MS);
    });
    expect(getMessageStates()).toEqual(['complete', 'complete', 'active']);

    act(() => {
      jest.advanceTimersByTime(BOOT_MESSAGE_INTERVAL_MS * 2);
    });
    expect(getMessageStates()).toEqual(['complete', 'complete', 'active']);
  });

  it('resets and stops advancing when boot completes', () => {
    const turnOn = jest.fn();
    const { rerender } = render(<BootingScreen visible turnOn={turnOn} isShutDown={false} />);

    act(() => {
      jest.advanceTimersByTime(BOOT_MESSAGE_INTERVAL_MS * (BOOT_MESSAGES.length - 1));
    });
    expect(getMessageStates()).toEqual(['complete', 'complete', 'active']);

    rerender(<BootingScreen visible={false} turnOn={turnOn} isShutDown={false} />);
    expect(getMessageStates()).toEqual(['upcoming', 'upcoming', 'upcoming']);

    act(() => {
      jest.advanceTimersByTime(BOOT_MESSAGE_INTERVAL_MS * 2);
    });
    expect(getMessageStates()).toEqual(['upcoming', 'upcoming', 'upcoming']);
  });
});
