import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import {
  createBoard,
  computeLegalMoves,
  countPieces,
  applyMove,
  hintHeatmap,
  exportHistory,
  importHistory,
} from './reversiLogic';

const Reversi = () => {
  const initial = { board: createBoard(), player: 'B' };
  const [board, setBoard] = useState(initial.board);
  const [player, setPlayer] = useState(initial.player);
  const [history, setHistory] = useState([initial]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("Black's turn");
  const [flipping, setFlipping] = useState([]);
  const [preview, setPreview] = useState(null);
  const [aiDepth, setAiDepth] = useState(2);
  const [mustPass, setMustPass] = useState(false);
  const [gameOver, setGameOver] = useState(null);
    const workerRef = useRef();
    const handleMoveRef = useRef((r, c) => {});

  const legalMoves = useMemo(() => computeLegalMoves(board, player), [board, player]);
  const heatmap = useMemo(() => hintHeatmap(board, player, aiDepth), [board, player, aiDepth]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./reversi.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { move } = e.data;
        if (move) {
          const [r, c] = move;
          handleMoveRef.current(r, c);
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
        const winner =
          black > white
            ? 'Black wins!'
            : white > black
            ? 'White wins!'
            : "It's a draw";
        setStatus(winner);
        setGameOver({ black, white, winner });
        ReactGA.event({ category: 'reversi', action: 'game_over', label: `${black}-${white}` });
      } else {
        setMustPass(true);
        setStatus(`${player === 'B' ? 'Black' : 'White'} has no moves`);
      }
    } else {
      setStatus(`${player === 'B' ? 'Black' : 'White'}'s turn`);
      setMustPass(false);
    }
  }, [legalMoves, board, player]);

  useEffect(() => {
    if (mustPass && player === 'W') {
      ReactGA.event({ category: 'reversi', action: 'pass', label: 'W' });
      setPlayer('B');
      setMustPass(false);
      return;
    }
    if (player === 'W' && Object.keys(legalMoves).length && workerRef.current) {
      workerRef.current.postMessage({ board, player, depth: aiDepth });
    }
  }, [player, legalMoves, board, mustPass, aiDepth]);

  const handleMove = (r, c) => {
    const key = `${r}-${c}`;
    const toFlip = legalMoves[key];
    if (!toFlip || gameOver) return;
    const opponent = player === 'B' ? 'W' : 'B';
    const flipInfo = toFlip.map(([fr, fc]) => ({ key: `${fr}-${fc}`, from: opponent }));
    setFlipping(flipInfo);
    const newBoard = applyMove(board, r, c, player, toFlip);
    setBoard(newBoard);
    const newHist = history.slice(0, step + 1);
    newHist.push({ board: newBoard, player: opponent });
    setHistory(newHist);
    setStep(step + 1);
    ReactGA.event({ category: 'reversi', action: 'move', label: `${player}:${r}-${c}` });
    setTimeout(() => setFlipping([]), 400);
    setPlayer(opponent);
  };

    handleMoveRef.current = handleMove;

  const handlePreview = (r, c) => {
    const key = `${r}-${c}`;
    const toFlip = legalMoves[key];
    if (toFlip) setPreview({ move: [r, c], flips: toFlip });
  };

  const clearPreview = () => setPreview(null);

  useEffect(() => setPreview(null), [board, player]);

  const reset = () => {
    const b = createBoard();
    setBoard(b);
    setPlayer('B');
    setStatus("Black's turn");
    setPreview(null);
    setMustPass(false);
    setGameOver(null);
    setHistory([{ board: b, player: 'B' }]);
    setStep(0);
  };

  const { black, white } = useMemo(() => countPieces(board), [board]);

  const changeDepth = (e) => {
    const depth = parseInt(e.target.value, 10);
    setAiDepth(depth);
    ReactGA.event({ category: 'reversi', action: 'ai_level_select', label: depth.toString() });
  };

  const passTurn = () => {
    if (!mustPass) return;
    const next = player === 'B' ? 'W' : 'B';
    ReactGA.event({ category: 'reversi', action: 'pass', label: player });
    const newHist = history.slice(0, step + 1);
    newHist.push({ board, player: next });
    setHistory(newHist);
    setStep(step + 1);
    setPlayer(next);
    setMustPass(false);
  };

  const undo = () => {
    if (step === 0) return;
    const prev = history[step - 1];
    setBoard(prev.board);
    setPlayer(prev.player);
    setStep(step - 1);
    setGameOver(null);
  };

  const redo = () => {
    if (step >= history.length - 1) return;
    const next = history[step + 1];
    setBoard(next.board);
    setPlayer(next.player);
    setStep(step + 1);
    setGameOver(null);
  };

  const exportGame = () => {
    navigator.clipboard.writeText(exportHistory(history));
  };

  const importGame = () => {
    const data = prompt('Paste game history');
    if (!data) return;
    const hist = importHistory(data);
    if (hist && hist.length) {
      setHistory(hist);
      const last = hist[hist.length - 1];
      setBoard(last.board);
      setPlayer(last.player);
      setStep(hist.length - 1);
      setGameOver(null);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 select-none relative">
      <div className="mb-2">{status}</div>
      <div className="mb-2 flex items-center space-x-2">
        <label htmlFor="aiDepth">AI Level:</label>
        <select
          id="aiDepth"
          value={aiDepth}
          onChange={changeDepth}
          className="bg-gray-700 text-white rounded px-2 py-1"
        >
          <option value={2}>Easy</option>
          <option value={4}>Medium</option>
          <option value={6}>Hard</option>
        </select>
      </div>
      <div className="mb-4">Black: {black} White: {white}</div>
      <div className="grid grid-cols-8 gap-1 bg-green-700 p-1">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const move = legalMoves[key];
            const flipObj = flipping.find((f) => f.key === key);
            const front = flipObj ? flipObj.from : cell;
            const back = cell;
            const isPreview = preview && preview.move[0] === r && preview.move[1] === c;
            const willFlip =
              preview && preview.flips.some(([fr, fc]) => fr === r && fc === c);
            const heat = heatmap[key] || 0;
            return (
              <div
                key={key}
                onClick={() => handleMove(r, c)}
                onMouseEnter={() => handlePreview(r, c)}
                onMouseLeave={clearPreview}
                className={`relative w-8 h-8 flex items-center justify-center bg-green-600 ${
                  move ? 'cursor-pointer hover:bg-green-500' : ''
                }`}
                style={{ backgroundColor: move ? `rgba(255,255,0,${heat * 0.5})` : undefined }}
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
                {!cell && move && !isPreview && (
                  <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                )}
                {!cell && isPreview && (
                  <div
                    className={`w-6 h-6 rounded-full ${
                      player === 'B' ? 'bg-black' : 'bg-white'
                    } opacity-50`}
                  />
                )}
                {willFlip && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-6 h-6 rounded-full ${
                        player === 'B' ? 'bg-black' : 'bg-white'
                      } opacity-50`}
                    />
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      {mustPass && player === 'B' && (
        <button
          onClick={passTurn}
          className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Pass
        </button>
      )}
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Reset
      </button>
      <div className="mt-2 space-x-2">
        <button
          onClick={undo}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Undo
        </button>
        <button
          onClick={redo}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Redo
        </button>
        <button
          onClick={exportGame}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Export
        </button>
        <button
          onClick={importGame}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Import
        </button>
      </div>
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-panel p-4 rounded text-center">
            <div className="mb-2">{gameOver.winner}</div>
            <div className="mb-2">Black: {gameOver.black} White: {gameOver.white}</div>
            <button
              onClick={reset}
              className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              New Game
            </button>
          </div>
        </div>
      )}
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

