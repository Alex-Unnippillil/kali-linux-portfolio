import React, { useState, useEffect, useRef } from 'react';
import {
  createBoard,
  Player,
  index,
  applyMove,
  checkWinFast,
  iterativeDeepening,
  SIZE,
  Board,
  OpeningRule,
  Move,
} from './engine';

interface GameSnapshot {
  board: Board;
  turn: Player;
  captures: Record<Player, number>;
  gameOver: boolean;
  winner: Player | null;
}

const Gomoku: React.FC = () => {
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<Player>(Player.Black);
  const [capture, setCapture] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [captures, setCaptures] = useState<Record<Player, number>>({
    [Player.Black]: 0,
    [Player.White]: 0,
  });
  const [rule, setRule] = useState<OpeningRule>(OpeningRule.FreeStyle);
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [future, setFuture] = useState<GameSnapshot[]>([]);
  const [hint, setHint] = useState<Move | null>(null);
  const [online, setOnline] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const [difficulty, setDifficulty] = useState(2);
  const [threats, setThreats] = useState<Record<number, number>>({});
  const depthMap: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

  const letters = Array.from({ length: SIZE }, (_, i) => String.fromCharCode(65 + i));

  const snapshot = (): GameSnapshot => ({
    board,
    turn,
    captures: { ...captures },
    gameOver,
    winner,
  });

  const restore = (s: GameSnapshot) => {
    setBoard(s.board);
    setTurn(s.turn);
    setCaptures(s.captures);
    setGameOver(s.gameOver);
    setWinner(s.winner);
  };

  useEffect(() => {
    const data = localStorage.getItem('gomoku-save');
    if (data) {
      const parsed = JSON.parse(data);
      setBoard(Int8Array.from(parsed.board));
      setTurn(parsed.turn);
      setCaptures(parsed.captures);
      setGameOver(parsed.gameOver);
      setWinner(parsed.winner);
    }
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const data = {
      board: Array.from(board),
      turn,
      captures,
      gameOver,
      winner,
    };
    localStorage.setItem('gomoku-save', JSON.stringify(data));
  }, [board, turn, captures, gameOver, winner]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const mod = await import('./ai');
      if (!mounted) return;
      workerRef.current = mod.createAIWorker();
    };
    init();
    return () => {
      mounted = false;
      workerRef.current?.terminate();
    };
  }, []);

  const inBounds = (x: number, y: number) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

  const computeThreats = (b: Board) => {
    const map: Record<number, number> = {};
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const p = b[index(x, y)];
        if (p === 0) continue;
        for (const [dx, dy] of dirs) {
          let count = 1;
          const cells = [{ x, y }];
          let cx = x + dx;
          let cy = y + dy;
          while (inBounds(cx, cy) && b[index(cx, cy)] === p) {
            cells.push({ x: cx, y: cy });
            count += 1;
            cx += dx;
            cy += dy;
          }
          cx = x - dx;
          cy = y - dy;
          while (inBounds(cx, cy) && b[index(cx, cy)] === p) {
            cells.push({ x: cx, y: cy });
            count += 1;
            cx -= dx;
            cy -= dy;
          }
          if (count >= 3) {
            const level = Math.min(count, 5);
            for (const c of cells) {
              const idx = index(c.x, c.y);
              map[idx] = Math.max(map[idx] || 0, level);
            }
          }
        }
      }
    }
    return map;
  };

  useEffect(() => {
    setThreats(computeThreats(board));
  }, [board]);

  const reset = () => {
    setBoard(createBoard());
    setTurn(Player.Black);
    setGameOver(false);
    setWinner(null);
    setCaptures({ [Player.Black]: 0, [Player.White]: 0 });
    setHistory([]);
    setFuture([]);
    setHint(null);
  };

  const handleClick = (x: number, y: number) => {
    if (gameOver || board[index(x, y)] !== 0 || turn !== Player.Black) return;
    const center = Math.floor(SIZE / 2);
    const stones = board.reduce((a, b) => a + (b === 0 ? 0 : 1), 0);
    if (rule === OpeningRule.Standard) {
      if (stones === 0 && (x !== center || y !== center)) return;
      if (stones === 1) {
        const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
        if (dist < 3) return;
      }
    }
    setHistory((h) => [...h, snapshot()]);
    setFuture([]);
    setHint(null);
    const { board: nb, captured } = applyMove(board, { x, y }, Player.Black, capture);
    const newCaps = { ...captures, [Player.Black]: captures[Player.Black] + captured / 2 };
    setBoard(nb);
    setCaptures(newCaps);
    if (checkWinFast(nb, { x, y }, Player.Black) || (capture && newCaps[Player.Black] >= 5)) {
      setGameOver(true);
      setWinner(Player.Black);
      return;
    }
    const snap: GameSnapshot = {
      board: nb,
      turn: Player.White,
      captures: newCaps,
      gameOver: false,
      winner: null,
    };
    setHistory((h) => [...h, snap]);
    setTurn(Player.White);
    const worker = workerRef.current;
    if (worker) {
      worker.onmessage = (e: MessageEvent<Move | null>) => {
        const move = e.data;
        if (!move) {
          setTurn(Player.Black);
          return;
        }
        const { board: nb2, captured: cap2 } = applyMove(nb, move, Player.White, capture);
        const newCaps2 = {
          ...newCaps,
          [Player.White]: newCaps[Player.White] + cap2 / 2,
        };
        setBoard(nb2);
        setCaptures(newCaps2);
        if (checkWinFast(nb2, move, Player.White) || (capture && newCaps2[Player.White] >= 5)) {
          setGameOver(true);
          setWinner(Player.White);
        } else {
          setTurn(Player.Black);
        }
      };
      worker.postMessage({
        board: nb,
        player: Player.White,
        maxDepth: depthMap[difficulty],
        capture,
        rule,
      });
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setFuture([snapshot(), ...future]);
    restore(last);
    setHint(null);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setHistory([...history, snapshot()]);
    restore(next);
    setHint(null);
  };

  const hintMove = () => {
    const move = iterativeDeepening(board, depthMap[difficulty], turn, capture, rule);
    if (move) setHint(move);
  };

  const renderCell = (x: number, y: number) => {
    const v = board[index(x, y)];
    const isHint = hint && hint.x === x && hint.y === y;
    const threatLevel = threats[index(x, y)];
    const coord = `${letters[x]}${y + 1}`;
    const threatClass =
      threatLevel === 5
        ? 'ring-2 ring-red-500'
        : threatLevel === 4
        ? 'ring-2 ring-orange-500'
        : threatLevel === 3
        ? 'ring-2 ring-yellow-500'
        : '';
    return (
      <div
        key={`${x}-${y}`}
        onClick={() => handleClick(x, y)}
        role="button"
        tabIndex={0}
        aria-label={coord}
        className={`w-6 h-6 border border-gray-400 flex items-center justify-center bg-orange-100 ${
          isHint ? 'ring-2 ring-green-500' : threatClass
        }`}
      >
        {v === Player.Black && <div className="w-4 h-4 rounded-full bg-black" />}
        {v === Player.White && <div className="w-4 h-4 rounded-full bg-white" />}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex flex-wrap space-x-2 items-center">
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={capture}
            onChange={(e) => setCapture(e.target.checked)}
          />
          <span>Captures</span>
        </label>
        <label className="flex items-center space-x-1">
          <span>Rule</span>
          <select
            value={rule}
            onChange={(e) => setRule(e.target.value as OpeningRule)}
            className="border p-1 text-sm"
          >
            <option value={OpeningRule.FreeStyle}>Freestyle</option>
            <option value={OpeningRule.Standard}>Standard</option>
          </select>
        </label>
        <label className="flex items-center space-x-1">
          <span>Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="border p-1 text-sm"
          >
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        </label>
        <div>B:{captures[Player.Black]} W:{captures[Player.White]}</div>
        <button type="button" onClick={undo} className="px-2 py-1 bg-gray-300 rounded">
          Undo
        </button>
        <button type="button" onClick={redo} className="px-2 py-1 bg-gray-300 rounded">
          Redo
        </button>
        <button type="button" onClick={hintMove} className="px-2 py-1 bg-gray-300 rounded">
          Hint
        </button>
        <button type="button" onClick={reset} className="px-2 py-1 bg-gray-300 rounded">
          Reset
        </button>
        <span className="text-xs">{online ? 'Online' : 'Offline'}</span>
      </div>
      <div className="inline-block">
        <div
          className="grid"
          style={{ gridTemplateColumns: `20px repeat(${SIZE},1fr)` }}
        >
          <div />
          {letters.map((l) => (
            <div key={`top-${l}`} className="text-xs text-center">
              {l}
            </div>
          ))}
          {Array.from({ length: SIZE }).map((_, y) => (
            <React.Fragment key={`row-${y}`}>
              <div className="text-xs text-right pr-1">{y + 1}</div>
              {Array.from({ length: SIZE }).map((__, x) => renderCell(x, y))}
            </React.Fragment>
          ))}
        </div>
      </div>
      {gameOver && (
        <div>{winner === Player.Black ? 'You win!' : 'AI wins'}</div>
      )}
    </div>
  );
};

export default Gomoku;
