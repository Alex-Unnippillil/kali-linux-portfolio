import React from 'react';
import { render, act } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

describe('Window event listeners', () => {
  it('detaches global and node listeners on unmount', () => {
    const winAddSpy = jest.spyOn(window, 'addEventListener');
    const winRemoveSpy = jest.spyOn(window, 'removeEventListener');
    let nodeRemoveSpy: jest.SpyInstance | null = null;
    let superArrowHandler: ((event: Event) => void) | undefined;

    try {
      const windowRef = React.createRef<Window>();
      const { unmount } = render(
        <Window
          id="listener-window"
          title="Test"
          screen={() => <div>content</div>}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={() => {}}
          openApp={() => {}}
          ref={windowRef}
        />
      );

      const resizeHandler = winAddSpy.mock.calls.find(([type]) => type === 'resize')?.[1];
      const contextOpenHandler = winAddSpy.mock.calls.find(([type]) => type === 'context-menu-open')?.[1];
      const contextCloseHandler = winAddSpy.mock.calls.find(([type]) => type === 'context-menu-close')?.[1];

      expect(resizeHandler).toBeDefined();
      expect(contextOpenHandler).toBeDefined();
      expect(contextCloseHandler).toBeDefined();

      const node = document.getElementById('listener-window');
      expect(node).not.toBeNull();
      nodeRemoveSpy = node ? jest.spyOn(node, 'removeEventListener') : null;
      superArrowHandler = windowRef.current?.handleSuperArrow;
      expect(superArrowHandler).toBeDefined();

      unmount();

      expect(winRemoveSpy.mock.calls).toContainEqual(['resize', resizeHandler]);
      expect(winRemoveSpy.mock.calls).toContainEqual(['context-menu-open', contextOpenHandler]);
      expect(winRemoveSpy.mock.calls).toContainEqual(['context-menu-close', contextCloseHandler]);
      expect(nodeRemoveSpy?.mock.calls).toContainEqual(['super-arrow', superArrowHandler]);
    } finally {
      winAddSpy.mockRestore();
      winRemoveSpy.mockRestore();
      nodeRemoveSpy?.mockRestore();
    }
  });

  it('responds to minimize and restore commands dispatched via super-arrow events', () => {
    const windowRef = React.createRef<Window>();
    const { unmount } = render(
      <Window
        id="command-window"
        title="Cmd"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={windowRef}
      />
    );

    const node = document.getElementById('command-window');
    expect(node).not.toBeNull();

    const minimizeSpy = jest.spyOn(windowRef.current!, 'minimizeWindow');
    const restoreSpy = jest.spyOn(windowRef.current!, 'restoreWindow');

    act(() => {
      node?.dispatchEvent(new CustomEvent('super-arrow', { detail: 'minimizeWindow' }));
    });
    expect(minimizeSpy).toHaveBeenCalled();

    act(() => {
      node?.dispatchEvent(new CustomEvent('super-arrow', { detail: 'restoreWindow' }));
    });
    expect(restoreSpy).toHaveBeenCalled();

    minimizeSpy.mockRestore();
    restoreSpy.mockRestore();
    unmount();
  });
});
