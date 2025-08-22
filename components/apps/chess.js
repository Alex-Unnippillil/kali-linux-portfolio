import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';

const pieceUnicode = {
  p: { w: '♙', b: '♟' },
  r: { w: '♖', b: '♜' },
  n: { w: '♘', b: '♞' },
  b: { w: '♗', b: '♝' },
  q: { w: '♕', b: '♛' },
  k: { w: '♔', b: '♚' },
};

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [board, setBoard] = useState(game.board());
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('Your move');

  useEffect(() => {
    setBoard(game.board());
  }, [game]);

  const reset = () => {
    const newGame = new Chess();
    setGame(newGame);
    setSelected(null);
    setStatus('Your move');
  };

  const makeAIMove = () => {
    const moves = game.moves();
    if (moves.length === 0) {
      setStatus('Game over');
      return;
    }
    const move = moves[Math.floor(Math.random() * moves.length)];
    game.move(move);
    setBoard(game.board());
    if (game.game_over()) {
      setStatus('Game over');
    } else {
      setStatus('Your move');
    }
  };

  const handleSquareClick = (file, rank) => {
    const square = 'abcdefgh'[file] + (8 - rank);
    if (selected) {
      const move = { from: selected, to: square, promotion: 'q' };
      const result = game.move(move);
      if (result) {
        setBoard(game.board());
        setSelected(null);
        if (game.game_over()) {
          setStatus('Game over');
        } else {
          setStatus('AI thinking...');
          setTimeout(() => makeAIMove(), 300);
        }
      } else {
        setSelected(square);
      }
    } else {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelected(square);
      }
    }
  };

  const renderSquare = (piece, file, rank) => {
    const squareName = 'abcdefgh'[file] + (8 - rank);
    const isSelected = selected === squareName;
    const squareColor = (file + rank) % 2 === 0 ? 'bg-gray-300' : 'bg-gray-700';
    return (
      <div
        key={squareName}
        onClick={() => handleSquareClick(file, rank)}
        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center select-none ${squareColor} ${
          isSelected ? 'ring-2 ring-yellow-400' : ''
        }`}
      >
        {piece ? pieceUnicode[piece.type][piece.color] : ''}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="grid grid-cols-8">
        {board.map((row, rank) =>
          row.map((piece, file) => renderSquare(piece, file, rank))
        )}
      </div>
      <div className="mt-4">{status}</div>
      <button
        className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={reset}
      >
        Reset
      </button>
    </div>
  );
};

export default ChessGame;

