import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import GameLayout from './GameLayout';
import { randomizePlacement, randomLayout, RandomSalvoAI } from './ai';
import usePersistentState from '../../hooks/usePersistentState';
import useGameControls from '../useGameControls';

const CELL = 32; // px

const createBoard = (size) => Array(size * size).fill(null);

const HitMarker = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 32 32"
    stroke="red"
    strokeWidth="4"
  >
    <line x1="4" y1="4" x2="28" y2="28">
      <animate
        attributeName="stroke-opacity"
        from="0"
        to="1"
        dur="0.2s"
        fill="freeze"
      />
    </line>
    <line x1="28" y1="4" x2="4" y2="28">
      <animate
        attributeName="stroke-opacity"
        from="0"
        to="1"
        dur="0.2s"
        fill="freeze"
      />
    </line>
  </svg>
);

const MissMarker = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 32 32"
    stroke="white"
    strokeWidth="3"
    fill="none"
  >
    <circle cx="16" cy="16" r="0">
      <animate attributeName="r" from="0" to="10" dur="0.3s" fill="freeze" />
      <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" />
    </circle>
  </svg>
);

class ProbabilisticAI {
  constructor(boardSize) {
    this.boardSize = boardSize;
    this.hits = new Set();
    this.misses = new Set();
  }
  record(idx, hit) {
    (hit ? this.hits : this.misses).add(idx);
  }
  nextMove(simulations = 200) {
    const scores = new Array(this.boardSize * this.boardSize).fill(0);
    for (let s = 0; s < simulations; s++) {
      const layout = randomLayout(this.boardSize, this.hits, this.misses);
      if (!layout) continue;
      const occ = new Set();
      layout.forEach((sh) => sh.cells.forEach((c) => occ.add(c)));
      for (let i = 0; i < scores.length; i++) {
        if (this.hits.has(i) || this.misses.has(i)) continue;
        if (occ.has(i)) scores[i]++;
      }
    }
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < scores.length; i++) {
      if (this.hits.has(i) || this.misses.has(i)) continue;
      if (scores[i] > bestScore) {
        bestScore = scores[i];
        best = i;
      }
    }
    return best >= 0 ? best : null;
  }
}

