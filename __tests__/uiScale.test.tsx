import { act, render } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import useCanvasResize from '../hooks/useCanvasResize';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('UI scale settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.setProperty('--ui-scale', '1');
  });

  test('persists scale changes and updates css variables', () => {
    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });
    act(() => result.current.setUiScale(1.5));
    expect(document.documentElement.style.getPropertyValue('--ui-scale')).toBe('1.5');
    expect(window.localStorage.getItem('ui-scale')).toBe('1.5');
  });

  test('notifies canvas hooks to avoid clipping', () => {
    const originalResizeObserver = (window as any).ResizeObserver;
    const observe = jest.fn();
    const disconnect = jest.fn();
    class ResizeObserverMock {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    (window as any).ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

    const setTransform = jest.fn();
    const getContextSpy = jest
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() =>
        ({
          setTransform,
          clearRect: jest.fn(),
          fillRect: jest.fn(),
          beginPath: jest.fn(),
        } as unknown as CanvasRenderingContext2D),
      );

    const CanvasHarness = ({ width, height }: { width: number; height: number }) => {
      const canvasRef = useCanvasResize(100, 100);
      const containerRef = useRef<HTMLDivElement | null>(null);

      useLayoutEffect(() => {
        if (!containerRef.current) return;
        Object.defineProperty(containerRef.current, 'clientWidth', {
          configurable: true,
          get: () => width,
        });
        Object.defineProperty(containerRef.current, 'clientHeight', {
          configurable: true,
          get: () => height,
        });
      }, [width, height]);

      return (
        <div ref={containerRef}>
          <canvas ref={canvasRef} />
        </div>
      );
    };

    let updateScale: ((value: number) => void) | null = null;
    const Controller = () => {
      const { setUiScale } = useSettings();
      useEffect(() => {
        updateScale = setUiScale;
      }, [setUiScale]);
      return null;
    };

    render(
      <SettingsProvider>
        <Controller />
        <CanvasHarness width={200} height={200} />
      </SettingsProvider>,
    );

    expect(setTransform).toHaveBeenCalled();
    setTransform.mockClear();

    act(() => {
      updateScale?.(1.6);
    });

    expect(setTransform).toHaveBeenCalled();

    getContextSpy.mockRestore();
    (window as any).ResizeObserver = originalResizeObserver;
  });
});
