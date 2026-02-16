import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import Game2048, { setSeed } from '../components/apps/2048';

jest.mock('../apps/games/rng', () => ({
  reset: () => {},
  serialize: () => 'rng',
  deserialize: () => {},
  random: () => 0.5,
}));

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  setSeed(1);
  localStorage.setItem('2048-seed', new Date().toISOString().slice(0, 10));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  localStorage.clear();
  jest.restoreAllMocks();
});

test('win overlay allows keep playing', async () => {
  localStorage.setItem('2048-board', JSON.stringify([
    [1024, 1024, 0, 0],
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  render(<Game2048 />);

  await act(async () => { fireEvent.keyDown(window, { key: 'ArrowLeft' }); jest.advanceTimersByTime(300); });
  expect(screen.getByText('You reached 2048!')).toBeInTheDocument();

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Keep going/i })); });
  await act(async () => { fireEvent.keyDown(window, { key: 'ArrowRight' }); jest.advanceTimersByTime(300); });
  expect(screen.queryByText('You reached 2048!')).not.toBeInTheDocument();
});

test('renders moving tile animation layer when a move happens', async () => {
  localStorage.setItem('2048-board', JSON.stringify([
    [2, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  const { container } = render(<Game2048 />);
  await act(async () => { fireEvent.keyDown(window, { key: 'ArrowLeft' }); });
  expect(container.querySelector('.tile-moving-active') || container.querySelector('.tile-moving-idle')).toBeTruthy();
});

test('undo rewinds after animated move', async () => {
  localStorage.setItem('2048-board', JSON.stringify([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]));
  render(<Game2048 />);

  await act(async () => { fireEvent.keyDown(window, { key: 'ArrowLeft' }); jest.advanceTimersByTime(300); });
  const movesCard = screen.getByText('Moves').parentElement;
  expect(movesCard?.textContent).toContain('1');

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Undo/i })); });
  expect(movesCard?.textContent).toContain('0');
});

test('hint gracefully disables when worker unavailable', async () => {
  const RealWorker = global.Worker;
  // @ts-ignore
  global.Worker = undefined;
  const view = render(<Game2048 />);
  expect(await screen.findByText(/Hint unavailable/i)).toBeInTheDocument();
  view.unmount();
  global.Worker = RealWorker;
});
