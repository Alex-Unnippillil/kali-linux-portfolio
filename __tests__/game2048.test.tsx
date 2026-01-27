import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import Game2048, { setSeed } from '../components/apps/2048';

beforeEach(() => {
  jest.useRealTimers();
  window.localStorage.clear();
  setSeed(1);
  window.localStorage.setItem('2048-seed', new Date().toISOString().slice(0, 10));
});

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

test('ignores browser key repeat events', () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { getByText } = render(<Game2048 />);
  fireEvent.keyDown(window, { key: 'ArrowLeft', repeat: true });
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
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500));
  });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
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
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(getByText(/Moves: 1/)).toBeTruthy();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500));
  });
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(getByText(/Moves: 2/)).toBeTruthy();
});
