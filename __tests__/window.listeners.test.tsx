import React from 'react';
import { render } from '@testing-library/react';
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
});

describe('Window touch drag gating', () => {
  const createWindow = () => {
    const windowRef = React.createRef<Window>();
    const utils = render(
      <Window
        id="touch-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={windowRef}
      />
    );
    return { windowRef, ...utils };
  };

  const createDragData = () => ({
    node: { style: { transform: '' } },
    x: 0,
    y: 0,
    deltaX: 0,
    deltaY: 0,
    lastX: 0,
    lastY: 0,
  });

  it('prevents quick touch drags before the hold threshold', () => {
    const { windowRef, unmount } = createWindow();
    try {
      const instance = windowRef.current!;
      const dragData = createDragData();
      instance.handleTitleBarPointerDown({ pointerType: 'touch', clientX: 10, clientY: 10 } as any);
      instance.handleDragStart({ type: 'touchstart', touches: [{ clientX: 10, clientY: 10 }] } as any, dragData as any);

      const result = instance.handleDrag(
        { type: 'touchmove', touches: [{ clientX: 12, clientY: 12 }] } as any,
        dragData as any
      );

      expect(result).toBe(false);
      expect(instance.state.grabbed).toBe(false);
    } finally {
      unmount();
    }
  });

  it('requires movement in addition to the long-press delay', () => {
    const { windowRef, unmount } = createWindow();
    try {
      const instance = windowRef.current!;
      const dragData = createDragData();
      instance.handleTitleBarPointerDown({ pointerType: 'touch', clientX: 30, clientY: 40 } as any);
      instance.handleDragStart({ type: 'touchstart', touches: [{ clientX: 30, clientY: 40 }] } as any, dragData as any);

      const info = (instance as any)._dragPointerInfo;
      info.startTime -= 400;

      const result = instance.handleDrag(
        { type: 'touchmove', touches: [{ clientX: 32, clientY: 41 }] } as any,
        dragData as any
      );

      expect(result).toBe(false);
      expect(instance.state.grabbed).toBe(false);
    } finally {
      unmount();
    }
  });

  it('allows dragging once the touch gesture is intentional', () => {
    const { windowRef, unmount } = createWindow();
    try {
      const instance = windowRef.current!;
      const dragData = createDragData();
      instance.handleTitleBarPointerDown({ pointerType: 'touch', clientX: 50, clientY: 60 } as any);
      instance.handleDragStart({ type: 'touchstart', touches: [{ clientX: 50, clientY: 60 }] } as any, dragData as any);

      const info = (instance as any)._dragPointerInfo;
      info.startTime -= 400;

      const result = instance.handleDrag(
        { type: 'touchmove', touches: [{ clientX: 70, clientY: 85 }] } as any,
        dragData as any
      );

      expect(result).not.toBe(false);
      expect(instance.state.grabbed).toBe(true);
    } finally {
      unmount();
    }
  });
});
