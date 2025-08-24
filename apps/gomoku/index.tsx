import React, { useState } from 'react';
import {
  createBoard,
  Player,
  index,
  applyMove,
  checkWin,
  iterativeDeepening,
  SIZE,
  Board,
} from './engine';

const Gomoku: React.FC = () => {
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<Player>(Player.Black);
  const [capture, setCapture] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [captures, setCaptures] = useState<Record<Player, number>>({
    [Player.Black]: 0,
    [Player.White]: 0,
  });

  const reset = () => {
    setBoard(createBoard());
    setTurn(Player.Black);
    setGameOver(false);
    setWinner(null);
    setCaptures({ [Player.Black]: 0, [Player.White]: 0 });
  };

  const handleClick = (x: number, y: number) => {
    if (gameOver || board[index(x, y)] !== 0 || turn !== Player.Black) return;
    const { board: nb, captured } = applyMove(board, { x, y }, Player.Black, capture);
    const newCaps = { ...captures, [Player.Black]: captures[Player.Black] + captured / 2 };
    setBoard(nb);
    setCaptures(newCaps);
    if (checkWin(nb, Player.Black) || (capture && newCaps[Player.Black] >= 5)) {
      setGameOver(true);
      setWinner(Player.Black);
      return;
    }
    setTurn(Player.White);
    setTimeout(() => aiMove(nb, newCaps), 0);
  };

  const aiMove = (b: Board, caps: Record<Player, number>) => {
    const start = performance.now();
    const move = iterativeDeepening(b, 3, Player.White, capture);
    const end = performance.now();
    console.log(`Depth-3 time: ${end - start}ms`);
    if (!move) {
      setTurn(Player.Black);
      return;
    }
    const { board: nb, captured } = applyMove(b, move, Player.White, capture);
    const newCaps = { ...caps, [Player.White]: caps[Player.White] + captured / 2 };
    setBoard(nb);
    setCaptures(newCaps);
    if (checkWin(nb, Player.White) || (capture && newCaps[Player.White] >= 5)) {
      setGameOver(true);
      setWinner(Player.White);
    } else {
      setTurn(Player.Black);
    }
  };

  const renderCell = (x: number, y: number) => {
    const v = board[index(x, y)];
    return (
      <div
        key={`${x}-${y}`}
        onClick={() => handleClick(x, y)}
        className="w-6 h-6 border border-gray-400 flex items-center justify-center bg-orange-100"
      >
        {v === Player.Black && <div className="w-4 h-4 rounded-full bg-black" />}
        {v === Player.White && <div className="w-4 h-4 rounded-full bg-white" />}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex space-x-4 items-center">
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={capture}
            onChange={(e) => setCapture(e.target.checked)}
          />
          <span>Captures</span>
        </label>
        <div>
          B:{captures[Player.Black]} W:{captures[Player.White]}
        </div>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          Reset
        </button>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${SIZE},1fr)` }}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => renderCell(i % SIZE, Math.floor(i / SIZE)))}
      </div>
      {gameOver && (
        <div>
          {winner === Player.Black ? 'You win!' : 'AI wins'}
        </div>
      )}
    </div>
  );
};

export default Gomoku;
