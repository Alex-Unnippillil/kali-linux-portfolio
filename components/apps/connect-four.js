import React, { useEffect, useState } from 'react';

// Configuration presets
const PRESETS = {
  '6x7': { rows: 6, cols: 7 },
  '7x8': { rows: 7, cols: 8 },
};

// --- Bitboard helpers -------------------------------------------------------

const createGame = (rows = 6, cols = 7, popOut = false) => {
  const heights = Array.from({ length: cols }, (_, c) => c * (rows + 1));
  return {
    rows,
    cols,
    popOut,
    bitboards: [0n, 0n],
    heights,
    moves: [], // history of moves for replay export
    player: 0, // 0 - red (human), 1 - yellow (AI)
    numMoves: 0,
  };
};

const cloneGame = (g) => ({
  rows: g.rows,
  cols: g.cols,
  popOut: g.popOut,
  bitboards: [g.bitboards[0], g.bitboards[1]],
  heights: [...g.heights],
  moves: [...g.moves],
  player: g.player,
  numMoves: g.numMoves,
});

const canPlay = (g, col) => g.heights[col] < col * (g.rows + 1) + g.rows;

const applyDrop = (g, col) => {
  const bit = 1n << BigInt(g.heights[col]);
  g.bitboards[g.player] |= bit;
  g.heights[col]++;
  g.numMoves++;
  g.player ^= 1;
  return bit;
};

const undoDrop = (g, col, bit) => {
  g.player ^= 1;
  g.numMoves--;
  g.heights[col]--;
  g.bitboards[g.player] ^= bit;
};

const canPop = (g, col) => {
  if (!g.popOut) return false;
  const base = BigInt(col * (g.rows + 1));
  const bottomBit = 1n << base;
  return (g.bitboards[g.player] & bottomBit) !== 0n;
};

const applyPop = (g, col) => {
  const base = BigInt(col * (g.rows + 1));
  const bottomBit = 1n << base;
  const mask = ((1n << BigInt(g.rows)) - 1n) << base;
  const maskWithoutBottom = mask ^ bottomBit;
  const snap = {
    b0: g.bitboards[0],
    b1: g.bitboards[1],
    h: g.heights[col],
  };
  const curCol = (g.bitboards[g.player] & maskWithoutBottom) >> 1n;
  const oppCol = (g.bitboards[1 - g.player] & maskWithoutBottom) >> 1n;
  g.bitboards[g.player] = (g.bitboards[g.player] & ~mask) | curCol;
  g.bitboards[1 - g.player] = (g.bitboards[1 - g.player] & ~mask) | oppCol;
  g.heights[col]--;
  g.numMoves--;
  g.player ^= 1;
  return snap;
};

const undoPop = (g, col, snap) => {
  g.player ^= 1;
  g.numMoves++;
  g.bitboards[0] = snap.b0;
  g.bitboards[1] = snap.b1;
  g.heights[col] = snap.h;
};

const hasWin = (board, rows) => {
  const H = BigInt(rows + 1);
  let m = board & (board >> 1n);
  if (m & (m >> 2n)) return true; // vertical
  m = board & (board >> H);
  if (m & (m >> (2n * H))) return true; // horizontal
  m = board & (board >> (H - 1n));
  if (m & (m >> (2n * (H - 1n)))) return true; // diagonal /
  m = board & (board >> (H + 1n));
  if (m & (m >> (2n * (H + 1n)))) return true; // diagonal \
  return false;
};

const bitCount = (n) => {
  let c = 0;
  while (n) {
    n &= n - 1n;
    c++;
  }
  return c;
};

// move ordering: center columns first
const ordered = (cols) => {
  const center = (cols - 1) / 2;
  return Array.from({ length: cols }, (_, i) => i).sort(
    (a, b) => Math.abs(center - a) - Math.abs(center - b)
  );
};

const tt = new Map();
const ttKey = (g) =>
  `${g.bitboards[0].toString()}:${g.bitboards[1].toString()}:${g.player}`;

