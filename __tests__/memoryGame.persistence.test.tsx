import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import Memory from '../components/apps/memory';

jest.mock('../components/apps/memory_utils', () => {
  const actual = jest.requireActual('../components/apps/memory_utils');
  return {
    ...actual,
    createDeck: () => [
      { id: 0, value: 'A', pairId: 'A' },
      { id: 1, value: 'A', pairId: 'A' },
      { id: 2, value: 'B', pairId: 'B' },
      { id: 3, value: 'B', pairId: 'B' },
      { id: 4, value: 'C', pairId: 'C' },
      { id: 5, value: 'C', pairId: 'C' },
      { id: 6, value: 'D', pairId: 'D' },
      { id: 7, value: 'D', pairId: 'D' },
      { id: 8, value: 'E', pairId: 'E' },
      { id: 9, value: 'E', pairId: 'E' },
      { id: 10, value: 'F', pairId: 'F' },
      { id: 11, value: 'F', pairId: 'F' },
      { id: 12, value: 'G', pairId: 'G' },
      { id: 13, value: 'G', pairId: 'G' },
      { id: 14, value: 'H', pairId: 'H' },
      { id: 15, value: 'H', pairId: 'H' },
    ],
    PATTERN_THEMES: { vibrant: [], pastel: [] },
    generateSeed: () => 'test-seed',
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  window.matchMedia = window.matchMedia || ((query: string) => ({
    matches: false,
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  };
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);
});

afterEach(() => {
  jest.useRealTimers();
});

test('autosaves and restores in-progress memory board state', () => {
  const firstRender = render(<Memory />);

  act(() => {
    jest.runOnlyPendingTimers();
  });

  let cards = firstRender.getAllByTestId('card-inner').map((el) => el.parentElement as HTMLElement);
  fireEvent.click(cards[0]);
  fireEvent.click(cards[1]);

  act(() => {
    jest.advanceTimersByTime(400);
  });

  const pauseButtons = firstRender.getAllByRole('button', { name: 'Pause' });
  fireEvent.click(pauseButtons[pauseButtons.length - 1]);

  act(() => {
    jest.advanceTimersByTime(500);
  });

  expect(window.localStorage.getItem('game:memory:progress:1')).toBeTruthy();

  firstRender.unmount();

  const secondRender = render(<Memory />);

  act(() => {
    jest.runOnlyPendingTimers();
  });

  cards = secondRender.getAllByTestId('card-inner').map((el) => el.parentElement as HTMLElement);
  expect(cards[0].querySelector('[data-testid="card-inner"]')).toHaveStyle('transform: rotateY(180deg)');
  expect(secondRender.getByText('Moves: 1')).toBeInTheDocument();

  secondRender.unmount();
});
