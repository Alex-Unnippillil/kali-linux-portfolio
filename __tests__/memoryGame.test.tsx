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

test('ignores clicks while resolving a mismatch', () => {
  const { getAllByTestId } = render(<Memory />);
  act(() => {
    jest.runOnlyPendingTimers();
  });
  const inners = getAllByTestId('card-inner');
  const cards = inners.map((el) => el.parentElement as HTMLElement);

  fireEvent.click(cards[0]);
  fireEvent.click(cards[2]);
  fireEvent.click(cards[4]);

  const third = inners[4] as HTMLElement;
  expect(third.style.transform).toBe('rotateY(0deg)');

  act(() => {
    jest.advanceTimersByTime(800);
  });

  expect(third.style.transform).toBe('rotateY(0deg)');
});
