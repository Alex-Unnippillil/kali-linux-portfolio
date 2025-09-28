import React from 'react';
import { createEvent, fireEvent, render } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';
import { Desktop } from '../components/screen/desktop';

describe('Window switcher keyboard safety', () => {
  const baseWindows = [
    { id: 'terminal', title: 'Terminal', icon: '/icon-a.png' },
    { id: 'browser', title: 'Browser', icon: '/icon-b.png' },
  ];

  it('prevents key events from reaching underlying apps while navigating', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByPlaceholderText } = render(
      <WindowSwitcher windows={baseWindows} onSelect={onSelect} onClose={onClose} />
    );

    const input = getByPlaceholderText(/search windows/i);
    const event = createEvent.keyDown(input, { key: 'ArrowRight' });
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    event.preventDefault = preventDefault;
    event.stopPropagation = stopPropagation;
    fireEvent(input, event);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prevents Alt release from leaking to focused apps', () => {
    const desktop = new Desktop();
    desktop.state.showWindowSwitcher = true;
    desktop.windowSwitcherRef.current = {
      confirmSelection: jest.fn(() => ({ id: 'terminal' })),
    } as any;

    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    desktop.handleGlobalShortcut({
      type: 'keyup',
      key: 'Alt',
      preventDefault,
      stopPropagation,
    } as any);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(desktop.windowSwitcherRef.current?.confirmSelection).toHaveBeenCalled();
  });

  it('opens the switcher without propagating Alt+Tab', () => {
    const desktop = new Desktop();
    const openSpy = jest
      .spyOn(desktop, 'openWindowSwitcher')
      .mockImplementation(() => true);

    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    desktop.handleGlobalShortcut({
      type: 'keydown',
      key: 'Tab',
      altKey: true,
      shiftKey: false,
      preventDefault,
      stopPropagation,
    } as any);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalled();
  });
});
