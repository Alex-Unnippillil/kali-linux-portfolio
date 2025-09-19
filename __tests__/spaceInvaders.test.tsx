import { render } from '@testing-library/react';
import SpaceInvaders from '@/components/apps/space-invaders';

jest.mock('../hooks/useAssetLoader', () => jest.fn(() => ({ loading: false, error: null })));

describe('SpaceInvaders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global as any).requestAnimationFrame = jest.fn();
    (global as any).cancelAnimationFrame = jest.fn();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
    }));
  });
  afterEach(() => {
    jest.clearAllTimers();
  });
  test('renders game canvas and score info', () => {
    const { container, getByText } = render(<SpaceInvaders />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(getByText(/Score: 0/)).toBeInTheDocument();
    expect(getByText(/Lives: 3/)).toBeInTheDocument();
  });
});
