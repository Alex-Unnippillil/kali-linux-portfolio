import React, { useEffect, useState } from 'react';
import {
  initialBoard,
  getMoves,
  makeMove,
  negamax,
  Player,
  countBits,
  flipsForMove,
  bitIndex,
} from './engine';

const Reversi: React.FC = () => {
  const [board, setBoard] = useState(initialBoard());
  const [turn, setTurn] = useState<Player>(Player.Black);
  const [hint, setHint] = useState<bigint | null>(null);
  const [hoverFlips, setHoverFlips] = useState<bigint>(0n);
  const [heatmap, setHeatmap] = useState<Record<number, number>>({});

  const playerBits = turn === Player.Black ? board.black : board.white;
  const oppBits = turn === Player.Black ? board.white : board.black;
  const moves = getMoves(playerBits, oppBits);

  useEffect(() => {
    const h: Record<number, number> = {};
    let m = moves;
    while (m) {
      const move = m & -m;
      const idx = bitIndex(move);
      const { player, opponent } = makeMove(playerBits, oppBits, move);
      const { score } = negamax(opponent, player, 4);
      h[idx] = -score;
      m ^= move;
    }
    setHeatmap(h);
  }, [board, turn]);

  const handleClick = (idx: number) => {
    const m = 1n << BigInt(idx);
    if ((moves & m) === 0n) return;
    const { player, opponent } = makeMove(playerBits, oppBits, m);
    if (turn === Player.Black) {
      setBoard({ black: player, white: opponent });
    } else {
      setBoard({ black: opponent, white: player });
    }
    setTurn(turn === Player.Black ? Player.White : Player.Black);
    setHint(null);
  };

  const showHint = () => {
    const { move } = negamax(playerBits, oppBits, 8);
    setHint(move === 0n ? null : move);
  };

  const handleHover = (idx: number) => {
    const m = 1n << BigInt(idx);
    if ((moves & m) === 0n) return;
    setHoverFlips(flipsForMove(playerBits, oppBits, m));
  };

  const clearHover = () => setHoverFlips(0n);

  const renderSquare = (idx: number) => {
    const b = 1n << BigInt(idx);
    const hasBlack = (board.black & b) !== 0n;
    const hasWhite = (board.white & b) !== 0n;
    const isHint = hint === b;
    const isMove = (moves & b) !== 0n;
    const isFlip = (hoverFlips & b) !== 0n;
    const score = heatmap[idx];
    const color =
      score !== undefined
        ? `rgba(${score < 0 ? 255 : 0}, ${score > 0 ? 255 : 0}, 0, ${Math.min(
            Math.abs(score) / 100,
            1
          )})`
        : undefined;
    return (
      <div
        key={idx}
        onClick={() => handleClick(idx)}
        onMouseEnter={() => handleHover(idx)}
        onMouseLeave={clearHover}
        className={`relative w-10 h-10 flex items-center justify-center bg-green-700 border border-green-800 ${
          isHint ? 'ring-4 ring-yellow-400' : ''
        }`}
      >
        {color && !hasBlack && !hasWhite && (
          <div className="absolute inset-0" style={{ backgroundColor: color }} />
        )}
        {isFlip && <div className="absolute inset-0 bg-yellow-300 opacity-50" />}
        {hasBlack && <div className="w-8 h-8 rounded-full bg-black" />}
        {hasWhite && <div className="w-8 h-8 rounded-full bg-white" />}
        {!hasBlack && !hasWhite && isMove && (
          <div className="w-3 h-3 rounded-full bg-blue-300 opacity-60" />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex space-x-4 items-center">
        <div>Black: {countBits(board.black)}</div>
        <div>White: {countBits(board.white)}</div>
        <div>Turn: {turn === Player.Black ? 'Black' : 'White'}</div>
        <button
          type="button"
          onClick={showHint}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          Hint
        </button>
      </div>
      <div className="grid grid-cols-8 w-max" style={{ lineHeight: 0 }}>
        {Array.from({ length: 64 }, (_, i) => renderSquare(i))}
      </div>
    </div>
  );
};

export default Reversi;
