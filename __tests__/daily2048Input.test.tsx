import { fireEvent, render, waitFor } from '@testing-library/react';
import Page2048, { MOVE_COOLDOWN_MS } from '../apps/2048';
import { getDailySeed } from '../utils/dailySeed';

jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('../utils/dailySeed');

type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
type Rng = () => number;

const SIZE = 4;
const hashSeed = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number): Rng => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const slideRow = (row: number[]): number[] => {
  const arr = row.filter((n) => n !== 0);
  for (let i = 0; i < arr.length - 1; i += 1) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

const transpose = (board: number[][]) => board[0].map((_, c) => board.map((row) => row[c]));
const flip = (board: number[][]) => board.map((row) => [...row].reverse());

const moveLeft = (board: number[][]) => board.map((row) => slideRow(row));
const moveRight = (board: number[][]) => flip(moveLeft(flip(board)));
const moveUp = (board: number[][]) => transpose(moveLeft(transpose(board)));
const moveDown = (board: number[][]) => transpose(moveRight(transpose(board)));

const moveFns: Record<Direction, (board: number[][]) => number[][]> = {
  ArrowLeft: moveLeft,
  ArrowRight: moveRight,
  ArrowUp: moveUp,
  ArrowDown: moveDown,
};

const boardsEqual = (a: number[][], b: number[][]) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));

const cloneBoard = (board: number[][]) => board.map((row) => [...row]);

const addRandomTile = (b: number[][], rand: Rng) => {
  const empty: [number, number][] = [];
  b.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === 0) empty.push([r, c]);
    })
  );
  if (empty.length === 0) return;
  const [r, c] = empty[Math.floor(rand() * empty.length)];
  b[r][c] = rand() < 0.9 ? 2 : 4;
};

const createInitialState = (seed: string) => {
  const rng = mulberry32(hashSeed(seed));
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  addRandomTile(board, rng);
  addRandomTile(board, rng);
  return { board, rng };
};

const readBoardFromDom = (container: HTMLElement): number[][] => {
  const boardEl = container.querySelector('[data-testid="daily-2048-board"]');
  if (!boardEl) throw new Error('board element not found');
  const cells = Array.from(boardEl.children) as HTMLElement[];
  const values = cells.map((cell) => {
    const text = cell.firstElementChild?.textContent ?? '';
    const decimal = parseInt(text, 10);
    if (!Number.isNaN(decimal)) return decimal;
    const hex = parseInt(text, 16);
    return Number.isNaN(hex) ? 0 : hex;
  });
  const board: number[][] = [];
  for (let r = 0; r < SIZE; r += 1) {
    board.push(values.slice(r * SIZE, (r + 1) * SIZE));
  }
  return board;
};

const swipePoints: Record<Direction, { start: [number, number]; end: [number, number] }> = {
  ArrowLeft: { start: [120, 80], end: [20, 80] },
  ArrowRight: { start: [20, 80], end: [120, 80] },
  ArrowUp: { start: [80, 120], end: [80, 20] },
  ArrowDown: { start: [80, 20], end: [80, 120] },
};

const performSwipe = (element: HTMLElement, direction: Direction, pointerId = 1) => {
  const { start, end } = swipePoints[direction];
  fireEvent.pointerDown(element, {
    pointerId,
    pointerType: 'touch',
    clientX: start[0],
    clientY: start[1],
    button: 0,
  });
  fireEvent.pointerUp(element, {
    pointerId,
    pointerType: 'touch',
    clientX: end[0],
    clientY: end[1],
  });
};

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('swipe gesture moves tiles using shared logic', async () => {
  const seed = 'swipe-test-seed';
  (getDailySeed as jest.Mock).mockResolvedValue(seed);
  const { board: initialBoard, rng } = createInitialState(seed);
  const { container } = render(<Page2048 />);

  await waitFor(() => expect(readBoardFromDom(container)).toEqual(initialBoard));

  const boardEl = container.querySelector('[data-testid="daily-2048-board"]');
  expect(boardEl).not.toBeNull();

  const direction: Direction = 'ArrowUp';
  performSwipe(boardEl as HTMLElement, direction);

  const expected = moveFns[direction](cloneBoard(initialBoard));
  addRandomTile(expected, rng);

  await waitFor(() => expect(readBoardFromDom(container)).toEqual(expected));
});

test('movement is throttled to one action per cooldown window', async () => {
  const seed = 'throttle-test-seed';
  (getDailySeed as jest.Mock).mockResolvedValue(seed);
  const { board: baseBoard, rng } = createInitialState(seed);
  let currentTime = 1000;
  const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

  try {
    const { container } = render(<Page2048 />);

    await waitFor(() => expect(readBoardFromDom(container)).toEqual(baseBoard));

    const firstDirection: Direction = 'ArrowUp';
    const afterFirst = moveFns[firstDirection](cloneBoard(baseBoard));
    addRandomTile(afterFirst, rng);

    fireEvent.keyDown(window, { key: firstDirection });

    await waitFor(() => expect(readBoardFromDom(container)).toEqual(afterFirst));

    const secondDirection: Direction = 'ArrowUp';
    const boardEl = container.querySelector('[data-testid="daily-2048-board"]');
    expect(boardEl).not.toBeNull();

    currentTime += MOVE_COOLDOWN_MS - 10;
    performSwipe(boardEl as HTMLElement, secondDirection, 2);

    await waitFor(() => expect(readBoardFromDom(container)).toEqual(afterFirst));

    const afterSecond = moveFns[secondDirection](cloneBoard(afterFirst));
    addRandomTile(afterSecond, rng);

    currentTime += MOVE_COOLDOWN_MS + 10;
    performSwipe(boardEl as HTMLElement, secondDirection, 3);

    await waitFor(() => expect(readBoardFromDom(container)).toEqual(afterSecond));
  } finally {
    nowSpy.mockRestore();
  }
});

test('tile transitions are aligned with move cooldown for smooth animations', async () => {
  const seed = 'animation-test-seed';
  (getDailySeed as jest.Mock).mockResolvedValue(seed);
  const { container } = render(<Page2048 />);

  await waitFor(() => {
    const boardEl = container.querySelector('[data-testid="daily-2048-board"]');
    return boardEl && boardEl.children.length === SIZE * SIZE;
  });

  const boardEl = container.querySelector('[data-testid="daily-2048-board"]') as HTMLElement;
  const firstCell = boardEl.firstElementChild as HTMLElement;

  expect(firstCell.style.transitionDuration).toBe(`${MOVE_COOLDOWN_MS}ms`);
  expect(firstCell.style.willChange).toBe('transform, opacity');
});