const Battleship = () => {
  const [boardSize, setBoardSize] = useState(10);
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard(boardSize));
  const [enemyBoard, setEnemyBoard] = useState(createBoard(boardSize));
  const [ships, setShips] = useState([]); // player's ship objects
  const [heat, setHeat] = useState(Array(boardSize * boardSize).fill(0));
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState('easy');
  const [ai, setAi] = useState(null);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [cursor, setCursor] = useState(0);

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const restart = useCallback(
    (diff = difficulty, size = boardSize) => {
      const layout = randomizePlacement(size);
      const newShips = layout.map((s, i) => ({ ...s, id: i }));
      setBoardSize(size);
      setShips(newShips);
      setPlayerBoard(placeShips(createBoard(size), newShips));
      setEnemyBoard(placeShips(createBoard(size), randomizePlacement(size)));
      setPhase('placement');
      setMessage('Place your ships');
      setHeat(Array(size * size).fill(0));
      setAi(diff === 'hard' ? new ProbabilisticAI(size) : new RandomSalvoAI(size));
      setCursor(0);
    },
    [difficulty, boardSize, placeShips]
  );

  useEffect(() => {
    restart();
  }, [restart]);

  const handleDragStop = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = [];
    for (let k = 0; k < ship.len; k++) {
      const cx = x + (ship.dir === 0 ? k : 0);
      const cy = y + (ship.dir === 1 ? k : 0);
      if (cx < 0 || cy < 0 || cx >= boardSize || cy >= boardSize) return; // out
      const idx = cy * boardSize + cx;
      // check overlap with other ships
      for (const s of ships) {
        if (s.id !== ship.id && s.cells && s.cells.includes(idx)) return;
      }
      cells.push(idx);
    }
    const updated = ships.map((s) =>
      s.id === ship.id ? { ...s, x, y, cells } : s
    );
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(boardSize), updated));
  };

  const randomize = () => {
    const layout = randomizePlacement(boardSize);
    const newShips = layout.map((s, i) => ({ ...s, id: i }));
    setShips(newShips);
    setPlayerBoard(placeShips(createBoard(boardSize), newShips));
  };

  const start = () => {
    // ensure all ships placed (cells present)
    if (ships.some((s) => !s.cells)) {
      setMessage('Place all ships');
      return;
    }
    setPhase('battle');
    setMessage('Your turn');
  };

  const fire = useCallback(
    (idx) => {
      if (phase !== 'battle' || enemyBoard[idx]) return;
      const newBoard = enemyBoard.slice();
      const hit = newBoard[idx] === 'ship';
      newBoard[idx] = hit ? 'hit' : 'miss';
      setEnemyBoard(newBoard);
      if (!newBoard.includes('ship')) {
        setMessage('You win!');
        setPhase('done');
        setStats((s) => {
          const curr = s.currentStreak + 1;
          return {
            ...s,
            wins: s.wins + 1,
            currentStreak: curr,
            bestStreak: Math.max(s.bestStreak, curr),
          };
        });
        return;
      }
      // AI turn
      setTimeout(() => {
        const move = ai.nextMove();
        if (move == null) return;
        const pb = playerBoard.slice();
        const hit2 = pb[move] === 'ship';
        pb[move] = hit2 ? 'hit' : 'miss';
        setPlayerBoard(pb);
        const nh = heat.slice();
        nh[move]++;
        setHeat(nh);
        ai.record(move, hit2);
        if (!pb.includes('ship')) {
          setMessage('AI wins!');
          setPhase('done');
          setStats((s) => ({
            ...s,
            losses: s.losses + 1,
            currentStreak: 0,
          }));
        } else setMessage(hit ? 'Hit!' : 'Miss!');
      }, 100); // simulate thinking
    },
    [ai, enemyBoard, heat, phase, playerBoard, setEnemyBoard, setPlayerBoard, setHeat, setMessage, setPhase, setStats]
  );

  useGameControls(({ x, y }) => {
    if (phase !== 'battle') return;
    setCursor((c) => {
      const cx = (c % boardSize) + x;
      const cy = Math.floor(c / boardSize) + y;
      if (cx < 0 || cy < 0 || cx >= boardSize || cy >= boardSize) return c;
      return cy * boardSize + cx;
    });
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'battle') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fire(cursor);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, cursor, fire]);

  const renderBoard = (board, isEnemy = false) => (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${boardSize}, ${CELL}px)` }}>
      {board.map((cell, idx) => {
        const heatVal = heat[idx];
        const color = heatVal
          ? `rgba(255,0,0,${Math.min(heatVal / 5, 0.5)})`
          : 'transparent';
        return (
          <div key={idx} className="border border-ub-dark-grey relative" style={{ width: CELL, height: CELL }}>
            {isEnemy && phase === 'battle' && !['hit', 'miss'].includes(cell) ? (
              <button className="w-full h-full" onClick={() => fire(idx)} />
            ) : null}
            {cell === 'hit' && <HitMarker />}
            {cell === 'miss' && <MissMarker />}
            {!isEnemy && <div className="absolute inset-0" style={{ background: color }} />}
            {isEnemy && phase === 'battle' && idx === cursor && (
              <div className="absolute inset-0 border-2 border-yellow-300 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto font-ubu">
      <GameLayout
        difficulty={difficulty}
        onDifficultyChange={(d) => {
          setDifficulty(d);
          restart(d);
        }}
        onRestart={() => restart()}
        stats={stats}
      >
        <div className="mb-2">{message}</div>
        {phase === 'placement' && (
          <div className="flex space-x-4">
            <div className="relative border border-ub-dark-grey" style={{ width: boardSize * CELL, height: boardSize * CELL }}>
              {renderBoard(playerBoard)}
              {ships.map((ship, i) => (
                <Draggable
                  key={ship.id}
                  grid={[CELL, CELL]}
                  position={{ x: (ship.x || 0) * CELL, y: (ship.y || 0) * CELL }}
                  onStop={(e, data) => handleDragStop(i, e, data)}
                  disabled={phase !== 'placement'}
                >
                  <div
                    className="absolute bg-blue-700 opacity-80"
                    style={{
                      width: (ship.dir === 0 ? ship.len : 1) * CELL,
                      height: (ship.dir === 1 ? ship.len : 1) * CELL,
                    }}
                  />
                </Draggable>
              ))}
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm">
                Size:
                <select
                  className="ml-1 bg-gray-700 text-white p-1"
                  value={boardSize}
                  onChange={(e) => restart(difficulty, parseInt(e.target.value, 10))}
                >
                  {[6, 8, 10].map((s) => (
                    <option key={s} value={s}>{`${s}x${s}`}</option>
                  ))}
                </select>
              </label>
              <button className="px-2 py-1 bg-gray-700" onClick={randomize}>Randomize</button>
              <button className="px-2 py-1 bg-gray-700" onClick={start}>Start</button>
            </div>
          </div>
        )}
        {phase !== 'placement' && (
          <div className="flex space-x-8">
            <div>{renderBoard(playerBoard)}</div>
            <div>{renderBoard(enemyBoard, true)}</div>
          </div>
        )}
      </GameLayout>
    </div>
  );
};

export default Battleship;

// Export AI for testing
export { ProbabilisticAI };