const boardToArray = (g) => {
  const arr = Array.from({ length: g.rows }, () => Array(g.cols).fill(null));
  for (let c = 0; c < g.cols; c++) {
    for (let r = 0; r < g.rows; r++) {
      const idx = c * (g.rows + 1) + r;
      const bit = 1n << BigInt(idx);
      if (g.bitboards[0] & bit) arr[r][c] = 0;
      else if (g.bitboards[1] & bit) arr[r][c] = 1;
    }
  }
  return arr;
};

const windowScore = (window, player) => {
  const opp = 1 - player;
  const countP = window.filter((v) => v === player).length;
  const countO = window.filter((v) => v === opp).length;
  const countE = window.filter((v) => v === null).length;
  let score = 0;
  if (countP === 4) score += 100;
  else if (countP === 3 && countE === 1) score += 5;
  else if (countP === 2 && countE === 2) score += 2;
  if (countO === 3 && countE === 1) score -= 4;
  else if (countO === 2 && countE === 2) score -= 1;
  return score;
};

const heuristic = (g) => {
  const center = Math.floor(g.cols / 2);
  const centerMask =
    ((1n << BigInt(g.rows)) - 1n) << BigInt(center * (g.rows + 1));
  const cur = bitCount(g.bitboards[g.player] & centerMask);
  const opp = bitCount(g.bitboards[1 - g.player] & centerMask);
  let score = (cur - opp) * 3;

  const board = boardToArray(g);
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols - 3; c++) {
      score += windowScore(
        [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]],
        g.player
      );
    }
  }
  for (let c = 0; c < g.cols; c++) {
    for (let r = 0; r < g.rows - 3; r++) {
      score += windowScore(
        [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]],
        g.player
      );
    }
  }
  for (let r = 0; r < g.rows - 3; r++) {
    for (let c = 0; c < g.cols - 3; c++) {
      score += windowScore(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        g.player
      );
    }
  }
  for (let r = 3; r < g.rows; r++) {
    for (let c = 0; c < g.cols - 3; c++) {
      score += windowScore(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        g.player
      );
    }
  }
  return score;
};

