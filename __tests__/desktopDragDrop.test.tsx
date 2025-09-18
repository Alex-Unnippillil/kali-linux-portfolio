import React from 'react';
import { render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const createMatchMedia = () =>
  jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: createMatchMedia(),
  });
}

describe('Desktop drag and drop actions', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--motion-fast', '150ms');
  });

  const mountlessDesktop = () => {
    const desktop = new Desktop({});
    desktop.setState = (updater) => {
      const update =
        typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
      desktop.state = { ...desktop.state, ...update };
    };
    return desktop;
  };

  it('pins app when dropped on taskbar zone', () => {
    const desktop = mountlessDesktop();
    const pinSpy = jest.spyOn(desktop, 'pinApp').mockImplementation(() => {});

    const result = desktop.performDropAction(
      {
        zone: { id: 'taskbar', label: 'Pin to taskbar', effect: 'copy', accepts: ['app-shortcut'] },
        element: document.createElement('div'),
        data: {},
      } as any,
      { id: 'terminal', type: 'app-shortcut' } as any,
    );

    expect(result).toBe(true);
    expect(pinSpy).toHaveBeenCalledWith('terminal');
  });

  it('opens app and focuses window when dropped on window zone', () => {
    const desktop = mountlessDesktop();
    const openSpy = jest.spyOn(desktop, 'openApp').mockImplementation(() => {});
    const focusSpy = jest.spyOn(desktop, 'focus').mockImplementation(() => {});

    const result = desktop.performDropAction(
      {
        zone: { id: 'window', label: 'Open with', effect: 'link', accepts: ['app-shortcut'] },
        element: document.createElement('div'),
        data: { targetId: 'about-alex' },
      } as any,
      { id: 'calculator', type: 'app-shortcut' } as any,
    );

    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalledWith('calculator');
    expect(focusSpy).toHaveBeenCalledWith('about-alex');
  });

  it('returns false for unknown drop zone', () => {
    const desktop = mountlessDesktop();
    const result = desktop.performDropAction(
      {
        zone: { id: 'unknown', label: 'Unknown', effect: 'none', accepts: [] },
        element: document.createElement('div'),
      } as any,
      { id: 'terminal', type: 'app-shortcut' } as any,
    );

    expect(result).toBe(false);
  });

  it('restores focus and clears drag state after invalid drop', () => {
    jest.useFakeTimers();
    const desktop = mountlessDesktop();
    const source = document.createElement('button');
    const focusSpy = jest.fn();
    (source as any).focus = focusSpy;
    (window.matchMedia as any) = createMatchMedia();

    desktop.state.dragItem = { id: 'terminal', type: 'app-shortcut' } as any;
    desktop._dragSource = source as any;
    desktop.state.invalidDrop = false;

    desktop.triggerInvalidDrop();

    expect(focusSpy).toHaveBeenCalled();
    expect(desktop.state.invalidDrop).toBe(true);

    jest.advanceTimersByTime(200);
    expect(desktop.state.dragItem).toBeNull();
    jest.useRealTimers();
  });

  it('renders overlay labels', () => {
    const desktop = mountlessDesktop();
    desktop.state.dragItem = { id: 'terminal', type: 'app-shortcut' } as any;
    desktop.state.dropVisuals = [
      {
        key: 'desktop:main',
        zoneId: 'desktop',
        label: 'Move',
        effect: 'move',
        rect: { left: 5, top: 10, width: 100, height: 60 },
      },
    ];

    const { getByText, getByTestId } = render(<>{desktop.renderDropOverlays()}</>);
    expect(getByText('Move')).toBeInTheDocument();
    expect(getByTestId('drop-overlay-layer')).toHaveClass('drop-overlay-layer');
  });
});
