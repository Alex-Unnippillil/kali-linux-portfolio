import React, { useEffect, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  CoachMarkBeacon,
  CoachMarksProvider,
  CoachMarkWhatsThis,
  useCoachMarks,
} from '../components/common/CoachMarks';

describe('CoachMarks', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  const TestHarness: React.FC<{ markId?: string }> = ({ markId = 'demo' }) => {
    const targetRef = useRef<HTMLDivElement>(null);
    const { registerMark, unregisterMark } = useCoachMarks();

    useEffect(() => {
      registerMark({
        id: markId,
        title: 'Demo mark',
        description: 'Helpful guidance for the UI target.',
        target: targetRef,
      });
      return () => unregisterMark(markId);
    }, [markId, registerMark, unregisterMark]);

    return (
      <div>
        <div data-testid="coachmark-target" ref={targetRef}>
          Target element
        </div>
        <CoachMarkBeacon id={markId} label="Open coach mark" />
        <CoachMarkWhatsThis id={markId} />
      </div>
    );
  };

  const renderHarness = () =>
    render(
      <CoachMarksProvider>
        <TestHarness />
      </CoachMarksProvider>
    );

  it('shows beacon until mark is dismissed', () => {
    renderHarness();

    const beacon = screen.getByLabelText('Open coach mark');
    expect(beacon).toBeInTheDocument();

    fireEvent.click(beacon);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open coach mark')).not.toBeInTheDocument();
  });

  it('persists dismissals for 30 days', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const first = renderHarness();
    fireEvent.click(screen.getByLabelText('Open coach mark'));
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    first.unmount();

    const second = renderHarness();
    expect(screen.queryByLabelText('Open coach mark')).not.toBeInTheDocument();
    second.unmount();

    jest.setSystemTime(new Date('2024-02-15T00:00:00Z'));
    const third = renderHarness();
    expect(screen.getByLabelText('Open coach mark')).toBeInTheDocument();
    third.unmount();

    jest.useRealTimers();
  });

  it('closes overlays with keyboard interaction', () => {
    renderHarness();
    fireEvent.click(screen.getByLabelText('Open coach mark'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
