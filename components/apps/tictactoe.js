import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameLayout from './GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import {
  checkWinner,
  createBoard,
  getTurn,
  applyMove,
  chooseAiMove,
} from '../../apps/games/tictactoe/logic';

const SKINS = {
  classic: { X: 'X', O: 'O' },
  emoji: { X: '❌', O: '⭕' },
  animals: { X: '🐱', O: '🐶' },
  fruits: { X: '🍎', O: '🍌' },
};

const MATCH_TYPES = {
  ai: 'ai',
  local: 'local',
};

const getStartPrompt = (matchType) =>
  matchType === MATCH_TYPES.local ? 'Start Local Game' : 'Choose X or O';

const TicTacToe = () => {
  const [size, setSize] = useState(3);
  const [mode, setMode] = useState('classic');
  const [skin, setSkin] = useState('classic');
  const [level, setLevel] = useState('hard');
  const [matchType, setMatchType] = usePersistentState(
    'tictactoe:matchType',
    MATCH_TYPES.ai,
    (value) => value === MATCH_TYPES.ai || value === MATCH_TYPES.local
  );
  const [board, setBoard] = useState(createBoard(3));
  const [player, setPlayer] = useState(null);
  const [ai, setAi] = useState(null);
  const [status, setStatus] = useState(getStartPrompt(MATCH_TYPES.ai));
  const [winLine, setWinLine] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [stats, setStats] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('tictactoeStats') || '{}');
    } catch {
      return {};
    }
  });

  const lineRef = useRef(null);
  const aiTimeoutRef = useRef(null);

  const aiVariantKey = `ai-${mode}-${size}`;
  const localVariantKey = `local-${mode}-${size}`;
  const legacyVariantKey = `${mode}-${size}`;
  const variantKey = matchType === MATCH_TYPES.ai ? aiVariantKey : localVariantKey;

  const displayedStats =
    matchType === MATCH_TYPES.ai
      ? stats[variantKey] || stats[legacyVariantKey] || { wins: 0, losses: 0, draws: 0 }
      : stats[variantKey] || { xWins: 0, oWins: 0, draws: 0 };

  const recordResult = useCallback(
    (res) => {
      setStats((prev) => {
        const updated = { ...prev };
        if (matchType === MATCH_TYPES.ai) {
          const cur = prev[variantKey] || { wins: 0, losses: 0, draws: 0 };
          updated[variantKey] = {
            wins: res === 'win' ? cur.wins + 1 : cur.wins,
            losses: res === 'loss' ? cur.losses + 1 : cur.losses,
            draws: res === 'draw' ? cur.draws + 1 : cur.draws,
          };
        } else {
          const cur = prev[variantKey] || { xWins: 0, oWins: 0, draws: 0 };
          updated[variantKey] = {
            xWins: res === 'X' ? cur.xWins + 1 : cur.xWins,
            oWins: res === 'O' ? cur.oWins + 1 : cur.oWins,
            draws: res === 'draw' ? cur.draws + 1 : cur.draws,
          };
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('tictactoeStats', JSON.stringify(updated));
        }
        return updated;
      });
    },
    [matchType, variantKey]
  );

  useEffect(() => {
    setBoard(createBoard(size));
    setPlayer(null);
    setAi(null);
    setStatus(getStartPrompt(matchType));
    setWinLine(null);
    setAiThinking(false);
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  }, [matchType, mode, size]);

  useEffect(() => () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, []);

  const startGame = (p, nextMatchType = MATCH_TYPES.ai) => {
    const nextBoard = createBoard(size);
    const a = nextMatchType === MATCH_TYPES.ai ? (p === 'X' ? 'O' : 'X') : null;
    setPlayer(nextMatchType === MATCH_TYPES.ai ? p : 'X');
    setAi(a);
    setBoard(nextBoard);
    const openingTurn = getTurn(nextBoard);
    setStatus(`${SKINS[skin][openingTurn]}'s turn`);
    setWinLine(null);
    setAiThinking(false);
  };

  const handleClick = (idx) => {
    if (player === null) return;
    if (aiThinking) return;
    const { winner } = checkWinner(board, size, mode === 'misere');
    if (winner) return;
    const toMove = getTurn(board);
    if (matchType === MATCH_TYPES.ai && toMove !== player) return;
    if (board[idx]) return;
    try {
      setBoard((prev) => applyMove(prev, idx, toMove));
    } catch {
      // ignore illegal move
    }
  };

  useEffect(() => {
    if (player === null) return;
    const { winner, line } = checkWinner(board, size, mode === 'misere');
    if (winner) {
      setStatus(winner === 'draw' ? 'Draw' : `${SKINS[skin][winner]} wins`);
      setWinLine(line);
      setAiThinking(false);
      if (matchType === MATCH_TYPES.ai) {
        if (winner === 'draw') recordResult('draw');
        else if (winner === player) recordResult('win');
        else recordResult('loss');
      } else {
        recordResult(winner === 'draw' ? 'draw' : winner);
      }
      return;
    }

    const toMove = getTurn(board);
    if (matchType === MATCH_TYPES.ai && toMove === ai && !aiThinking) {
      setStatus('AI thinking...');
      setAiThinking(true);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = setTimeout(() => {
        setBoard((current) => {
          const currentWinner = checkWinner(current, size, mode === 'misere').winner;
          if (currentWinner) return current;
          const currentTurn = getTurn(current);
          if (currentTurn !== ai) return current;
          const move = chooseAiMove(current, ai, {
            size,
            mode: mode === 'misere' ? 'misere' : 'classic',
            difficulty: level,
            rng: Math.random,
          });
          if (move < 0 || current[move]) return current;
          try {
            return applyMove(current, move, ai);
          } catch {
            return current;
          }
        });
        setAiThinking(false);
      }, 200);
    } else if (!aiThinking) {
      setStatus(`${SKINS[skin][toMove]}'s turn`);
    }
  }, [ai, aiThinking, board, level, matchType, mode, player, recordResult, size, skin]);

  useEffect(() => {
    if (winLine && lineRef.current) {
      const line = lineRef.current;
      const length = line.getTotalLength();
      line.style.transition = 'none';
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        line.style.transition = 'stroke-dashoffset 0.5s ease';
        line.style.strokeDashoffset = '0';
      });
    }
  }, [winLine]);

  const currentSkin = SKINS[skin];
  const hasWinner = Boolean(checkWinner(board, size, mode === 'misere').winner);

  if (player === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <div className="mb-4">Size:
          <select
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value={3}>3×3</option>
            <option value={4}>4×4</option>
          </select>
        </div>
        <div className="mb-4">Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value="classic">Classic</option>
            <option value="misere">Misère (three-in-a-row loses)</option>
          </select>
        </div>
        <div className="mb-4">Match Type:
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            <option value={MATCH_TYPES.ai}>AI Match</option>
            <option value={MATCH_TYPES.local}>Local (2 players)</option>
          </select>
        </div>
        {matchType === MATCH_TYPES.ai && (
          <div className="mb-4">AI Level:
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-gray-700 rounded p-1 ml-2"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        )}
        <div className="mb-4">Skin:
          <select
            value={skin}
            onChange={(e) => setSkin(e.target.value)}
            className="bg-gray-700 rounded p-1 ml-2"
          >
            {Object.keys(SKINS).map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>
        {matchType === MATCH_TYPES.ai ? (
          <>
            <div className="mb-4">Choose X or O</div>
            <div className="flex space-x-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => startGame('X', MATCH_TYPES.ai)}
              >
                {currentSkin.X}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => startGame('O', MATCH_TYPES.ai)}
              >
                {currentSkin.O}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => startGame('X', MATCH_TYPES.local)}
          >
            Start Local Game
          </button>
        )}
        <div className="mt-4 text-sm">
          <div>Stats for {mode} {size}×{size}:</div>
          {matchType === MATCH_TYPES.ai ? (
            <div>
              Wins: {displayedStats.wins || 0} | Losses: {displayedStats.losses || 0} | Draws: {displayedStats.draws || 0}
            </div>
          ) : (
            <div>
              X Wins: {displayedStats.xWins || 0} | O Wins: {displayedStats.oWins || 0} | Draws: {displayedStats.draws || 0}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
      <div className="mb-2" aria-live="polite">
        {status}
      </div>
      <div className="relative" style={{ width: `${size * 4.5}rem`, height: `${size * 4.5}rem` }}>
        <div
          className="absolute inset-0 grid gap-px bg-gray-500"
          style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
        >
          {board.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full h-full flex items-center justify-center bg-gray-700 text-5xl"
              aria-label={`Place at row ${Math.floor(idx / size) + 1}, column ${(idx % size) + 1}`}
              onClick={() => handleClick(idx)}
              disabled={Boolean(cell) || hasWinner || aiThinking}
            >
              {cell ? currentSkin[cell] : ''}
            </button>
          ))}
        </div>
        {winLine && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${size * 100} ${size * 100}`}
          >
            {(() => {
              const start = winLine[0];
              const end = winLine[winLine.length - 1];
              const sx = (start % size) * 100 + 50;
              const sy = Math.floor(start / size) * 100 + 50;
              const ex = (end % size) * 100 + 50;
              const ey = Math.floor(end / size) * 100 + 50;
              return (
                <line
                  ref={lineRef}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  stroke="red"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              );
            })()}
          </svg>
        )}
      </div>
      <div className="flex space-x-4 mt-4">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
          onClick={() => {
            if (aiTimeoutRef.current) {
              clearTimeout(aiTimeoutRef.current);
              aiTimeoutRef.current = null;
            }
            setBoard(createBoard(size));
            setStatus(`${currentSkin.X}'s turn`);
            setWinLine(null);
            setAiThinking(false);
          }}
        >
          Restart
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => {
            if (aiTimeoutRef.current) {
              clearTimeout(aiTimeoutRef.current);
              aiTimeoutRef.current = null;
            }
            setPlayer(null);
            setAi(null);
            setBoard(createBoard(size));
            setStatus(getStartPrompt(matchType));
            setWinLine(null);
            setAiThinking(false);
          }}
        >
          Reset
        </button>
      </div>
      <div className="mt-4 text-sm">
        <div>Stats for {mode} {size}×{size}:</div>
        {matchType === MATCH_TYPES.ai ? (
          <div>
            Wins: {displayedStats.wins || 0} | Losses: {displayedStats.losses || 0} | Draws: {displayedStats.draws || 0}
          </div>
        ) : (
          <div>
            X Wins: {displayedStats.xWins || 0} | O Wins: {displayedStats.oWins || 0} | Draws: {displayedStats.draws || 0}
          </div>
        )}
      </div>
    </div>
  );
};

export { checkWinner, minimax } from '../../apps/games/tictactoe/logic';

export default function TicTacToeApp() {
  return (
    <GameLayout gameId="tictactoe">
      <TicTacToe />
    </GameLayout>
  );
}
