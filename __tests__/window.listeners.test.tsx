import React from 'react';
import { render } from '@testing-library/react';
import Window from '../components/base/window';

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
});
