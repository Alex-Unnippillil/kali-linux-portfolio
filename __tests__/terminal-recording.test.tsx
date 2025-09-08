import React, { act, createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
import Terminal from '../apps/terminal/components/Terminal';
import ReplayPlayer from '../components/terminal/ReplayPlayer';

describe('terminal recording', () => {
  it('captures input and output', () => {
    const ref = createRef<any>();
    render(<Terminal ref={ref} />);
    act(() => ref.current.startRecording());
    act(() => {
      ref.current.recordInput('hello');
      ref.current.recordOutput('world');
    });
    const events = ref.current.getRecording();
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'input', data: 'hello' });
    expect(events[1]).toMatchObject({ type: 'output', data: 'world' });
  });

  it('replays a session', () => {
    jest.useFakeTimers();
    const events = [
      { type: 'output', data: 'welcome', timestamp: 0 },
      { type: 'input', data: 'ls', timestamp: 1000 },
      { type: 'output', data: 'file', timestamp: 1500 },
    ];
    const { getByTestId } = render(<ReplayPlayer events={events} />);
    fireEvent.click(getByTestId('play'));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(getByTestId('replay-output').textContent).toBe('welcome');
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByTestId('replay-output').textContent).toContain('> ls');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByTestId('replay-output').textContent).toContain('file');
    jest.useRealTimers();
  });
});

