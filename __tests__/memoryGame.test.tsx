import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import Memory from '../components/apps/memory';

jest.mock('../components/apps/memory_utils', () => {
  const buildDeck = (size = 4) => {
    const total = size * size;
    const pairs = total / 2;
    const deck: Array<{ id: number; value: string }> = [];
    for (let i = 0; i < pairs; i++) {
      const value = String.fromCharCode(65 + i);
      deck.push({ id: deck.length, value });
      deck.push({ id: deck.length, value });
    }
    return deck;
  };
  return {
    createDeck: jest.fn((size = 4) => buildDeck(size)),
    PATTERN_THEMES: { vibrant: [], pastel: [] },
    fisherYatesShuffle: (cards: Array<{ id: number; value: string }>) => cards,
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  // minimal matchMedia polyfill
  window.matchMedia = window.matchMedia || ((query: string) => ({
    matches: false,
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  // requestAnimationFrame using timers
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number;
  };
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: [] })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

test('combo meter increments and resets', () => {
  const { getAllByTestId, getByTestId } = render(<Memory />);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  const cards = getAllByTestId('card-inner').map((el) => el.parentElement as HTMLElement);
  const combo = getByTestId('combo-meter');

  expect(combo.textContent).toContain('0');

  fireEvent.click(cards[0]);
  fireEvent.click(cards[1]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('1');

  fireEvent.click(cards[2]);
  fireEvent.click(cards[3]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('2');

  fireEvent.click(cards[4]);
  fireEvent.click(cards[6]);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(combo.textContent).toContain('0');
});

test('card flip applies transform style', () => {
  const { getAllByTestId } = render(<Memory />);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  const inner = getAllByTestId('card-inner')[0] as HTMLElement;
  const card = inner.parentElement as HTMLElement;
  expect(inner.style.transform).toBe('rotateY(0deg)');
  fireEvent.click(card);
  expect(inner.style.transform).toBe('rotateY(180deg)');
});

test('records best score for completed round', () => {
  const { getByLabelText, getAllByTestId, getByText } = render(<Memory />);

  act(() => {
    jest.runOnlyPendingTimers();
  });

  fireEvent.change(getByLabelText('Grid size'), { target: { value: '2' } });
  fireEvent.change(getByLabelText(/Preview/), { target: { value: '0' } });

  act(() => {
    jest.runOnlyPendingTimers();
  });

  const cards = getAllByTestId('card-inner').map((el) => el.parentElement as HTMLElement);

  for (let i = 0; i < cards.length; i += 2) {
    fireEvent.click(cards[i]);
    fireEvent.click(cards[i + 1]);
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }

  expect(getByText(/Best:/)).toBeInTheDocument();
  const stored = JSON.parse(localStorage.getItem('game:memory:highscores') ?? '{}');
  const entries = Object.values(stored) as Array<{ moves: number; time: number }>;
  expect(entries.length).toBeGreaterThan(0);
  expect(entries[0].moves).toBeGreaterThan(0);
});

