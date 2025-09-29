import React from 'react';
import { act, render, screen } from '@testing-library/react';
import KismetApp from '../components/apps/kismet.jsx';

describe('KismetApp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders file input', () => {
    render(<KismetApp />);
    expect(screen.getByLabelText(/pcap file/i)).toBeInTheDocument();
  });

  it('refreshes channel meter twice per second with scan data', () => {
    const scan = [
      { ssid: 'A', bssid: '00:00:00:00:00:01', channel: 1, signal: -45 },
      { ssid: 'B', bssid: '00:00:00:00:00:02', channel: 6, signal: -60 },
    ];

    render(<KismetApp initialChannelScan={scan} />);

    expect(screen.getByTestId('channel-meter-empty')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('channel-meter-1')).toHaveTextContent('1 sightings');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('channel-meter-6')).toHaveTextContent('1 sightings');
  });

  it('highlights congested channels that exceed thresholds', () => {
    const congestedScan = [
      { ssid: 'A', bssid: '00:00:00:00:00:01', channel: 1, signal: -40 },
      { ssid: 'B', bssid: '00:00:00:00:00:02', channel: 1, signal: -42 },
      { ssid: 'C', bssid: '00:00:00:00:00:03', channel: 1, signal: -41 },
      { ssid: 'D', bssid: '00:00:00:00:00:04', channel: 1, signal: -39 },
      { ssid: 'E', bssid: '00:00:00:00:00:05', channel: 6, signal: -70 },
    ];

    render(<KismetApp initialChannelScan={congestedScan} />);

    act(() => {
      jest.advanceTimersByTime(500 * congestedScan.length);
    });

    expect(screen.getByTestId('channel-meter-1')).toHaveAttribute(
      'data-congestion-level',
      'severe',
    );
    expect(screen.getByTestId('channel-meter-6')).toHaveAttribute(
      'data-congestion-level',
      'clear',
    );
  });
});
