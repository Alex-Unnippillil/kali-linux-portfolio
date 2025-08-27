import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import {
  createBoard,
  computeLegalMoves,
  countPieces,
  applyMove,
  bestMove,
} from './reversiLogic';

const Reversi = () => {
  const [board, setBoard] = useState(createBoard);
  const [player, setPlayer] = useState('B');
  const [status, setStatus] = useState("Black's turn");
  const [flipping, setFlipping] = useState([]);
  const [preview, setPreview] = useState(null);
  const [aiDepth, setAiDepth] = useState(2);
  const [mustPass, setMustPass] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const workerRef = useRef();
  const handleMoveRef = useRef((r, c) => {});
  const touchTimeout = useRef(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [moves, setMoves] = useState([]);

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
        if (data.aiDepth) setAiDepth(data.aiDepth);
        if (data.mustPass) setMustPass(data.mustPass);
        if (data.gameOver) setGameOver(data.gameOver);
        if (data.moves) setMoves(data.moves);
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
      aiDepth,
      mustPass,
      gameOver,
      moves,
    };
    window.localStorage.setItem('reversiState', JSON.stringify(state));
  }, [board, player, history, future, aiDepth, mustPass, gameOver, moves]);

  useEffect(() => {
    if (!showSuggestion) {
      setSuggestion(null);
      return;
    }
    const best = bestMove(board, player, 2);
    setSuggestion(best);
  }, [showSuggestion, board, player]);

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
    setHistory((h) => [...h, { board: board.map((row) => row.slice()), player, move: [r, c] }]);
    setMoves((m) => [...m, { player, r, c }]);
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

  const startTouch = (r, c) => {
    handlePreview(r, c);
    touchTimeout.current = setTimeout(() => {
      handleMove(r, c);
      touchTimeout.current = null;
    }, 500);
  };

  const endTouch = () => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }
    clearPreview();
  };

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
    setShowSuggestion(false);
    setMoves([]);
    setAnalysisMode(false);
    setAnalysisIndex(0);
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
    setPlayer(next);
    setMustPass(false);
  };

  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [{ board: board.map((row) => row.slice()), player, move: last.move, movePlayer: last.player }, ...f]);
    setBoard(last.board);
    setPlayer(last.player);
    setPreview(null);
    setFlipping([]);
    setGameOver(null);
    setMoves((m) => m.slice(0, -1));
  };

  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, { board: board.map((row) => row.slice()), player: next.movePlayer, move: next.move }]);
    setBoard(next.board);
    setPlayer(next.player);
    setPreview(null);
    setFlipping([]);
    setGameOver(null);
    setMoves((m) => [...m, { player: next.movePlayer, r: next.move[0], c: next.move[1] }]);
  };

  const toggleSuggestion = () => setShowSuggestion((s) => !s);

  const toggleAnalysis = () => {
    setAnalysisMode((a) => !a);
    setAnalysisIndex(moves.length);
  };

  const exportMoves = () => {
    const dataStr = JSON.stringify(moves);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reversi-moves.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const analysisBoard = useMemo(() => {
    if (!analysisMode) return board;
    let temp = createBoard();
    for (let i = 0; i < analysisIndex; i += 1) {
      const { player: p, r, c } = moves[i];
      const flips = computeLegalMoves(temp, p)[`${r}-${c}`] || [];
      temp = applyMove(temp, r, c, p, flips);
    }
    return temp;
  }, [analysisMode, analysisIndex, moves, board]);

  const gridBoard = analysisMode ? analysisBoard : board;
  const activeMoves = analysisMode ? {} : legalMoves;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none relative">
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
        {gridBoard.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const move = activeMoves[key];
            const flipObj = flipping.find((f) => f.key === key);
            const front = flipObj ? flipObj.from : cell;
            const back = cell;
            const isPreview = !analysisMode && preview && preview.move[0] === r && preview.move[1] === c;
            const willFlip = !analysisMode && preview && preview.flips.some(([fr, fc]) => fr === r && fc === c);
            const isSuggestion = !analysisMode && suggestion && suggestion[0] === r && suggestion[1] === c;
            const isCorner = (r === 0 || r === 7) && (c === 0 || c === 7);
            return (
              <div
                key={key}
                onClick={!analysisMode ? () => handleMove(r, c) : undefined}
                onMouseEnter={!analysisMode ? () => handlePreview(r, c) : undefined}
                onMouseLeave={!analysisMode ? clearPreview : undefined}
                onTouchStart={!analysisMode ? () => startTouch(r, c) : undefined}
                onTouchEnd={!analysisMode ? endTouch : undefined}
                className={`relative w-8 h-8 flex items-center justify-center bg-green-600 ${
                  move && !analysisMode ? 'cursor-pointer hover:bg-green-500 hover:ring-2 hover:ring-yellow-300' : ''
                }`}
              >
                {isSuggestion && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-blue-400 rounded-sm" />
                )}
                {move && isCorner && !cell && (
                  <div className="absolute inset-0 pointer-events-none ring-2 ring-yellow-400 rounded-sm" />
                )}
                {cell && (
                  <div className={`piece ${flipObj ? 'flipping' : ''}`}>
                    <div className={`disc front ${front === 'B' ? 'bg-black' : 'bg-white'}`} />
                    <div className={`disc back ${back === 'B' ? 'bg-black' : 'bg-white'}`} />
                  </div>
                )}
                {!cell && move && !isPreview && (
                  <div className="w-2 h-2 rounded-full bg-white opacity-50" />
                )}
                {!cell && isPreview && (
                  <div className={`w-6 h-6 rounded-full ${player === 'B' ? 'bg-black' : 'bg-white'} opacity-50`} />
                )}
                {willFlip && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-6 h-6 rounded-full ${player === 'B' ? 'bg-black' : 'bg-white'} opacity-50`} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 flex space-x-2 items-center">
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
          onClick={toggleAnalysis}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {analysisMode ? 'Exit Analysis' : 'Analysis'}
        </button>
        {analysisMode && (
          <>
            <input
              type="range"
              min="0"
              max={moves.length}
              value={analysisIndex}
              onChange={(e) => setAnalysisIndex(parseInt(e.target.value, 10))}
              className="mx-2"
            />
            <button
              onClick={exportMoves}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Export
            </button>
          </>
        )}
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
