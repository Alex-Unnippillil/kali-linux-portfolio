import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import Minesweeper from '../components/apps/minesweeper';

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  window.requestAnimationFrame = jest.fn(() => 0);
  window.cancelAnimationFrame = jest.fn();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
  } as unknown as CanvasRenderingContext2D));
});

afterEach(() => {
  jest.clearAllMocks();
});

test('allows selecting difficulty preset', async () => {
  const { getByText, getByLabelText, getByRole, container } = render(
    <Minesweeper />,
  );

  fireEvent.click(getByText('Settings'));
  fireEvent.click(getByLabelText('Intermediate (16x16, 40 mines)'));
  fireEvent.click(getByRole('button', { name: 'Apply' }));

  await waitFor(() => {
    expect(getByText(/Mines:/).textContent).toContain('40');
  });

  const canvas = container.querySelector('canvas');
  expect(canvas?.width).toBe(16 * 32);
});

test('shows validation error for invalid custom configuration', () => {
  const { getByText, getByLabelText, getByRole } = render(<Minesweeper />);

  fireEvent.click(getByText('Settings'));
  fireEvent.click(getByLabelText('Custom'));

  const sizeInput = getByLabelText(/Board size/);
  const minesInput = getByLabelText(/Mines/);

  fireEvent.change(sizeInput, { target: { value: '3' } });
  fireEvent.change(minesInput, { target: { value: '10' } });
  fireEvent.click(getByRole('button', { name: 'Apply' }));

  expect(getByText(/Board size must be between/)).toBeInTheDocument();
  expect(getByText(/Mines:/).textContent).toContain('10');
});
