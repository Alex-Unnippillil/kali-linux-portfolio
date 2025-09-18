import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore importing jsx module for tests
import MetasploitApp from '../../../components/apps/metasploit/metasploit.jsx';
import SessionSimulator from '../../../components/apps/metasploit/SessionSimulator';

describe('SessionSimulator', () => {
  beforeEach(() => {
    jest.useRealTimers();
    localStorage.clear();
    // @ts-ignore
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ loot: [], notes: [] }),
      }),
    );
  });

  it('updates output when seeking to a later timestamp', () => {
    render(<SessionSimulator />);

    expect(
      screen.getByText(/msf6 exploit\(multi\/script\/web_delivery\) > run/i),
    ).toBeInTheDocument();

    const slider = screen.getByRole('slider', { name: /seek session timeline/i });
    fireEvent.change(slider, { target: { value: '21' } });

    expect(
      screen.getByText(/Meterpreter session 4 opened/),
    ).toBeInTheDocument();
  });

  it('persists playback state when switching tabs', async () => {
    jest.useFakeTimers();

    render(<MetasploitApp demoMode />);

    const sessionTab = screen.getByRole('tab', { name: /session simulator/i });
    fireEvent.click(sessionTab);

    const playButton = screen.getByRole('button', { name: /play session playback/i });
    fireEvent.click(playButton);

    await act(async () => {
      jest.advanceTimersByTime(26000);
    });

    expect(
      screen.getByText(/Meterpreter session 4 opened/),
    ).toBeInTheDocument();

    const consoleTab = screen.getByRole('tab', { name: /console/i });
    fireEvent.click(consoleTab);

    fireEvent.click(sessionTab);

    expect(
      screen.getByText(/Meterpreter session 4 opened/),
    ).toBeInTheDocument();

    jest.useRealTimers();
  });
});
