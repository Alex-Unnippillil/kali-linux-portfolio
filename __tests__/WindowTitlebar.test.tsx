import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';

import WindowTitlebar from '../components/desktop/WindowTitlebar';

jest.mock('../components/apps/Games/common/haptics', () => ({
  vibrate: jest.fn(),
}));

describe('WindowTitlebar long-press drag gating', () => {
  const { vibrate } = jest.requireMock('../components/apps/Games/common/haptics') as {
    vibrate: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches a synthetic mousedown and triggers haptics after the hold delay', () => {
    const { getByRole } = render(
      <WindowTitlebar title="Terminal" grabbed={false} onKeyDown={() => {}} onBlur={() => {}} />,
    );

    const titlebar = getByRole('button', { name: 'Terminal' }) as HTMLDivElement;
    const dispatchSpy = jest.spyOn(titlebar, 'dispatchEvent');

    fireEvent.pointerDown(titlebar, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 20,
      clientY: 30,
      screenX: 40,
      screenY: 50,
      pageX: 20,
      pageY: 30,
      button: 0,
    });

    act(() => {
      jest.advanceTimersByTime(449);
    });
    const initialMouseDispatches = dispatchSpy.mock.calls.filter(
      ([event]) => event.type === 'mousedown'
    );
    expect(initialMouseDispatches).toHaveLength(0);
    expect(vibrate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    const dispatchedTypes = dispatchSpy.mock.calls.map(([event]) => event.type);
    expect(dispatchedTypes).toContain('mousedown');
    expect(vibrate).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(titlebar, { pointerId: 1 });
    dispatchSpy.mockRestore();
  });

  it('cancels the drag preparation when released before the delay', () => {
    const { getByRole } = render(<WindowTitlebar title="Docs" grabbed={false} />);
    const titlebar = getByRole('button', { name: 'Docs' }) as HTMLDivElement;
    const dispatchSpy = jest.spyOn(titlebar, 'dispatchEvent');

    fireEvent.pointerDown(titlebar, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 10,
      clientY: 15,
      screenX: 25,
      screenY: 35,
      pageX: 10,
      pageY: 15,
      button: 0,
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    fireEvent.pointerUp(titlebar, { pointerId: 2 });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const dispatchedTypes = dispatchSpy.mock.calls.map(([event]) => event.type);
    expect(dispatchedTypes).not.toContain('mousedown');
    expect(vibrate).not.toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });
});
