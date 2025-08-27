import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import {
  HuntTargetAI,
  RandomSalvoAI,
  BOARD_SIZE,
  randomizePlacement,
  optimalPlacement,
} from './battleship/ai';
import GameLayout from './battleship/GameLayout';
import usePersistentState from '../hooks/usePersistentState';
import useGameControls from './useGameControls';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

const CELL = 32; // px

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const Splash = ({ color }) => {
  const prefersReduced = usePrefersReducedMotion();
  if (prefersReduced) return null;
  return (
    <span
      className={`absolute inset-0 rounded-full pointer-events-none ${color}`}
      style={{ animation: 'ping 0.6s cubic-bezier(0,0,0.2,1) forwards', opacity: 0.5 }}
      aria-hidden="true"
    />
  );
};

const HitMarker = () => (
  <div className="absolute inset-0">
    <Splash color="bg-red-500" />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke="red"
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

const MissMarker = () => (
  <div className="absolute inset-0">
    <Splash color="bg-blue-300" />
    <svg
      className="w-full h-full"
      viewBox="0 0 32 32"
      stroke="white"
      strokeWidth="3"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="10" opacity="1" />
    </svg>
  </div>
);

const Battleship = () => {
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]); // player's ship objects
    const [aiHeat, setAiHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
    const [guessHeat, setGuessHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState('easy');
  const [ai, setAi] = useState(null);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const [fog, setFog] = useState(false);
  const shotsPerTurn = salvo ? 3 : 1;
  const [shotsLeft, setShotsLeft] = useState(shotsPerTurn);

  useEffect(() => {
    setShotsLeft(shotsPerTurn);
  }, [salvo, shotsPerTurn]);

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const restart = useCallback(
    (diff = difficulty) => {
      const layout = randomizePlacement();
      const newShips = layout.map((s, i) => ({ ...s, id: i }));
      setShips(newShips);
      setPlayerBoard(placeShips(createBoard(), newShips));
      // Use player's previous guess heat to optimally place enemy ships
      setEnemyBoard(placeShips(createBoard(), optimalPlacement(guessHeat)));
      setPhase('placement');
      setMessage('Place your ships');
      setAiHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      setGuessHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      setAi(diff === 'hard' ? new HuntTargetAI() : new RandomSalvoAI());
      setCursor(0);
      setShotsLeft(salvo ? 3 : 1);
    },
    [difficulty, placeShips, guessHeat, salvo]
  );

  useEffect(() => {
    restart();
  }, [restart]);

  const handleDragStop = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = [];
    for(let k=0;k<ship.len;k++){
      const cx = x + (ship.dir===0? k:0);
      const cy = y + (ship.dir===1? k:0);
      if(cx<0||cy<0||cx>=BOARD_SIZE||cy>=BOARD_SIZE) return; // out
      const idx = cy*BOARD_SIZE+cx;
      // check overlap with other ships
      for(const s of ships){
        if(s.id!==ship.id && s.cells && s.cells.includes(idx)) return;
      }
      cells.push(idx);
    }
    const updated = ships.map(s=>s.id===ship.id?{...s,x,y,cells}:s);
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(), updated));
  };

  const randomize = () => {
    const layout = randomizePlacement();
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
    setMessage('Your turn');
    setShotsLeft(shotsPerTurn);
  };

  // AI fires `shotsPerTurn` times using probability heat map
  const aiTurn = useCallback(() => {
    let shots = shotsPerTurn;
    const takeShot = () => {
      const heat = ai.getHeatMap();
      setAiHeat(heat);
      const move = ai.nextMove();
      if (move == null) return;
      const pb = playerBoard.slice();
      const hit2 = pb[move] === 'ship';
      pb[move] = hit2 ? 'hit' : 'miss';
      setPlayerBoard(pb);
      ai.record(move, hit2);
      if (!pb.includes('ship')) {
        setMessage('AI wins!');
        setPhase('done');
        setStats((s) => ({ ...s, losses: s.losses + 1 }));
        return;
      }
      shots--;
      if (shots > 0) {
        setTimeout(takeShot, 100);
      } else {
        setMessage('Your turn');
        setShotsLeft(shotsPerTurn);
      }
    };
    setTimeout(takeShot, 100);
  }, [ai, playerBoard, setPlayerBoard, setAiHeat, setMessage, setPhase, setStats, shotsPerTurn]);

  const fire = useCallback(
    (idx) => {
      if (phase !== 'battle' || enemyBoard[idx]) return;
      const newBoard = enemyBoard.slice();
      const hit = newBoard[idx] === 'ship';
      newBoard[idx] = hit ? 'hit' : 'miss';
      setEnemyBoard(newBoard);
      setGuessHeat((h) => {
        const nh = h.slice();
        nh[idx]++;
        return nh;
      });
      if (!newBoard.includes('ship')) {
        setMessage('You win!');
        setPhase('done');
        setStats((s) => ({ ...s, wins: s.wins + 1 }));
        return;
      }
      const remaining = shotsLeft - 1;
      if (remaining > 0) {
        setShotsLeft(remaining);
        setMessage(hit ? 'Hit!' : 'Miss!');
      } else {
        setMessage(hit ? 'Hit!' : 'Miss!');
        aiTurn();
      }
    },
    [phase, enemyBoard, shotsLeft, aiTurn, setEnemyBoard, setGuessHeat, setMessage, setPhase, setStats]
  );

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
        fire(cursor);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, cursor, fire]);

  const renderBoard = (board, isEnemy = false, hide = false) => {
    const heatArr = isEnemy ? guessHeat : aiHeat;
    const maxHeat = Math.max(...heatArr);
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL}px)` }}>
        {board.map((cell, idx) => {
          const heatVal = heatArr[idx];
          const intensity = maxHeat ? heatVal / maxHeat : 0;
          const color =
            showHeatmap && heatVal
              ? isEnemy
                ? `rgba(0,150,255,${intensity})`
                : `rgba(255,0,0,${intensity})`
              : 'transparent';
          return (
            <div key={idx} className="border border-ub-dark-grey relative" style={{ width: CELL, height: CELL }}>
              {isEnemy && phase === 'battle' && !['hit', 'miss'].includes(cell) ? (
                <button
                  className="w-full h-full"
                  onClick={() => fire(idx)}
                  aria-label={`fire at ${Math.floor(idx / BOARD_SIZE) + 1},${(idx % BOARD_SIZE) + 1}`}
                />
              ) : null}
              {!hide && cell === 'hit' && <HitMarker />}
              {!hide && cell === 'miss' && <MissMarker />}
              <div className="absolute inset-0" style={{ background: color }} aria-hidden="true" />
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
          onToggleSalvo={() => setSalvo((s) => !s)}
          fog={fog}
          onToggleFog={() => setFog((f) => !f)}
        >
        <div className="mb-2" aria-live="polite" role="status">{message}</div>
        {phase==='placement' && (
          <div className="flex space-x-4">
            <div className="relative border border-ub-dark-grey" style={{width:BOARD_SIZE*CELL,height:BOARD_SIZE*CELL}}>
              {renderBoard(playerBoard)}
              {ships.map((ship,i)=>(
                <Draggable key={ship.id} grid={[CELL,CELL]} position={{x:(ship.x||0)*CELL,y:(ship.y||0)*CELL}}
                  onStop={(e,data)=>handleDragStop(i,e,data)} disabled={phase!=='placement'}>
                  <div className="absolute bg-blue-700 opacity-80" style={{width:(ship.dir===0?ship.len:1)*CELL,height:(ship.dir===1?ship.len:1)*CELL}}/>
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
            <div className="flex space-x-8">
            <div>{renderBoard(playerBoard)}</div>
            <div>{renderBoard(enemyBoard,true,fog)}</div>
          </div>
        )}
      </GameLayout>
    </div>
  );
};

export default Battleship;
