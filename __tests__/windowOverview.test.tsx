import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import WindowOverview, { OverviewWindowMeta } from '../components/screen/window-overview';

describe('WindowOverview', () => {
  const createWindow = (id: string, rect: Partial<DOMRect>) => {
    const element = document.createElement('div');
    element.id = id;
    element.style.position = 'absolute';
    const domRect: DOMRect = {
      width: rect.width ?? 480,
      height: rect.height ?? 320,
      top: rect.top ?? 0,
      left: rect.left ?? 0,
      bottom: rect.bottom ?? ((rect.top ?? 0) + (rect.height ?? 320)),
      right: rect.right ?? ((rect.left ?? 0) + (rect.width ?? 480)),
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => ({}),
    } as DOMRect;
    element.getBoundingClientRect = () => domRect;
    document.body.appendChild(element);
    return element;
  };

  const baseWindows: OverviewWindowMeta[] = [
    { id: 'win-one', title: 'Window One' },
    { id: 'win-two', title: 'Window Two' },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('applies GPU-friendly transforms when entering overview', async () => {
    const first = createWindow('win-one', { width: 500, height: 360, left: 120, top: 80 });
    const second = createWindow('win-two', { width: 420, height: 320, left: 640, top: 160 });

    render(
      <WindowOverview
        windows={baseWindows}
        initialFocusId="win-one"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(first.style.transform).toMatch(/translate3d/);
    });

    expect(first.style.willChange).toContain('transform');
    expect(first.style.pointerEvents).toBe('none');
    expect(second.style.transform).toMatch(/scale/);
  });

  it('restores original styles after unmount', async () => {
    const element = createWindow('win-one', { width: 480, height: 320, left: 100, top: 120 });
    const { unmount } = render(
      <WindowOverview
        windows={[baseWindows[0]]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(element.style.transform).toMatch(/translate3d/);
    });

    jest.useFakeTimers();
    unmount();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    expect(element.style.transform).toBe('');
    expect(element.style.opacity).toBe('');
    expect(element.style.pointerEvents).toBe('');
  });

  it('shortens transitions when reduced motion is requested', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    const element = createWindow('win-one', { width: 400, height: 280, left: 200, top: 150 });

    render(
      <WindowOverview
        windows={[baseWindows[0]]}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(element.style.transition).toContain('80ms');
    });

    window.matchMedia = originalMatchMedia;
  });

  it('supports keyboard navigation and selection', async () => {
    createWindow('win-one', { width: 420, height: 320, left: 160, top: 120 });
    createWindow('win-two', { width: 380, height: 260, left: 600, top: 180 });

    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <WindowOverview
        windows={baseWindows}
        initialFocusId="win-one"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(document.getElementById('win-one')!.style.transform).toMatch(/translate3d/);
    });

    const secondTile = document.querySelector('[data-testid="overview-tile-win-two"]') as HTMLButtonElement;

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(secondTile).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('win-two');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
