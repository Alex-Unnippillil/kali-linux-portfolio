import React from 'react';
import { Chess } from 'chess.js';
import { render, fireEvent } from '@testing-library/react';
import ChessGame from '../components/apps/chess';

test('illegal drags snap back', () => {
  const { getByTestId } = render(<ChessGame aiDelay={0} />);
  fireEvent.click(getByTestId('e2'));
  fireEvent.click(getByTestId('e3'));
  expect(getByTestId('e2').textContent).toBe('♟');
  expect(getByTestId('e3').textContent).toBe('');
});

test('checkmate detected in known position', () => {
  const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 3';
  const { getByText } = render(<ChessGame initialFen={fen} aiDelay={0} />);
  expect(getByText('Checkmate')).toBeInTheDocument();
});

test('premove executes after opponent move', () => {
  const game = new Chess();
  game.move('e4');
  const premove = { from: 'g1', to: 'f3' } as any;
  game.move('Nc6');
  const result = game.move(premove);
  expect(result.from).toBe('g1');
});

