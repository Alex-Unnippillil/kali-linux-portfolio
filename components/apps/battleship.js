import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import {
  MonteCarloAI,
  HuntTargetAI,
  BOARD_SIZE,
  randomizePlacement,
} from './battleship/ai';
import GameLayout from './battleship/GameLayout';
import { canPlaceShip, isGameOver } from './battleship/utils';
import usePersistentState from '../hooks/usePersistentState';
import useGameControls from './useGameControls';

const CELL = 32; // px

const createBoard = () => Array(BOARD_SIZE * BOARD_SIZE).fill(null);

const HitMarker = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 32 32"
    stroke="red"
    strokeWidth="4"
  >
    <line x1="4" y1="4" x2="28" y2="28">
      <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
    </line>
    <line x1="28" y1="4" x2="4" y2="28">
      <animate attributeName="stroke-opacity" from="0" to="1" dur="0.2s" fill="freeze" />
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

const Battleship = () => {
  const [phase, setPhase] = useState('placement');
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());
  const [ships, setShips] = useState([]);
  const [heat, setHeat] = useState(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [message, setMessage] = useState('Place your ships');
  const [difficulty, setDifficulty] = useState('easy');
  const [mode, setMode] = useState('ai');
  const [ai, setAi] = useState(null);
  const [stats, setStats] = usePersistentState('battleship-stats', {
    wins: 0,
    losses: 0,
  });
  const [cursor, setCursor] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const [placing, setPlacing] = useState(0);
  const [boards, setBoards] = useState([createBoard(), createBoard()]);
  const [fleets, setFleets] = useState([[], []]);
  const [turn, setTurn] = useState(0);

  const placeShips = useCallback((board, layout) => {
    const newBoard = board.slice();
    layout.forEach((ship) => ship.cells.forEach((c) => (newBoard[c] = 'ship')));
    return newBoard;
  }, []);

  const restart = useCallback(
    (diff = difficulty, m = mode) => {
      const layout = randomizePlacement();
      const newShips = layout.map((s, i) => ({ ...s, id: i }));
      const pb = placeShips(createBoard(), newShips);
      setShips(newShips);
      setPlayerBoard(pb);
      if (m === 'ai') {
        setEnemyBoard(placeShips(createBoard(), randomizePlacement()));
        setAi(diff === 'hard' ? new MonteCarloAI() : new HuntTargetAI());
      } else {
        setEnemyBoard(createBoard());
        setAi(null);
      }
      setBoards([pb, createBoard()]);
      setFleets([newShips, []]);
      setPhase('placement');
      setMessage('Place your ships');
      setHeat(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
      setCursor(0);
      setPlacing(0);
      setTurn(0);
      setMode(m);
      setPrivacy(false);
    },
    [difficulty, mode, placeShips]
  );

  useEffect(() => {
    restart();
  }, [restart]);

  const handleDragStop = (i, e, data) => {
    const x = Math.round(data.x / CELL);
    const y = Math.round(data.y / CELL);
    const ship = ships[i];
    const cells = canPlaceShip(ships, x, y, ship.dir, ship.len, ship.id);
    if (!cells) return;
    const updated = ships.map((s) => (s.id === ship.id ? { ...s, x, y, cells } : s));
    setShips(updated);
    setPlayerBoard(placeShips(createBoard(), updated));
  };

  const handleRotate = (i) => {
    if (phase !== 'placement') return;
    const ship = ships[i];
    const x = ship.x || 0;
    const y = ship.y || 0;
    const newDir = ship.dir === 0 ? 1 : 0;
    const cells = canPlaceShip(ships, x, y, newDir, ship.len, ship.id);
    if (!cells) return;
    const updated = ships.map((s) => (s.id === ship.id ? { ...s, dir: newDir, cells } : s));
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
    if (ships.some((s) => !s.cells)) {
      setMessage('Place all ships');
      return;
    }
    if (mode === 'hotseat') {
      if (placing === 0) {
        const newBoards = boards.slice();
        const newFleets = fleets.slice();
        newBoards[0] = playerBoard;
        newFleets[0] = ships;
        setBoards(newBoards);
        setFleets(newFleets);
        setShips([]);
        setPlayerBoard(createBoard());
        setPlacing(1);
        setMessage('Player 2: Place your ships');
        setPrivacy(true);
        return;
      } else {
        const newBoards = boards.slice();
        const newFleets = fleets.slice();
        newBoards[1] = playerBoard;
        newFleets[1] = ships;
        setBoards(newBoards);
        setFleets(newFleets);
        setPlayerBoard(newBoards[0]);
        setEnemyBoard(newBoards[1]);
        setShips(newFleets[0]);
        setPhase('battle');
        setMessage('Player 1 turn');
        setTurn(0);
        setPrivacy(true);
        return;
      }
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
      if (isGameOver(newBoard)) {
        setMessage(mode === 'ai' ? 'You win!' : `Player ${turn + 1} wins!`);
        setPhase('done');
        if (mode === 'ai') {
          setStats((s) => ({ ...s, wins: s.wins + 1 }));
        }
        return;
      }
      setTimeout(() => {
        if (mode === 'ai') {
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
          if (isGameOver(pb)) {
            setMessage('AI wins!');
            setPhase('done');
            setStats((s) => ({ ...s, losses: s.losses + 1 }));
          } else setMessage(hit ? 'Hit!' : 'Miss!');
        } else {
          const turnPlayer = 1 - turn;
          const boardsCopy = boards.slice();
          const myBoard = boardsCopy[turnPlayer].slice();
          const move = cursor; // use cursor as firing position for simplicity
          if (myBoard[move]) return;
          const h = myBoard[move] === 'ship';
          myBoard[move] = h ? 'hit' : 'miss';
          boardsCopy[turnPlayer] = myBoard;
          setBoards(boardsCopy);
          setPlayerBoard(myBoard);
          if (isGameOver(myBoard)) {
            setMessage(`Player ${turnPlayer + 1} wins!`);
            setPhase('done');
          } else {
            setTurn(turnPlayer);
            setPlayerBoard(boardsCopy[turnPlayer]);
            setEnemyBoard(boardsCopy[1 - turnPlayer]);
            setPrivacy(true);
            setMessage(`Player ${turnPlayer + 1} turn`);
          }
        }
      }, 100);
    },
    [ai, enemyBoard, heat, mode, phase, playerBoard, boards, cursor, turn, setStats]
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

  const renderBoard = (board, isEnemy = false) => (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL}px)` }}>
      {board.map((cell, idx) => {
        const heatVal = heat[idx];
        const color = heatVal ? `rgba(255,0,0,${Math.min(heatVal / 5, 0.5)})` : 'transparent';
        return (
          <div
            key={idx}
            onClick={() => (!isEnemy && phase === 'battle' ? setCursor(idx) : null)}
            className={`w-${CELL} h-${CELL} border border-ub-dark-grey relative`}
            style={{ backgroundColor: color }}
          >
            {cell === 'hit' && <HitMarker />}
            {cell === 'miss' && <MissMarker />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      <GameLayout
        difficulty={difficulty}
        onDifficultyChange={(d) => {
          setDifficulty(d);
          restart(d);
        }}
        mode={mode}
        onModeChange={(m) => restart(difficulty, m)}
        onRestart={() => restart()}
        stats={mode === 'ai' ? stats : null}
      >
        <div className="mb-2">{message}</div>
        {phase === 'placement' && (
          <div className="flex space-x-4">
            <div className="relative border border-ub-dark-grey" style={{ width: BOARD_SIZE * CELL, height: BOARD_SIZE * CELL }}>
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
                    onDoubleClick={() => handleRotate(i)}
                    className="absolute bg-blue-700 opacity-80"
                    style={{ width: (ship.dir === 0 ? ship.len : 1) * CELL, height: (ship.dir === 1 ? ship.len : 1) * CELL }}
                  />
                </Draggable>
              ))}
            </div>
            <div className="flex flex-col space-y-2">
              <button className="px-2 py-1 bg-gray-700" onClick={randomize}>
                Randomize
              </button>
              <button className="px-2 py-1 bg-gray-700" onClick={start}>
                Start
              </button>
            </div>
          </div>
        )}
        {phase !== 'placement' && (
          <div className="flex space-x-8">
            <div>{renderBoard(playerBoard)}</div>
            <div>{renderBoard(enemyBoard, true)}</div>
          </div>
        )}
        {privacy && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
            <button className="px-4 py-2 bg-gray-700" onClick={() => setPrivacy(false)}>
              Continue
            </button>
          </div>
        )}
      </GameLayout>
    </div>
  );
};

export default Battleship;
