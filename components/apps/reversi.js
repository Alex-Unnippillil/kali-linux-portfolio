import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
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
  const [preview, setPreview] = useState(null);
  const [aiPlayouts, setAiPlayouts] = useState(500);
  const [mustPass, setMustPass] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [moveScores, setMoveScores] = useState({});
  const workerRef = useRef();
  const hintWorkerRef = useRef();
  const handleMoveRef = useRef((r, c) => {});

  const legalMoves = useMemo(() => computeLegalMoves(board, player), [board, player]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('reversiState');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.board) setBoard(data.board);
        if (data.player) setPlayer(data.player);
        if (data.history) setHistory(data.history);
        if (data.future) setFuture(data.future);
        if (data.aiPlayouts) setAiPlayouts(data.aiPlayouts);
        else if (data.aiDepth) setAiPlayouts(data.aiDepth);
        if (data.mustPass) setMustPass(data.mustPass);
        if (data.gameOver) setGameOver(data.gameOver);
      } catch (e) {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const state = {
      board,
      player,
      history,
      future,
      aiPlayouts,
      mustPass,
      gameOver,
    };
    window.localStorage.setItem('reversiState', JSON.stringify(state));
  }, [board, player, history, future, aiPlayouts, mustPass, gameOver]);

  useEffect(() => {
    if (!showSuggestion) {
      setSuggestion(null);
      setMoveScores({});
      return;
    }
    if (hintWorkerRef.current) {
      hintWorkerRef.current.postMessage({ board, player, playouts: aiPlayouts });
    }
  }, [showSuggestion, board, player, aiPlayouts]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/reversiAI.ts', import.meta.url));
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
    hintWorkerRef.current = new Worker(new URL('../../workers/reversiAI.ts', import.meta.url));
    hintWorkerRef.current.onmessage = (e) => {
      const { move, scores } = e.data;
      if (scores) {
        setMoveScores(scores);
        setSuggestion(move);
      }
    };
    return () => hintWorkerRef.current.terminate();
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
      workerRef.current.postMessage({ board, player, playouts: aiPlayouts });
    }
  }, [player, legalMoves, board, mustPass, aiPlayouts]);

  const handleMove = (r, c) => {
    const key = `${r}-${c}`;
    const toFlip = legalMoves[key];
    if (!toFlip || gameOver) return;
    setHistory((h) => [...h, { board: board.map((row) => row.slice()), player }]);
    setFuture([]);
    const opponent = player === 'B' ? 'W' : 'B';
    const flipInfo = toFlip.map(([fr, fc]) => ({ key: `${fr}-${fc}`, from: opponent }));
    setFlipping(flipInfo);
    setBoard(applyMove(board, r, c, player, toFlip));
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
    setBoard(createBoard());
    setPlayer('B');
    setStatus("Black's turn");
    setPreview(null);
    setMustPass(false);
    setGameOver(null);
    setHistory([]);
    setFuture([]);
    setSuggestion(null);
    setMoveScores({});
    setShowSuggestion(false);
  };

  const { black, white } = useMemo(() => countPieces(board), [board]);

  const changeDepth = (e) => {
    const playouts = parseInt(e.target.value, 10);
    setAiPlayouts(playouts);
    ReactGA.event({ category: 'reversi', action: 'ai_level_select', label: playouts.toString() });
  };

  const passTurn = () => {
    if (!mustPass) return;
    const next = player === 'B' ? 'W' : 'B';
    ReactGA.event({ category: 'reversi', action: 'pass', label: player });
    setPlayer(next);
    setMustPass(false);
  };

  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [{ board: board.map((row) => row.slice()), player }, ...f]);
    setBoard(last.board);
    setPlayer(last.player);
    setPreview(null);
    setFlipping([]);
    setGameOver(null);
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, { board: board.map((row) => row.slice()), player }]);
    setBoard(next.board);
    setPlayer(next.player);
    setPreview(null);
    setFlipping([]);
    setGameOver(null);
  };

  const toggleSuggestion = () => setShowSuggestion((s) => !s);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none relative">
      <div className="mb-2">{status}</div>
      <div className="mb-2 flex items-center space-x-2">
        <label htmlFor="aiDepth">AI Level:</label>
        <select
          id="aiDepth"
          value={aiPlayouts}
          onChange={changeDepth}
          className="bg-gray-700 text-white rounded px-2 py-1"
        >
          <option value={200}>Easy</option>
          <option value={500}>Medium</option>
          <option value={1500}>Hard</option>
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
            const heat = moveScores[key];
            const isSuggestion =
              suggestion && suggestion[0] === r && suggestion[1] === c;
            return (
              <div
                key={key}
                onClick={() => handleMove(r, c)}
                onMouseEnter={() => handlePreview(r, c)}
                onMouseLeave={clearPreview}
                className={`relative w-8 h-8 flex items-center justify-center bg-green-600 ${
                  move ? 'cursor-pointer hover:bg-green-500 hover:ring-2 hover:ring-yellow-300' : ''
                }`}
              >
                {showSuggestion && heat !== undefined && !cell && (
                  <div
                    className="absolute inset-0 pointer-events-none bg-blue-500 rounded-sm"
                    style={{ opacity: heat }}
                  />
                )}
                {isSuggestion && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-blue-400 rounded-sm" />
                )}
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
      <div className="mt-2 flex space-x-2">
        {mustPass && player === 'B' && (
          <button
            onClick={passTurn}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Pass
          </button>
        )}
        <button
          onClick={undo}
          disabled={!history.length}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!future.length}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
        >
          Redo
        </button>
        <button
          onClick={toggleSuggestion}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {showSuggestion ? 'Hide Hint' : 'Show Hint'}
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Reset
        </button>
      </div>
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-ub-cool-grey p-4 rounded text-center">
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

