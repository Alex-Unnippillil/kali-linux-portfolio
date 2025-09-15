import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import {
  MonteCarloAI,
  RandomSalvoAI,
  RandomAI,
  BOARD_SIZE,
  randomizePlacement,
} from '../../apps/games/battleship/ai';
import { fireShots } from '../../apps/games/battleship/logic';
import GameLayout from './battleship/GameLayout';
import usePersistentState from '../../hooks/usePersistentState';
import useGameControls from './useGameControls';
import useMotionPolicy from '../../hooks/motionPolicy';

const CELL = 32; // px

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const Splash = ({ color }) => {
  const prefersReduced = useMotionPolicy();
  if (prefersReduced) return null;
  return (
    <span
      className={`absolute inset-0 rounded-full pointer-events-none ${color}`}
      style={{ animation: 'ping 0.6s cubic-bezier(0,0,0.2,1) forwards', opacity: 0.5 }}
      aria-hidden="true"
    />
  );
};

const HitMarker = ({ colorblind }) => (
  <div className="absolute inset-0">
    <Splash color={colorblind ? 'bg-blue-500' : 'bg-red-500'} />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'blue' : 'red'}
      strokeWidth="4"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="28" y2="28">
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </line>
      <line x1="28" y1="4" x2="4" y2="28">
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </line>
    </svg>
  </div>
);

const MissMarker = ({ colorblind }) => (
  <div className="absolute inset-0">
    <Splash color={colorblind ? 'bg-orange-400' : 'bg-blue-300'} />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke={colorblind ? 'orange' : 'white'}
      strokeWidth="3"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="10" opacity="1">
        <animate attributeName="r" from="0" to="10" dur="0.2s" fill="freeze" />
        <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
      </circle>
    </svg>
  </div>
);

