import { fireEvent, render, screen } from '@testing-library/react';
import SpaceInvaders from '../components/apps/space-invaders';

describe('SpaceInvaders component', () => {
  beforeEach(() => {
    (global as any).requestAnimationFrame = jest.fn(() => 1);
    (global as any).cancelAnimationFrame = jest.fn();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      strokeRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      setTransform: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      fillText: jest.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      imageSmoothingEnabled: false,
    } as unknown as CanvasRenderingContext2D));
  });

  test('start overlay launches play and supports pause toggle', () => {
    const { container } = render(<SpaceInvaders />);
    expect(screen.getByText('Space Invaders')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const root = container.querySelector('[tabindex="0"]');
    expect(root).toBeTruthy();
    if (!root) return;

    fireEvent.keyDown(root, { code: 'KeyP' });
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  test('settings toggles are rendered', () => {
    render(<SpaceInvaders />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText('Allow multi-shot')).toBeInTheDocument();
    expect(screen.getByText('Sound')).toBeInTheDocument();
    expect(screen.getByText('Debug overlay')).toBeInTheDocument();
  });
});
