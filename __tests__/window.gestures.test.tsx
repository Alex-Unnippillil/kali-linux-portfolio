import React from 'react';
import { act, render, screen } from '@testing-library/react';
import DesktopWindow from '../components/desktop/Window';

if (typeof window.PointerEvent !== 'function') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, params: any = {}) {
      super(type, params);
      Object.keys(params || {}).forEach((key) => {
        Object.defineProperty(this, key, {
          value: (params as any)[key],
          configurable: true,
          writable: true,
        });
      });
    }
  }
  // @ts-ignore
  window.PointerEvent = PointerEventPolyfill;
  // @ts-ignore
  global.PointerEvent = PointerEventPolyfill;
}

const setMatchMedia = (matches: boolean) => {
  const mock = jest.fn().mockImplementation(() => ({
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: mock,
  });
  return mock;
};

describe('Window gesture interactions', () => {
  const renderWindow = () => {
    return render(
      <DesktopWindow
        id="gesture-window"
        title="Gesture Test"
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        screen={() => <div>content</div>}
      />,
    );
  };

  beforeEach(() => {
    setMatchMedia(false);
    window.innerWidth = 1280;
    window.innerHeight = 800;
    // @ts-ignore - jsdom may not define visualViewport
    delete window.visualViewport;
  });

  it('resizes the window when performing a pinch gesture', () => {
    renderWindow();
    const frame = screen.getByRole('dialog', { name: 'Gesture Test' });
    const rectSpy = jest.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      width: 640,
      height: 480,
      left: 320,
      top: 200,
      right: 960,
      bottom: 680,
      x: 320,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect);
    const initialWidth = parseFloat(frame.style.width);

    act(() => {
      frame.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 320,
        clientY: 320,
        bubbles: true,
      }));
      frame.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 560,
        clientY: 320,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 680,
        clientY: 320,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 240,
        clientY: 320,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 2,
        pointerType: 'touch',
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
        bubbles: true,
      }));
    });

    const resizedWidth = parseFloat(frame.style.width);
    expect(resizedWidth).toBeGreaterThan(initialWidth);
    rectSpy.mockRestore();
  });

  it('disables transition animation during pinch when reduced motion is preferred', () => {
    setMatchMedia(true);
    renderWindow();
    const frame = screen.getByRole('dialog', { name: 'Gesture Test' });

    act(() => {
      frame.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 10,
        pointerType: 'touch',
        clientX: 300,
        clientY: 280,
        bubbles: true,
      }));
      frame.dispatchEvent(new PointerEvent('pointerdown', {
        pointerId: 11,
        pointerType: 'touch',
        clientX: 520,
        clientY: 280,
        bubbles: true,
      }));
    });

    expect(frame.style.transition).toBe('none');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 11,
        pointerType: 'touch',
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent('pointerup', {
        pointerId: 10,
        pointerType: 'touch',
        bubbles: true,
      }));
    });

    expect(frame.style.transition === '' || frame.style.transition === 'none').toBe(true);
  });

  it('toggles maximize on double tap of the title bar', () => {
    const instanceRef = React.createRef<any>();
    const { container } = render(
      <DesktopWindow
        ref={instanceRef}
        id="gesture-window"
        title="Gesture Test"
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        screen={() => <div>content</div>}
      />,
    );
    const frame = screen.getByRole('dialog', { name: 'Gesture Test' });
    const titlebar = container.querySelector('[data-window-titlebar]');
    expect(titlebar).not.toBeNull();
    expect(instanceRef.current).not.toBeNull();
    const instance = instanceRef.current;
    const maximizeSpy = jest.spyOn(instance, 'maximizeWindow');
    jest.useFakeTimers();
    try {
      const createEvent = (pointerId: number, clientX: number, clientY: number) => ({
        pointerId,
        pointerType: 'touch',
        clientX,
        clientY,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      });

      act(() => {
        const firstDown = createEvent(21, 400, 200);
        instance.handleWindowPointerDown(firstDown);
        instance.handleTitleBarPointerDown(firstDown);
        instance.handleTitleBarPointerUp(createEvent(21, 400, 200));
        instance.handleGlobalPointerUp({ pointerId: 21 });
        const secondDown = createEvent(22, 402, 202);
        instance.handleWindowPointerDown(secondDown);
        instance.handleTitleBarPointerDown(secondDown);
        instance.handleTitleBarPointerUp(createEvent(22, 402, 202));
        instance.handleGlobalPointerUp({ pointerId: 22 });
      });

      expect(maximizeSpy).toHaveBeenCalled();
      expect(frame.getAttribute('data-window-state')).toBe('maximized');
    } finally {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
      maximizeSpy.mockRestore();
    }
  });

  it('skips maximize animation when double tap occurs with reduced motion preference', () => {
    setMatchMedia(true);
    const instanceRef = React.createRef<any>();
    const { container } = render(
      <DesktopWindow
        ref={instanceRef}
        id="gesture-window"
        title="Gesture Test"
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        screen={() => <div>content</div>}
      />,
    );
    const titlebar = container.querySelector('[data-window-titlebar]');
    expect(titlebar).not.toBeNull();
    expect(instanceRef.current).not.toBeNull();
    const presetSpy = jest.spyOn(instanceRef.current, 'setTransformMotionPreset');
    jest.useFakeTimers();

    try {
      act(() => {
        titlebar!.dispatchEvent(new PointerEvent('pointerdown', {
          pointerId: 31,
          pointerType: 'touch',
          clientX: 360,
          clientY: 180,
          bubbles: true,
        }));
        titlebar!.dispatchEvent(new PointerEvent('pointerup', {
          pointerId: 31,
          pointerType: 'touch',
          clientX: 360,
          clientY: 180,
          bubbles: true,
        }));
        titlebar!.dispatchEvent(new PointerEvent('pointerdown', {
          pointerId: 32,
          pointerType: 'touch',
          clientX: 362,
          clientY: 182,
          bubbles: true,
        }));
        titlebar!.dispatchEvent(new PointerEvent('pointerup', {
          pointerId: 32,
          pointerType: 'touch',
          clientX: 362,
          clientY: 182,
          bubbles: true,
        }));
      });

      expect(presetSpy).not.toHaveBeenCalled();
    } finally {
      act(() => {
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
      presetSpy.mockRestore();
    }
  });
});
