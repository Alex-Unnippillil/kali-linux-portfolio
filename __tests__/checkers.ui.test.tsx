import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Checkers from '../components/apps/checkers';

jest.mock('react-ga4', () => ({ event: jest.fn() }));

class WorkerMock {
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  postMessage() {}
  terminate() {}
}
// @ts-ignore
global.Worker = WorkerMock;

describe('Checkers UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('illegal moves are rejected', () => {
    const { getByTestId } = render(<Checkers />);
    const from = getByTestId('square-5-0');
    const illegal = getByTestId('square-5-2');
    fireEvent.click(from);
    fireEvent.click(illegal);
    expect(getByTestId('piece-5-0')).toBeTruthy();
  });

  test('kinged piece shows crown', () => {
    const customBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    // place a single red piece ready to king
    customBoard[1][2] = { color: 'red', king: false } as any;
    localStorage.setItem(
      'checkersState',
      JSON.stringify({
        board: customBoard,
        turn: 'red',
        history: [],
        future: [],
        noCapture: 0,
        winner: null,
        draw: false,
        lastMove: [],
      })
    );
    const { getByTestId } = render(<Checkers />);
    const from = getByTestId('square-1-2');
    const to = getByTestId('square-0-1');
    fireEvent.click(from);
    fireEvent.click(to);
    expect(getByTestId('piece-0-1').textContent).toContain('👑');
  });
});
