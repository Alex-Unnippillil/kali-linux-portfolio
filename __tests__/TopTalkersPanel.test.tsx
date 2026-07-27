import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopTalkersPanel from '../apps/wireshark/components/TopTalkersPanel';

describe('TopTalkersPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pauses interval updates when the toggle is enabled', async () => {
    const packets = [
      { src: '10.0.0.1', dest: '10.0.0.2', data: new Uint8Array(60) },
      { src: '10.0.0.3', dest: '10.0.0.4', data: new Uint8Array(60) },
    ];
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <TopTalkersPanel
        packets={packets}
        isVisible
        updateInterval={100}
        chunkSize={1}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();

    const pauseToggle = screen.getByLabelText(/pause charts/i);
    await user.click(pauseToggle);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByText('10.0.0.3')).not.toBeInTheDocument();

    await user.click(pauseToggle);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('10.0.0.3')).toBeInTheDocument();
  });
});
