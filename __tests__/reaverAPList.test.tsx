import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import APList from '../apps/reaver/components/APList';

const sampleAps = [
  { ssid: 'CafeWiFi', bssid: '00:11:22:33:44:55', wps: 'enabled' as const },
  { ssid: 'HomeSecure', bssid: '66:77:88:99:AA:BB', wps: 'locked' as const },
  { ssid: 'Guest', bssid: 'CC:DD:EE:FF:00:11', wps: 'disabled' as const },
];

describe('APList scanning simulation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue(sampleAps),
    } as unknown as Response);
    jest.spyOn(global.Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reveals access points gradually based on staggered timers', async () => {
    render(<APList />);

    const startButton = await screen.findByRole('button', { name: /start scan/i });

    await waitFor(() => expect(startButton).not.toBeDisabled());

    const stopButton = screen.getByRole('button', { name: /stop scan/i });

    await act(async () => {
      startButton.click();
    });

    await waitFor(() => expect(stopButton).not.toBeDisabled());

    const cycleIndicator = await screen.findByTestId('scan-cycle');
    await waitFor(() =>
      expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*1/i),
    );

    const list = screen.getByRole('list', { name: /simulated access points/i });

    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(290);
    });
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(20);
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('respects updated refresh interval values for subsequent scans', async () => {
    render(<APList />);

    const startButton = await screen.findByRole('button', { name: /start scan/i });

    await waitFor(() => expect(startButton).not.toBeDisabled());

    const stopButton = screen.getByRole('button', { name: /stop scan/i });

    await act(async () => {
      startButton.click();
    });

    await waitFor(() => expect(stopButton).not.toBeDisabled());

    const cycleIndicator = await screen.findByTestId('scan-cycle');
    await waitFor(() =>
      expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*1/i),
    );

    const intervalInput = screen.getByLabelText(/refresh interval/i) as HTMLInputElement;

    fireEvent.change(intervalInput, { target: { value: '2' } });

    await waitFor(() =>
      expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*2/i),
    );

    await act(async () => {
      jest.advanceTimersByTime(1990);
    });

    expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*2/i);

    await act(async () => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() =>
      expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*3/i),
    );

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() =>
      expect(cycleIndicator).toHaveTextContent(/Scan cycle:\s*4/i),
    );
  });
});
