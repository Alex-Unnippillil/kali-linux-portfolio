import React, { useState, useEffect } from 'react';
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
    setTurn(Player.White);
    setTimeout(() => aiMove(nb, newCaps), 0);
  };

  const aiMove = (b: Board, caps: Record<Player, number>) => {
    setHistory((h) => [...h, snapshot()]);
    setFuture([]);
    const start = performance.now();
    const move = iterativeDeepening(b, 3, Player.White, capture, rule);
    const end = performance.now();
    console.log(`Depth-3 time: ${end - start}ms`);
    if (!move) {
      setTurn(Player.Black);
      return;
    }
    const { board: nb, captured } = applyMove(b, move, Player.White, capture);
    const newCaps = { ...caps, [Player.White]: caps[Player.White] + captured / 2 };
    setBoard(nb);
    setCaptures(newCaps);
    if (checkWinFast(nb, move, Player.White) || (capture && newCaps[Player.White] >= 5)) {
      setGameOver(true);
      setWinner(Player.White);
    } else {
      setTurn(Player.Black);
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
    const move = iterativeDeepening(board, 2, turn, capture, rule);
    if (move) setHint(move);
  };

  const renderCell = (x: number, y: number) => {
    const v = board[index(x, y)];
    const isHint = hint && hint.x === x && hint.y === y;
    const coord = `${letters[x]}${y + 1}`;
    return (
      <div
        key={`${x}-${y}`}
        onClick={() => handleClick(x, y)}
        role="button"
        tabIndex={0}
        aria-label={coord}
        className={`w-6 h-6 border border-gray-400 flex items-center justify-center bg-orange-100 ${
          isHint ? 'ring-2 ring-green-500' : ''
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
