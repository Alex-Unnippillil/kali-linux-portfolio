import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import {
  applyMove,
  createBoard,
  createConfig,
  getAllMoves,
  getPieceMoves,
  Color,
  Move,
  Config,
  Board,
} from './engine';

const SIZE = 60;

const levels: Record<string, { maxDepth: number; timeLimit: number }> = {
  easy: { maxDepth: 2, timeLimit: 200 },
  medium: { maxDepth: 4, timeLimit: 500 },
  hard: { maxDepth: 6, timeLimit: 1000 },
};

const Checkers: React.FC = () => {
  const [config] = useState<Config>(() => createConfig('standard'));
  const [board, setBoard] = useState<Board>(() => createBoard(config));
  const [turn, setTurn] = useState<Color>('red');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application>();
  const workerRef = useRef<Worker>();
  const boardRef = useRef<Board>(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    const app = new PIXI.Application({
      width: config.size * SIZE,
      height: config.size * SIZE,
      background: '#f0d9b5',
      antialias: true,
    });
    appRef.current = app;
    const div = containerRef.current;
    if (div) {
      div.innerHTML = '';
      div.appendChild(app.view as HTMLCanvasElement);
    }
    drawBoard();
    return () => app.destroy(true, { children: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    drawBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, selected, moves]);

  useEffect(() => {
    const worker = new Worker(new URL('./ai.worker.ts', import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<Move | null>) => {
      const move = e.data;
      if (move) {
        const { board: nb } = applyMove(boardRef.current, move, config);
        setBoard(nb);
      }
      setTurn('red');
    };
    return () => worker.terminate();
  }, [config]);

  useEffect(() => {
    if (turn === 'black') {
      workerRef.current?.postMessage({
        board,
        color: 'black',
        config,
        ...levels[difficulty],
      });
    }
  }, [turn, board, config, difficulty]);

  const drawBoard = () => {
    const app = appRef.current;
    if (!app) return;
    app.stage.removeChildren();
    for (let r = 0; r < config.size; r++) {
      for (let c = 0; c < config.size; c++) {
        const square = new PIXI.Graphics();
        square.beginFill((r + c) % 2 === 0 ? 0xEEEED2 : 0x769656);
        square.drawRect(c * SIZE, r * SIZE, SIZE, SIZE);
        square.endFill();
        square.interactive = true;
        square.on('pointerdown', () => handleSquare(r, c));
        app.stage.addChild(square);
        const piece = board[r][c];
        if (piece) {
          const pc = new PIXI.Graphics();
          pc.beginFill(piece.color === 'red' ? 0xd62839 : 0x000000);
          pc.drawCircle(c * SIZE + SIZE / 2, r * SIZE + SIZE / 2, SIZE / 2 - 4);
          pc.endFill();
          if (piece.king) {
            pc.lineStyle(2, 0xffff00);
            pc.drawCircle(c * SIZE + SIZE / 2, r * SIZE + SIZE / 2, SIZE / 2 - 12);
          }
          app.stage.addChild(pc);
        }
      }
    }
    if (selected) {
      const sel = new PIXI.Graphics();
      sel.lineStyle(2, 0xffd700);
      sel.drawRect(selected[1] * SIZE, selected[0] * SIZE, SIZE, SIZE);
      app.stage.addChild(sel);
    }
    moves.forEach((m) => {
      const hl = new PIXI.Graphics();
      hl.lineStyle(2, 0xffff00);
      hl.drawRect(m.to[1] * SIZE, m.to[0] * SIZE, SIZE, SIZE);
      app.stage.addChild(hl);
    });
  };

  const handleSquare = (r: number, c: number) => {
    if (turn === 'black') return;
    if (selected) {
      const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) {
        const { board: nb } = applyMove(board, move, config);
        setBoard(nb);
        setSelected(null);
        setMoves([]);
        setTurn('black');
        return;
      }
      setSelected(null);
      setMoves([]);
    }
    const piece = board[r][c];
    if (!piece || piece.color !== turn) return;
    const all = getAllMoves(board, turn, config);
    const mustCapture = all.some((m) => m.captures?.length || m.captured);
    let pm = getPieceMoves(board, r, c, config);
    if (mustCapture) pm = pm.filter((m) => m.captures?.length || m.captured);
    if (pm.length) {
      setSelected([r, c]);
      setMoves(pm);
    }
  };

  const reset = () => {
    setBoard(createBoard(config));
    setTurn('red');
    setSelected(null);
    setMoves([]);
  };

  return (
    <div className="p-4 space-y-2 select-none">
      <div className="flex items-center space-x-2">
        <span>Difficulty:</span>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
          className="text-black"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 bg-gray-300 text-black rounded"
        >
          Reset
        </button>
        <span>Turn: {turn}</span>
      </div>
      <div ref={containerRef} />
    </div>
  );
};

export default Checkers;
