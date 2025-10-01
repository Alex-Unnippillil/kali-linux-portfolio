import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Heatmap, {
  computeBrushSelection,
  createColorScale,
  meetsPerformanceBudget,
} from '../components/apps/nmap-nse/Heatmap';

describe('Heatmap color scale', () => {
  it('interpolates between color stops', () => {
    const scale = createColorScale([
      { value: 0, color: '#000000' },
      { value: 1, color: '#ffffff' },
    ]);
    expect(scale(0.5)).toBe('rgba(128, 128, 128, 1)');
  });
});

describe('Heatmap interactions', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalGetBoundingClientRect =
    HTMLCanvasElement.prototype.getBoundingClientRect;
  const originalSetPointerCapture =
    HTMLCanvasElement.prototype.setPointerCapture;
  const originalReleasePointerCapture =
    HTMLCanvasElement.prototype.releasePointerCapture;
  let setPointerCaptureMock: jest.Mock;
  let releasePointerCaptureMock: jest.Mock;
  let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;
  let cancelAnimationFrameSpy: jest.SpyInstance<void, [number]>;

  beforeEach(() => {
    // JSDOM lacks a native PointerEvent implementation; stub using MouseEvent.
    if (!('PointerEvent' in window)) {
      // @ts-expect-error
      window.PointerEvent = window.MouseEvent;
    }
    requestAnimationFrameSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        return window.setTimeout(() => callback(16), 0) as unknown as number;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle: number) => {
        clearTimeout(handle);
      });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: (type: string) => {
        if (type === '2d') {
          return {
            clearRect: jest.fn(),
            globalCompositeOperation: 'source-over',
            createRadialGradient: () => ({
              addColorStop: jest.fn(),
            }),
            fillRect: jest.fn(),
            fillStyle: '',
            drawImage: jest.fn(),
            canvas: { width: 200, height: 200 },
          } as unknown as CanvasRenderingContext2D;
        }
        return null;
      },
    });

    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getBoundingClientRect',
      {
        configurable: true,
        value: () => ({ left: 0, top: 0, width: 200, height: 200 }),
      }
    );

    setPointerCaptureMock = jest.fn();
    releasePointerCaptureMock = jest.fn();
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: setPointerCaptureMock,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
    });
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: originalGetContext,
    });
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'getBoundingClientRect',
      {
        configurable: true,
        value: originalGetBoundingClientRect,
      }
    );
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: originalSetPointerCapture,
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: originalReleasePointerCapture,
    });
  });

  it('creates a brush overlay in response to pointer gestures', async () => {
    const onBrushSelection = jest.fn();
    render(
      <Heatmap
        data={[
          { x: 0.05, y: 0.05, value: 0.9, radius: 24, label: '192.0.2.10:80' },
          { x: 0.9, y: 0.9, value: 0.2, radius: 24, label: '192.0.2.20:21' },
        ]}
        width={200}
        height={200}
        onBrushSelection={onBrushSelection}
      />
    );

    const canvas = screen.getByRole('img', {
      name: /heatmap of script execution intensity/i,
    });

    fireEvent.pointerDown(canvas, {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
      shiftKey: true,
    });
    fireEvent.pointerMove(canvas, {
      clientX: 140,
      clientY: 140,
      pointerId: 1,
      shiftKey: true,
    });
    await waitFor(() => {
      const overlay = document.querySelector(
        'div[style*="rgba(56, 189, 248, 0.15)"]'
      ) as HTMLDivElement | null;
      expect(overlay).not.toBeNull();
      expect(overlay?.style.width).toBe('130px');
      expect(overlay?.style.height).toBe('130px');
    });
    fireEvent.pointerUp(canvas, {
      clientX: 140,
      clientY: 140,
      pointerId: 1,
      shiftKey: true,
    });

    await waitFor(() => {
      expect(setPointerCaptureMock).toHaveBeenCalled();
      expect(releasePointerCaptureMock).toHaveBeenCalled();
      expect(onBrushSelection).toHaveBeenCalled();
      const overlay = document.querySelector(
        'div[style*="rgba(56, 189, 248, 0.15)"]'
      );
      expect(overlay).toBeNull();
    });
  });
});

describe('Heatmap utilities', () => {
  it('computes brush selection using helper', () => {
    const selection = computeBrushSelection(
      [
        { x: 0.1, y: 0.1, value: 0.6 },
        { x: 0.9, y: 0.9, value: 0.2 },
      ],
      { startX: 0, startY: 0, endX: 80, endY: 80 },
      { scale: 1, offsetX: 0, offsetY: 0 },
      { width: 200, height: 200 }
    );
    expect(selection).toHaveLength(1);
  });

  it('validates performance budget helper', () => {
    const durationsMeetingBudget = [15, 18, 20, 16, 19];
    const durationsMissingBudget = [40, 35, 38, 36, 37];
    expect(meetsPerformanceBudget(durationsMeetingBudget, 50)).toBe(true);
    expect(meetsPerformanceBudget(durationsMissingBudget, 50)).toBe(false);
  });
});
