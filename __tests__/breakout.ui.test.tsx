import { render, screen } from '@testing-library/react';
import Breakout from '../components/apps/breakout';

describe('Breakout UI smoke', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 16);
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);

    HTMLCanvasElement.prototype.getContext = () =>
      ({
        fillRect: () => {},
        clearRect: () => {},
        setTransform: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        arc: () => {},
        fill: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        quadraticCurveTo: () => {},
        strokeRect: () => {},
      } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;
  });

  test('mounts without throwing and renders the canvas', () => {
    const { unmount } = render(<Breakout />);
    expect(screen.getByLabelText('Breakout game canvas')).toBeInTheDocument();
    unmount();
  });
});
