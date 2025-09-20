import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Minesweeper, {
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  validateConfig,
} from '../../../apps/minesweeper';

jest.mock('../../../utils/dailySeed', () => ({
  getDailySeed: jest.fn(() => Promise.resolve('mock-seed')),
}));

jest.mock('../../../components/apps/GameLayout', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      React.createElement(React.Fragment, null, children)
    ),
  };
});

describe('Minesweeper configuration presets', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
    }));
    (global as any).requestAnimationFrame = jest.fn(() => 0);
    (global as any).cancelAnimationFrame = jest.fn();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('accepts preset values as valid configurations', () => {
    const result = validateConfig(8, 10);
    expect(result).toEqual(
      expect.objectContaining({ valid: true, size: 8, mines: 10 }),
    );
  });

  it('rejects board sizes outside the supported range', () => {
    const tooSmall = validateConfig(MIN_BOARD_SIZE - 1, 1);
    expect(tooSmall.valid).toBe(false);
    expect(tooSmall.error).toMatch(/between/);

    const tooLarge = validateConfig(MAX_BOARD_SIZE + 1, 10);
    expect(tooLarge.valid).toBe(false);
    expect(tooLarge.error).toMatch(/between/);
  });

  it('rejects non-numeric mine counts and values above the limit', () => {
    const notNumber = validateConfig(8, Number.NaN);
    expect(notNumber.valid).toBe(false);
    expect(notNumber.error).toMatch(/number/);

    const maxMines = 8 * 8 - 1;
    const tooMany = validateConfig(8, maxMines + 5);
    expect(tooMany.valid).toBe(false);
    expect(tooMany.error).toContain(`${maxMines}`);
  });

  it('surfaces an error when applying an invalid custom configuration', async () => {
    render(<Minesweeper />);

    const sizeInput = screen.getByLabelText(/Size/i);
    const minesInput = screen.getByLabelText(/^Mines$/i);
    fireEvent.change(sizeInput, { target: { value: String(MIN_BOARD_SIZE - 1) } });
    fireEvent.change(minesInput, { target: { value: '1' } });
    const form = sizeInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    const error = await screen.findByText(/Board size must be between/i);
    expect(error).toBeInTheDocument();
    const summary = screen.getByText(/Current board:/i);
    expect(summary.textContent).toContain('8×8');
    expect(summary.textContent).toContain('10 mines');
  });

  it('applies a valid custom configuration and clears previous errors', async () => {
    render(<Minesweeper />);

    const sizeInput = screen.getByLabelText(/Size/i);
    const minesInput = screen.getByLabelText(/^Mines$/i);
    fireEvent.change(sizeInput, { target: { value: '12' } });
    fireEvent.change(minesInput, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Start Custom Game/i }));

    await waitFor(() => {
      const summary = screen.getByText(/Current board:/i);
      expect(summary.textContent).toContain('12×12');
      expect(summary.textContent).toContain('20 mines');
    });
    expect(
      screen.queryByText(/Board size must be between/i),
    ).not.toBeInTheDocument();
  });

  it('updates the board when selecting a preset button', async () => {
    render(<Minesweeper />);

    fireEvent.click(screen.getByRole('button', { name: /Expert/i }));

    await waitFor(() => {
      const summary = screen.getByText(/Current board:/i);
      expect(summary.textContent).toContain('24×24');
      expect(summary.textContent).toContain('99 mines');
    });
  });
});