const Battleship = () => {
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]); // player's ship objects
  const [enemyShips, setEnemyShips] = useState([]);
  const [aiHeat, setAiHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [guessHeat, setGuessHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState('easy');
  const [ai, setAi] = useState(null);
  const [playerAi, setPlayerAi] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const [fog, setFog] = useState(false);
  const [playerShots, setPlayerShots] = useState(1);
  const [aiShots, setAiShots] = useState(1);
  const [selected, setSelected] = useState([]);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [colorblind, setColorblind] = usePersistentState(
    'battleship-colorblind',
    false,
  );
  const [dragHint, setDragHint] = useState(null);

  const tryPlace = (shipId, x, y, dir) => {
    const ship = ships.find((s) => s.id === shipId);
    const cells = [];
    // collect all proposed cells and ensure they are inside the board
    for (let k = 0; k < ship.len; k++) {
      const cx = x + (dir === 0 ? k : 0);
      const cy = y + (dir === 1 ? k : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return null;
      const idx = cy * BOARD_SIZE + cx;
      // disallow overlap with existing ships
      for (const s of ships) {
        if (s.id !== shipId && s.cells && s.cells.includes(idx)) return null;
      }
      cells.push(idx);
    }
    // ensure no ship is adjacent (including diagonals) to existing ships
    for (const idx of cells) {
      const cx = idx % BOARD_SIZE;
      const cy = Math.floor(idx / BOARD_SIZE);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= BOARD_SIZE || ny >= BOARD_SIZE) continue;
          const nIdx = ny * BOARD_SIZE + nx;
          for (const s of ships) {
            if (s.id !== shipId && s.cells && s.cells.includes(nIdx)) return null;
          }
        }
      }
    }
    return cells;
  };

  const getDragCells = (ship, x, y) => {
    const cells = [];
    for (let k = 0; k < ship.len; k++) {
      const cx = x + (ship.dir === 0 ? k : 0);
      const cy = y + (ship.dir === 1 ? k : 0);
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) continue;
      cells.push(cy * BOARD_SIZE + cx);
    }
    return cells;
  };

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const countRemaining = useCallback(
    (board, layout) =>
      layout.filter((sh) => sh.cells.some((c) => board[c] === 'ship')).length,
    [],
  );

  const restart = useCallback(
    (diff = difficulty) => {
      const layout = randomizePlacement(true);
      const newShips = layout.map((s, i) => ({ ...s, id: i }));
      const enemyLayout = randomizePlacement(true);
      setShips(newShips);
      setEnemyShips(enemyLayout);
      setPlayerBoard(placeShips(createBoard(), newShips));
      setEnemyBoard(placeShips(createBoard(), enemyLayout));
      setPhase('placement');
      setMessage('Place your ships');
      let aiInstance;
      if (diff === 'hard') aiInstance = new MonteCarloAI();
      else if (diff === 'medium') aiInstance = new RandomSalvoAI();
      else aiInstance = new RandomAI();
      setAi(aiInstance);
      if (typeof aiInstance.getHeatmap === 'function') {
        aiInstance.nextMove();
        setAiHeat(aiInstance.getHeatmap().slice());
      } else {
        setAiHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      }
      const playerAiInstance = new MonteCarloAI();
      playerAiInstance.nextMove();
      setPlayerAi(playerAiInstance);
      setGuessHeat(playerAiInstance.getHeatmap().slice());
      setCursor(0);
      setSelected([]);
      setDragHint(null);
      const pShots = salvo ? newShips.length : 1;
      const aShots = salvo ? enemyLayout.length : 1;
      setPlayerShots(pShots);
      setAiShots(aShots);
    },
    [difficulty, placeShips, salvo]
  );

  useEffect(() => {
    restart();
  }, [restart]);

  const handleDrag = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = tryPlace(ship.id, x, y, ship.dir);
    if (cells) setDragHint({ cells, valid: true });
    else setDragHint({ cells: getDragCells(ship, x, y), valid: false });
  };

  const handleDragStop = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = tryPlace(ship.id, x, y, ship.dir);
    if (cells) {
      const updated = ships.map((s) =>
        s.id === ship.id ? { ...s, x, y, cells } : s
      );
      setShips(updated);
      setPlayerBoard(placeShips(createBoard(), updated));
    }
    setDragHint(null);
  };

  const rotateShip = (id) => {
    const ship = ships.find((s) => s.id === id);
    const newDir = ship.dir === 0 ? 1 : 0;
    const x = ship.x || 0;
    const y = ship.y || 0;
    const cells = tryPlace(id, x, y, newDir);
    if (!cells) return;
    const updated = ships.map((s) =>
      s.id === id ? { ...s, dir: newDir, cells } : s
    );
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(), updated));
  };

  const randomize = () => {
    const layout = randomizePlacement(true);
    const newShips = layout.map((s, i) => ({ ...s, id: i }));
    setShips(newShips);
    setPlayerBoard(placeShips(createBoard(), newShips));
  };

  const start = () => {
    // ensure all ships placed (cells present)
    if(ships.some(s=>!s.cells)){
      setMessage('Place all ships');
      return;
    }
    setPhase('battle');
    if (salvo) {
      setPlayerShots(countRemaining(playerBoard, ships));
      setAiShots(countRemaining(enemyBoard, enemyShips));
    }
    setMessage('Your turn');
  };

  const aiTurn = useCallback(
    (shots, playerHit) => {
      let pb = playerBoard.slice();
      let heat = aiHeat.slice();
      for (let s = 0; s < shots; s++) {
        const move = ai.nextMove();
        if (move == null) break;
        if (typeof ai.getHeatmap === 'function') {
          heat = ai.getHeatmap().slice();
        } else {
          heat[move]++;
        }
        const hit2 = pb[move] === 'ship';
        pb[move] = hit2 ? 'hit' : 'miss';
        ai.record(move, hit2);
        if (!pb.includes('ship')) {
          setPlayerBoard(pb);
          setAiHeat(heat);
          setMessage('AI wins!');
          setPhase('done');
          setStats((st) => ({ ...st, losses: st.losses + 1 }));
          return;
        }
      }
      if (typeof ai.getHeatmap === 'function') {
        ai.nextMove();
        heat = ai.getHeatmap().slice();
      }
      setPlayerBoard(pb);
      setAiHeat(heat);
      if (salvo) {
        setAiShots(countRemaining(enemyBoard, enemyShips));
        setPlayerShots(countRemaining(pb, ships));
      }
      setMessage(playerHit ? 'Hit!' : 'Miss!');
    },
    [ai, aiHeat, playerBoard, salvo, enemyBoard, enemyShips, countRemaining, ships, setPlayerBoard, setAiHeat, setMessage, setPhase, setStats]
  );

  const toggleSelect = useCallback(
    (idx) => {
      if (phase !== 'battle' || enemyBoard[idx]) return;
      setSelected((sel) => {
        if (sel.includes(idx)) return sel.filter((s) => s !== idx);
        if (sel.length >= playerShots) return sel;
        return [...sel, idx];
      });
    },
    [phase, enemyBoard, playerShots],
  );

  const fireSelected = useCallback(() => {
    if (phase !== 'battle' || !selected.length) return;
    const hit = selected.some((i) => enemyBoard[i] === 'ship');
    const { board: newBoard } = fireShots(enemyBoard, selected);
    setEnemyBoard(newBoard);
    if (playerAi) {
      selected.forEach((idx) => {
        const wasHit = enemyBoard[idx] === 'ship';
        playerAi.record(idx, wasHit);
      });
      playerAi.nextMove();
      setGuessHeat(playerAi.getHeatmap().slice());
    }
    setSelected([]);
    setPlayerShots(0);
    if (!newBoard.includes('ship')) {
      setMessage('You win!');
      setPhase('done');
      setStats((s) => ({ ...s, wins: s.wins + 1 }));
      return;
    }
    const aiCount = salvo ? aiShots : 1;
    setTimeout(() => aiTurn(aiCount, hit), 100);
  }, [phase, selected, enemyBoard, playerAi, setGuessHeat, salvo, aiShots, aiTurn, setEnemyBoard, setPlayerShots, setMessage, setPhase, setStats]);

  useGameControls(({ x, y }) => {
    if (phase !== 'battle') return;
    setCursor((c) => {
      const cx = (c % BOARD_SIZE) + x;
      const cy = Math.floor(c / BOARD_SIZE) + y;
      if (cx < 0 || cy < 0 || cx >= BOARD_SIZE || cy >= BOARD_SIZE) return c;
      return cy * BOARD_SIZE + cx;
    });
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'battle') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSelect(cursor);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fireSelected();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, cursor, toggleSelect, fireSelected]);

  const renderBoard = (board, opts = {}) => {
    const { isEnemy = false, hideInfo = false } = opts;
    const heatArr = isEnemy ? guessHeat : aiHeat;
    const maxHeat = Math.max(...heatArr);
    return (
      <div
        className="grid relative"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL}px)`,
          background: 'linear-gradient(to bottom, #0e7490, #022c5a)',
        }}
      >
        {board.map((cell, idx) => {
          const heatVal = heatArr[idx];
          const norm = maxHeat ? heatVal / maxHeat : 0;
          const color = showHeatmap && heatVal
            ? isEnemy
              ? `rgba(0,150,255,${norm * 0.6})`
              : `rgba(255,0,0,${norm * 0.7})`
            : 'transparent';
          const selectedMark = isEnemy && phase === 'battle' && selected.includes(idx);
          const hint =
            !isEnemy && phase === 'placement' && dragHint && dragHint.cells.includes(idx);
          return (
            <div
              key={idx}
              className="border border-ub-dark-grey relative"
              style={{ width: CELL, height: CELL }}
            >
              {isEnemy && phase === 'battle' && !['hit', 'miss'].includes(cell) ? (
                <button
                  className="w-full h-full"
                  onClick={() => toggleSelect(idx)}
                  aria-label={`select target at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                />
              ) : null}
              {cell === 'hit' && !hideInfo && <HitMarker colorblind={colorblind} />}
              {cell === 'miss' && !hideInfo && <MissMarker colorblind={colorblind} />}
              <div className="absolute inset-0" style={{ background: color }} aria-hidden="true" />
              {hint && (
                <div
                  className={`absolute inset-0 pointer-events-none ${
                    dragHint.valid ? 'bg-green-400' : 'bg-red-500'
                  } opacity-40`}
                />
              )}
              {selectedMark && (
                <div className="absolute inset-0 bg-yellow-300 opacity-50 pointer-events-none" />
              )}
              {hideInfo && phase === 'battle' && (
                <div className="absolute inset-0 bg-gray-800" aria-hidden="true" />
              )}
              {isEnemy && phase === 'battle' && idx === cursor && (
                <div className="absolute inset-0 border-2 border-yellow-300 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white p-4 overflow-auto font-ubuntu">
        <GameLayout
          difficulty={difficulty}
          onDifficultyChange={(d) => {
            setDifficulty(d);
            restart(d);
          }}
          onRestart={() => restart()}
          stats={stats}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap((h) => !h)}
          salvo={salvo}
          onSalvoChange={(v) => {
            setSalvo(v);
            restart(difficulty);
          }}
          fog={fog}
          onFogChange={(v) => setFog(v)}
          colorblind={colorblind}
          onColorblindChange={(v) => setColorblind(v)}
        >
        <div className="mb-2" aria-live="polite" role="status">{message}</div>
        {phase==='done' && (
          <button className="px-2 py-1 bg-gray-700 mb-2" onClick={() => restart()}>
            Play Again
          </button>
        )}
        {phase==='placement' && (
          <div className="flex space-x-4">
            <div className="relative border border-ub-dark-grey" style={{width:BOARD_SIZE*CELL,height:BOARD_SIZE*CELL}}>
              {renderBoard(playerBoard)}
                {ships.map((ship,i)=>(
                  <Draggable
                    key={ship.id}
                    grid={[CELL,CELL]}
                    position={{x:(ship.x||0)*CELL,y:(ship.y||0)*CELL}}
                    onStart={(e,data)=>handleDrag(i,e,data)}
                    onDrag={(e,data)=>handleDrag(i,e,data)}
                    onStop={(e,data)=>handleDragStop(i,e,data)}
                    disabled={phase!=='placement'}
                  >
                    <div
                      className="absolute bg-blue-700 opacity-80"
                      style={{width:(ship.dir===0?ship.len:1)*CELL,height:(ship.dir===1?ship.len:1)*CELL}}
                      onDoubleClick={()=>rotateShip(ship.id)}
                    />
                  </Draggable>
                ))}
            </div>
            <div className="flex flex-col space-y-2">
              <button className="px-2 py-1 bg-gray-700" onClick={randomize}>Randomize</button>
              <button className="px-2 py-1 bg-gray-700" onClick={start}>Start</button>
            </div>
          </div>
        )}
        {phase!=='placement' && (
          <div className="flex flex-col items-center">
            <div className="flex space-x-8">
              <div>{renderBoard(playerBoard, { hideInfo: fog && phase==='battle' })}</div>
              <div>{renderBoard(enemyBoard, { isEnemy: true })}</div>
            </div>
            {phase==='battle' && (
              <div className="mt-2 flex flex-col items-center">
                <div className="mb-1">
                  Selected {selected.length}/{playerShots}
                </div>
                <button
                  className="px-2 py-1 bg-gray-700 disabled:opacity-50"
                  onClick={fireSelected}
                  disabled={!selected.length}
                >
                  Fire
                </button>
              </div>
            )}
          </div>
        )}
      </GameLayout>
    </div>
  );
};

export default Battleship;
