import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import NotificationCenter, {
  ANNOUNCEMENT_MIN_SPACING_MS,
  ANNOUNCEMENT_RESET_DELAY_MS,
} from '../components/common/NotificationCenter';
import useNotifications from '../hooks/useNotifications';

const AnnouncementTrigger: React.FC = () => {
  const { announce } = useNotifications();
  return (
    <div>
      <button type="button" onClick={() => announce('first message')}>
        first
      </button>
      <button
        type="button"
        onClick={() => {
          announce('second message');
          announce('third message');
        }}
      >
        queue
      </button>
    </div>
  );
};

describe('NotificationCenter live region queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('queues announcements with throttled playback', () => {
    render(
      <NotificationCenter>
        <AnnouncementTrigger />
      </NotificationCenter>,
    );

    const liveRegion = screen.getByRole('status', { hidden: true });
    const firstButton = screen.getByText('first');
    const queueButton = screen.getByText('queue');

    fireEvent.click(firstButton);
    act(() => {
      jest.advanceTimersByTime(ANNOUNCEMENT_RESET_DELAY_MS);
    });
    expect(liveRegion).toHaveTextContent('first message');

    fireEvent.click(queueButton);
    expect(liveRegion).toHaveTextContent('first message');

    act(() => {
      jest.advanceTimersByTime(ANNOUNCEMENT_MIN_SPACING_MS);
    });
    expect(liveRegion).toHaveTextContent('');

    act(() => {
      jest.advanceTimersByTime(ANNOUNCEMENT_RESET_DELAY_MS);
    });
    expect(liveRegion).toHaveTextContent('second message');

    act(() => {
      jest.advanceTimersByTime(ANNOUNCEMENT_MIN_SPACING_MS);
    });
    expect(liveRegion).toHaveTextContent('');

    act(() => {
      jest.advanceTimersByTime(ANNOUNCEMENT_RESET_DELAY_MS);
    });
    expect(liveRegion).toHaveTextContent('third message');
  });
});
