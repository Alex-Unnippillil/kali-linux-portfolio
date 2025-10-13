import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import WindowManagerProvider from '../components/desktop/WindowManagerProvider';

describe('WindowManagerProvider global shortcuts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const renderProvider = () =>
    render(
      <WindowManagerProvider>
        <div>desktop</div>
      </WindowManagerProvider>,
    );

  it('opens the window switcher overlay when Alt+Tab is pressed', () => {
    const handler = jest.fn();
    window.addEventListener('taskbar-command', handler);

    renderProvider();

    fireEvent.keyDown(window, { altKey: true, key: 'Tab' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent | undefined;
    expect(event?.detail).toEqual({ appId: 'overlay-window-switcher', action: 'open' });

    fireEvent.keyDown(window, { altKey: true, key: 'Tab' });
    expect(handler).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { altKey: true, key: 'Tab', repeat: true });
    expect(handler).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: 'Alt' });

    window.removeEventListener('taskbar-command', handler);
  });

  it('toggles the launcher overlay when Ctrl+Escape is pressed', () => {
    const handler = jest.fn();
    window.addEventListener('taskbar-command', handler);

    renderProvider();

    fireEvent.keyDown(window, { ctrlKey: true, key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent | undefined;
    expect(event?.detail).toEqual({ appId: 'overlay-launcher', action: 'toggle' });

    fireEvent.keyDown(window, { ctrlKey: true, key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: 'Control' });

    window.removeEventListener('taskbar-command', handler);
  });

  it('closes the launcher overlay with Escape when active', () => {
    const handler = jest.fn();
    window.addEventListener('taskbar-command', handler);

    renderProvider();

    const overlay = document.createElement('div');
    overlay.setAttribute('aria-labelledby', 'all-apps-overlay-title');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.appendChild(overlay);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent | undefined;
    expect(event?.detail).toEqual({ appId: 'overlay-launcher', action: 'minimize' });

    fireEvent.keyUp(window, { key: 'Escape' });
    document.body.removeChild(overlay);
    window.removeEventListener('taskbar-command', handler);
  });

  it('does not dispatch escape commands when launcher is hidden', () => {
    const handler = jest.fn();
    window.addEventListener('taskbar-command', handler);

    renderProvider();

    const overlay = document.createElement('div');
    overlay.setAttribute('aria-labelledby', 'all-apps-overlay-title');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handler).not.toHaveBeenCalled();

    fireEvent.keyUp(window, { key: 'Escape' });
    document.body.removeChild(overlay);
    window.removeEventListener('taskbar-command', handler);
  });

  it('cleans up listeners on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderProvider();

    const keydownCall = addSpy.mock.calls.find(([event]) => event === 'keydown');
    const keyupCall = addSpy.mock.calls.find(([event]) => event === 'keyup');
    expect(keydownCall?.[0]).toBe('keydown');
    expect(keyupCall?.[0]).toBe('keyup');

    unmount();

    const keydownRemoved = removeSpy.mock.calls.find(([event, handler]) => event === 'keydown' && handler === keydownCall?.[1]);
    const keyupRemoved = removeSpy.mock.calls.find(([event, handler]) => event === 'keyup' && handler === keyupCall?.[1]);
    expect(keydownRemoved).toBeTruthy();
    expect(keyupRemoved).toBeTruthy();

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