const negamax = (g, depth, alpha, beta) => {
  if (hasWin(g.bitboards[1 - g.player], g.rows)) return -1000 + depth;
  if (g.numMoves === g.rows * g.cols) return 0; // draw
  if (depth === 0) return heuristic(g);

  const key = ttKey(g);
  if (tt.has(key)) return tt.get(key);

  const order = ordered(g.cols);
  let best = -Infinity;
  for (const col of order) {
    if (canPlay(g, col)) {
      const bit = applyDrop(g, col);
      const score = -negamax(g, depth - 1, -beta, -alpha);
      undoDrop(g, col, bit);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    } else if (g.popOut && canPop(g, col)) {
      const snap = applyPop(g, col);
      const score = -negamax(g, depth - 1, -beta, -alpha);
      undoPop(g, col, snap);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
  }

  tt.set(key, best);
  return best;
};

const computeHeat = (g, depth) => {
  const scores = Array(g.cols).fill(null);
  const order = ordered(g.cols);
  for (const col of order) {
    if (canPlay(g, col) || (g.popOut && canPop(g, col))) {
      const cg = cloneGame(g);
      if (canPlay(cg, col)) applyDrop(cg, col);
      else if (cg.popOut && canPop(cg, col)) applyPop(cg, col);
      scores[col] = -negamax(cg, depth - 1, -1000, 1000);
    }
  }
  return scores;
};

const aiBestMove = (g, depth) => {
  let best = null;
  let bestScore = -Infinity;
  const order = ordered(g.cols);
  for (const col of order) {
    if (canPlay(g, col) || (g.popOut && canPop(g, col))) {
      const cg = cloneGame(g);
      if (canPlay(cg, col)) applyDrop(cg, col);
      else applyPop(cg, col);
      const score = -negamax(cg, depth - 1, -1000, 1000);
      if (score > bestScore) {
        bestScore = score;
        best = col;
      }
    }
  }
  return best;
};

// --- React component ---------------------------------------------------------

const ConnectFour = () => {
  const [variant, setVariant] = useState('6x7');
  const [popOut, setPopOut] = useState(false);
  const [history, setHistory] = useState([createGame()]);
  const [idx, setIdx] = useState(0);
  const game = history[idx];
  const [winner, setWinner] = useState(null);
  const [heat, setHeat] = useState(Array(game.cols).fill(null));
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });
  const [depth, setDepth] = useState(4);
  const [evalScore, setEvalScore] = useState(0);
  const [selCol, setSelCol] = useState(3);

  // load stats from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('connect4stats') || '{}');
      setStats({ wins: stored.wins || 0, losses: stored.losses || 0, draws: stored.draws || 0 });
    } catch {
      /* ignore */
    }
  }, []);

  const saveStats = (res) => {
    const ns = { ...stats, [res]: stats[res] + 1 };
    setStats(ns);
    localStorage.setItem('connect4stats', JSON.stringify(ns));
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/telemetry',
        JSON.stringify({ game: 'connect-four', result: res })
      );
    }
  };

  const reset = (rows, cols, pop) => {
    setHistory([createGame(rows, cols, pop)]);
    setIdx(0);
    setWinner(null);
    setHeat(Array(cols).fill(null));
    setSelCol(Math.floor(cols / 2));
  };

  const applyMove = (fn, col, type) => {
    if (winner) return;
    const g = cloneGame(game);
    const meta = fn(g, col);
    g.moves.push({ type, col });
    const newHist = history.slice(0, idx + 1);
    newHist.push(g);
    setHistory(newHist);
    setIdx(idx + 1);
    if (hasWin(g.bitboards[1 - g.player], g.rows)) {
      const winPlayer = g.player ^ 1;
      setWinner(winPlayer === 0 ? 'red' : 'yellow');
      saveStats(winPlayer === 0 ? 'wins' : 'losses');
    } else if (g.numMoves === g.rows * g.cols) {
      setWinner('draw');
      saveStats('draws');
    }
    return meta;
  };

  const handleDrop = (col) => {
    if (!canPlay(game, col)) return;
    applyMove(applyDrop, col, 'drop');
  };

  const handlePop = (col) => {
    if (!canPop(game, col)) return;
    applyMove(applyPop, col, 'pop');
  };

  // AI move when it's AI's turn
  useEffect(() => {
    if (!winner && game.player === 1) {
      const move =
        aiBestMove(game, depth) ?? ordered(game.cols).find((c) => canPlay(game, c));
      if (move !== null && move !== undefined) {
        applyMove(
          canPlay(game, move) ? applyDrop : applyPop,
          move,
          canPlay(game, move) ? 'drop' : 'pop'
        );
      }
    }
  }, [idx, winner, depth]);

  // compute hints when it's human's turn
  useEffect(() => {
    if (!winner && game.player === 0) {
      setHeat(computeHeat(game, depth));
    } else {
      setHeat(Array(game.cols).fill(null));
    }
  }, [idx, winner, depth]);

  useEffect(() => {
    setEvalScore(negamax(game, depth, -1000, 1000));
  }, [idx, depth]);

  useEffect(() => {
    const handler = (e) => {
      if (winner) return;
      if (e.key === 'ArrowLeft')
        setSelCol((c) => (c + cols - 1) % cols);
      else if (e.key === 'ArrowRight')
        setSelCol((c) => (c + 1) % cols);
      else if (e.key === ' ' || e.key === 'Enter') handleDrop(selCol);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cols, selCol, winner, handleDrop]);

  const undo = () => {
    if (idx === 0) return;
    setIdx(idx - 1);
    setWinner(null);
  };

  const redo = () => {
    if (idx >= history.length - 1) return;
    setIdx(idx + 1);
  };

  const exportReplay = () => {
    const seq = history[idx].moves.map((m) => `${m.type[0]}${m.col}`).join(',');
    navigator.clipboard?.writeText(seq);
    alert(`Replay copied: ${seq}`);
  };

  const changeVariant = (val) => {
    setVariant(val);
    const { rows, cols } = PRESETS[val];
    reset(rows, cols, popOut);
  };

  const togglePop = () => {
    setPopOut(!popOut);
    const { rows, cols } = PRESETS[variant];
    reset(rows, cols, !popOut);
  };

  const rows = game.rows;
  const cols = game.cols;

  const heatColor = (score) => {
    if (score === null) return 'transparent';
    const norm = Math.max(-50, Math.min(50, score));
    const green = Math.round(((norm + 50) / 100) * 255);
    const red = 255 - green;
    return `rgba(${red},${green},0,0.5)`;
  };

  const boardArr = boardToArray(game).map((row) =>
    row.map((v) => (v === 0 ? 'red' : v === 1 ? 'yellow' : null))
  );
  const evalPercent = Math.max(0, Math.min(100, ((evalScore + 1000) / 2000) * 100));

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-2 select-none">
      <div className="mb-2 flex items-center gap-2">
        <select
          value={variant}
          onChange={(e) => changeVariant(e.target.value)}
          className="text-black p-1 rounded"
        >
          {Object.keys(PRESETS).map((k) => (
            <option key={k} value={k}>{k.replace('x', '×')}</option>
          ))}
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={popOut} onChange={togglePop} />
          <span>Pop-out</span>
        </label>
        <select
          value={depth}
          onChange={(e) => setDepth(parseInt(e.target.value))}
          className="text-black p-1 rounded"
        >
          {[2, 4, 6, 8].map((d) => (
            <option key={d} value={d}>{`Depth ${d}`}</option>
          ))}
        </select>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => reset(rows, cols, popOut)}
        >
          Reset
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          disabled={idx === 0}
          onClick={undo}
        >
          Undo
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          disabled={idx >= history.length - 1}
          onClick={redo}
        >
          Redo
        </button>
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={exportReplay}
        >
          Export
        </button>
      </div>
      {winner && (
        <div className="mb-2 capitalize">
          {winner === 'draw' ? 'Draw game' : `${winner} wins!`}
        </div>
      )}
      <div
        className="mb-2 h-4 bg-gray-700 relative"
        style={{ width: `${cols * 2.5}rem` }}
      >
        <div
          className="absolute top-0 bottom-0 left-0 bg-red-500"
          style={{ width: `${evalPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-yellow-400"
          style={{ width: `${100 - evalPercent}%` }}
        />
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}
      >
        {heat.map((h, c) => (
          <div
            key={`heat-${c}`}
            className={`h-4 w-10 ${selCol === c ? 'ring-2 ring-white' : ''}`}
            style={{ backgroundColor: heatColor(h) }}
            onMouseEnter={() => setSelCol(c)}
            onTouchStart={() => setSelCol(c)}
            onClick={() => handleDrop(c)}
          />
        ))}
        {boardArr
          .slice()
          .reverse()
          .map((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`h-10 w-10 bg-blue-700 flex items-center justify-center cursor-pointer ${selCol === cIdx ? 'ring-2 ring-white' : ''}`}
                onMouseEnter={() => setSelCol(cIdx)}
                onTouchStart={() => setSelCol(cIdx)}
                onClick={() => handleDrop(cIdx)}
              >
                {cell && (
                  <div
                    className={`h-8 w-8 rounded-full ${
                      cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                    }`}
                  />
                )}
              </div>
            ))
          )}
        {popOut &&
          Array.from({ length: cols }, (_, c) => (
            <button
              key={`pop-${c}`}
              className="h-6 w-10 bg-gray-600 hover:bg-gray-500 text-xs"
              onClick={() => handlePop(c)}
            >
              Pop
            </button>
          ))}
      </div>
      <div className="mt-2 text-xs">
        Wins: {stats.wins} Losses: {stats.losses} Draws: {stats.draws}
      </div>
    </div>
  );
};

export default ConnectFour;

export { createGame, applyDrop, hasWin, heuristic };

