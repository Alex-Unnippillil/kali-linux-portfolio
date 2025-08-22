import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  createBoard,
  computeLegalMoves,
  countPieces,
  applyMove,
} from './reversiLogic';

const Reversi = () => {
  const [board, setBoard] = useState(createBoard);
  const [player, setPlayer] = useState('B');
  const [status, setStatus] = useState("Black's turn");
  const [flipping, setFlipping] = useState([]);
  const workerRef = useRef();

  const legalMoves = useMemo(() => computeLegalMoves(board, player), [board, player]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./reversi.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { move } = e.data;
      if (move) {
        const [r, c] = move;
        handleMove(r, c);
      } else {
        setPlayer('B');
      }
    };
    return () => workerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (Object.keys(legalMoves).length === 0) {
      const next = player === 'B' ? 'W' : 'B';
      const nextMoves = computeLegalMoves(board, next);
      if (Object.keys(nextMoves).length === 0) {
        const { black, white } = countPieces(board);
        if (black > white) setStatus('Black wins!');
        else if (white > black) setStatus('White wins!');
        else setStatus("It's a draw");
      } else {
        setPlayer(next);
      }
    } else {
      setStatus(`${player === 'B' ? 'Black' : 'White'}'s turn`);
    }
  }, [legalMoves, board, player]);

  const handleMove = (r, c) => {
    const key = `${r}-${c}`;
    const toFlip = legalMoves[key];
    if (!toFlip) return;
    const opponent = player === 'B' ? 'W' : 'B';
    const flipInfo = toFlip.map(([fr, fc]) => ({ key: `${fr}-${fc}`, from: opponent }));
    setFlipping(flipInfo);
    setBoard(applyMove(board, r, c, player, toFlip));
    setTimeout(() => setFlipping([]), 400);
    setPlayer(opponent);
  };

  useEffect(() => {
    if (player === 'W' && Object.keys(legalMoves).length && workerRef.current) {
      workerRef.current.postMessage({ board, player, depth: 7 });
    }
  }, [player, legalMoves, board]);

  const reset = () => {
    setBoard(createBoard());
    setPlayer('B');
    setStatus("Black's turn");
  };

  const { black, white } = useMemo(() => countPieces(board), [board]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="mb-2">{status}</div>
      <div className="mb-4">Black: {black} White: {white}</div>
      <div className="grid grid-cols-8 gap-1 bg-green-700 p-1">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const move = legalMoves[key];
            const flipObj = flipping.find((f) => f.key === key);
            const front = flipObj ? flipObj.from : cell;
            const back = cell;
            return (
              <div
                key={key}
                onClick={() => handleMove(r, c)}
                className={`w-8 h-8 flex items-center justify-center bg-green-600 ${
                  move ? 'cursor-pointer hover:bg-green-500' : ''
                }`}
              >
                {cell && (
                  <div className={`piece ${flipObj ? 'flipping' : ''}`}>
                    <div
                      className={`disc front ${front === 'B' ? 'bg-black' : 'bg-white'}`}
                    />
                    <div
                      className={`disc back ${back === 'B' ? 'bg-black' : 'bg-white'}`}
                    />
                  </div>
                )}
                {!cell && move && <div className="w-2 h-2 rounded-full bg-white opacity-50" />}
              </div>
            );
          }),
        )}
      </div>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Reset
      </button>
      <style jsx>{`
        .piece {
          position: relative;
          width: 80%;
          height: 80%;
          transform-style: preserve-3d;
          transition: transform 0.4s;
        }
        .flipping {
          transform: rotateY(180deg);
        }
        .disc {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          backface-visibility: hidden;
        }
        .back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default Reversi;

