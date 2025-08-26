import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import VolatilityApp, { timelineToCSV, timelineToJSON } from '../components/apps/volatility';

describe('Volatility plugin manager', () => {
  it('toggles plugin enabled state', () => {
    const { getByTestId } = render(<VolatilityApp />);
    const checkbox = getByTestId('plugin-pslist') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

describe('Volatility timeline export', () => {
  const sampleTimeline = [
    { time: '00:00', event: 'start' },
    { time: '00:01', event: 'continue' },
  ];

  it('converts timeline to CSV', () => {
    expect(timelineToCSV(sampleTimeline)).toBe('time,event\n00:00,start\n00:01,continue');
  });

  it('converts timeline to JSON', () => {
    expect(timelineToJSON(sampleTimeline)).toBe(
      JSON.stringify(sampleTimeline, null, 2)
    );
  });
});
