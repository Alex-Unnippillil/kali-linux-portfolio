import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Game2048, { setSeed } from '../components/apps/2048';

beforeEach(() => {
  window.localStorage.clear();
  setSeed(1);
});

test('merging two 2s creates one 4', () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  render(<Game2048 />);
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  const board = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  expect(board[0][0]).toBe(4);
});

test('merge triggers animation', () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { container } = render(<Game2048 />);
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  const firstCell = container.querySelector('.grid div');
  expect(firstCell?.querySelector('.merge-ripple')).toBeTruthy();
});

test('undo only restores last move', () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { getByText } = render(<Game2048 />);
  const initial = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  const undoBtn = getByText('Undo');
  fireEvent.click(undoBtn);
  let board = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  expect(board).toEqual(initial);
  fireEvent.click(undoBtn);
  board = JSON.parse(window.localStorage.getItem('2048-board') || '[]');
  expect(board).toEqual(initial);
});

test('colorblind palette toggle changes tile class', () => {
  window.localStorage.setItem('2048-board', JSON.stringify([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { container, getByLabelText } = render(<Game2048 />);
  const firstCell = container.querySelector('.grid div');
  expect(firstCell?.className).toContain('bg-gray-300');
  const toggle = getByLabelText('Colorblind');
  fireEvent.click(toggle);
  const updated = container.querySelector('.grid div');
  expect(updated?.className).not.toContain('bg-gray-300');
});
