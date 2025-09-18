jest.mock('../apps/games/_2048/ai', () => {
  const actual = jest.requireActual('../apps/games/_2048/ai');
  return {
    ...actual,
    findHint: jest.fn(actual.findHint),
    scoreMoves: jest.fn(actual.scoreMoves),
  };
});

jest.mock('../components/apps/GameLayout', () => {
  const React = require('react');
  const mockRecorder = {
    record: jest.fn(),
    registerReplay: jest.fn(),
  };
  const MockLayout = ({ children }) =>
    React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    default: MockLayout,
    useInputRecorder: () => mockRecorder,
    __mockRecorder: mockRecorder,
  };
});

jest.mock('../components/apps/useGameControls', () => {
  const handlerRef = { current: null };
  const useGameControlsMock = (arg) => {
    if (typeof arg === 'function') {
      handlerRef.current = arg;
      return null;
    }
    return {};
  };
  const directionMap = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  };
  const triggerKeyDown = (key, init = {}) => {
    if (!handlerRef.current) return;
    if (init.repeat) return;
    const dir = directionMap[key];
    if (dir) handlerRef.current(dir);
  };
  return {
    __esModule: true,
    default: useGameControlsMock,
    __triggerKeyDown: triggerKeyDown,
  };
});

const { __mockRecorder } = jest.requireMock('../components/apps/GameLayout') as {
  __mockRecorder: { record: jest.Mock; registerReplay: jest.Mock };
};

const { __triggerKeyDown } = jest.requireMock('../components/apps/useGameControls') as {
  __triggerKeyDown: (key: string, init?: KeyboardEventInit) => void;
};

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import Game2048, { setSeed } from '../components/apps/2048';
import * as ai from '../apps/games/_2048/ai';

const originalError = console.error;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return;
    }
    originalError(...args);
  });
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  setSeed(1);
  window.localStorage.setItem('2048-seed', new Date().toISOString().slice(0, 10));
  window.localStorage.setItem('seen_tutorial_2048', '1');
  __mockRecorder.record.mockClear();
  __mockRecorder.registerReplay.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

const triggerKey = (key: string, init: KeyboardEventInit = {}): void => {
  act(() => {
    __triggerKeyDown(key, init);
    jest.runOnlyPendingTimers();
  });
};

test.skip('merging two 2s creates one 4', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  render(<Game2048 />);
  await waitFor(() => {
    const b = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
    expect(b[0][0]).toBe(2);
  });
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  const board = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  expect(board[0][0]).toBe(4);
});

test.skip('merge triggers animation', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { container } = render(<Game2048 />);
  await waitFor(() => {
    const b = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
    expect(b[0][0]).toBe(2);
  });
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  const firstCell = container.querySelector('.grid div');
  expect(firstCell?.querySelector('.merge-ripple')).toBeTruthy();
});

test.skip('score persists in localStorage', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { unmount } = render(<Game2048 />);
  await waitFor(() => {
    const b = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
    expect(b[0][0]).toBe(2);
  });
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  await waitFor(() => {
    expect(window.localStorage.getItem('2048-score')).toBe('4');
  });
  unmount();
  const { getAllByText } = render(<Game2048 />);
  expect(getAllByText(/Score:/)[0].textContent).toContain('4');
});

test('ignores browser key repeat events', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { getByText } = render(<Game2048 />);
  triggerKey('ArrowLeft', { repeat: true });
  expect(getByText(/Moves: 0/)).toBeTruthy();
});


test('tracks moves and allows multiple undos', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { getByText } = render(<Game2048 />);
  const initial = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  triggerKey('ArrowLeft');
  act(() => {
    jest.advanceTimersByTime(500);
  });
  triggerKey('ArrowRight');
  expect(getByText(/Moves: 2/)).toBeTruthy();
  const undoBtn = getByText(/Undo/);
  fireEvent.click(undoBtn);
  expect(getByText(/Moves: 1/)).toBeTruthy();
  fireEvent.click(undoBtn);
  expect(getByText(/Moves: 0/)).toBeTruthy();
  const board = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  expect(board).toEqual(initial);
});

test.skip('skin selection changes tile class', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { container, getByLabelText } = render(<Game2048 />);
  await waitFor(() => {
    const b = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
    expect(b[0][0]).toBe(2);
  });
  const firstCell = container.querySelector('.grid div');
  expect(firstCell?.className).toContain('bg-gray-300');
  const select = getByLabelText('Skin');
  fireEvent.change(select, { target: { value: 'neon' } });
  const updated = container.querySelector('.grid div');
  expect(updated?.className).not.toContain('bg-gray-300');
});

test('ignores key repeats while a move is in progress', async () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { getByText } = render(<Game2048 />);
  triggerKey('ArrowLeft');
  triggerKey('ArrowLeft');
  expect(getByText(/Moves: 1/)).toBeTruthy();
  act(() => {
    jest.advanceTimersByTime(500);
  });
  triggerKey('ArrowLeft');
  expect(getByText(/Moves: 2/)).toBeTruthy();
});

test('shows hint overlay and refreshes after a move', async () => {
  const customBoard = [
    [0, 2, 4, 8],
    [0, 4, 8, 16],
    [2, 8, 16, 32],
    [4, 16, 32, 64],
  ];
  window.localStorage.setItem('2048-board', JSON.stringify(customBoard));
  const hintSpy = ai.findHint as jest.Mock;
  hintSpy.mockClear();
  const { getByTestId } = render(<Game2048 />);
  await waitFor(() => {
    expect(hintSpy).toHaveBeenCalled();
    expect(getByTestId('hint-overlay').textContent).not.toBe('');
  }, { timeout: 2000 });
  const initialCalls = hintSpy.mock.calls.length;
  setSeed('hint-seed');
  triggerKey('ArrowLeft');
  await waitFor(() => {
    expect(hintSpy.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(getByTestId('hint-display').textContent).toMatch(/Hint: \w+/);
    expect(getByTestId('hint-overlay').textContent).not.toBe('');
  }, { timeout: 2000 });
});
