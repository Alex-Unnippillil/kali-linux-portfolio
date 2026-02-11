import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Frogger from '../components/apps/frogger';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(), fillRect: jest.fn(), beginPath: jest.fn(), arc: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), fillText: jest.fn(), strokeRect: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    save: jest.fn(), restore: jest.fn(), translate: jest.fn(), rotate: jest.fn(),
  })) as any;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
});

afterAll(() => {
  (window.requestAnimationFrame as jest.Mock).mockRestore();
  (window.cancelAnimationFrame as jest.Mock).mockRestore();
});

describe('frogger UI', () => {
  test('start prompt appears and game begins after input', () => {
    render(<Frogger windowMeta={{ isFocused: true }} />);
    expect(screen.getByText(/classic arcade mode/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getAllByText(/score: 10/i).length).toBeGreaterThan(0);
  });

  test('pause toggles and restart resets', () => {
    render(<Frogger windowMeta={{ isFocused: true }} />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'p' });
    expect(screen.getByText(/paused —/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByText(/classic arcade mode/i)).toBeInTheDocument();
  });

  test('settings render with validated defaults', () => {
    render(<Frogger windowMeta={{ isFocused: true }} />);
    expect(screen.getByText(/frogger — classic arcade/i)).toBeInTheDocument();
    expect(screen.getByText(/homes: 0\/5/i)).toBeInTheDocument();
  });
});
