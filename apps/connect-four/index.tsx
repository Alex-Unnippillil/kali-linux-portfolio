import React, { useEffect, useRef, useState } from 'react';

const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const AI = 2;
const WIN_SCORE = 1_000_000;
const columnOrder = [3, 2, 4, 1, 5, 0, 6];

const createBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const cloneBoard = (board: number[][]) => board.map((r) => [...r]);

const validCols = (board: number[][]) => columnOrder.filter((c) => board[0][c] === 0);

const getLandingRow = (board: number[][], col: number) => {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (board[r][col] === 0) return r;
  }
  return -1;
};

const dropPiece = (board: number[][], col: number, player: number) => {
  const newBoard = cloneBoard(board);
  const row = getLandingRow(newBoard, col);
  if (row >= 0) newBoard[row][col] = player;
  return newBoard;
};

const getWinningLines = (board: number[][], player: number) => {
  const lines: [number, number][][] = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        lines.push([ [r, c], [r, c + 1], [r, c + 2], [r, c + 3] ]);
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        lines.push([ [r, c], [r + 1, c], [r + 2, c], [r + 3, c] ]);
    }
  }
  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      )
        lines.push([ [r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3] ]);
    }
  }
  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        lines.push([ [r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3] ]);
    }
  }
  return lines;
};

const checkWin = (board: number[][], player: number) => getWinningLines(board, player).length > 0;

const evaluateWindow = (window: number[], player: number) => {
  const opp = player === AI ? HUMAN : AI;
  const countP = window.filter((v) => v === player).length;
  const countO = window.filter((v) => v === opp).length;
  const countE = window.filter((v) => v === 0).length;
  let score = 0;
  if (countP === 4) score += WIN_SCORE;
  else if (countP === 3 && countE === 1) score += 100;
  else if (countP === 2 && countE === 2) score += 10;
  if (countO === 3 && countE === 1) score -= 80;
  if (countO === 4) score -= WIN_SCORE;
  return score;
};

const scorePosition = (board: number[][], player: number) => {
  let score = 0;
  const center = Math.floor(COLS / 2);
  const centerCount = board.map((r) => r[center]).filter((v) => v === player).length;
  score += centerCount * 3;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
      score += evaluateWindow(window, player);
    }
  }
  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      const window = [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
      score += evaluateWindow(window, player);
    }
  }
  return score;
};

const isTerminal = (board: number[][]) =>
  checkWin(board, HUMAN) || checkWin(board, AI) || validCols(board).length === 0;

const minimax = (
  board: number[][],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number => {
  if (depth === 0 || isTerminal(board)) {
    if (checkWin(board, AI)) return WIN_SCORE;
    if (checkWin(board, HUMAN)) return -WIN_SCORE;
    return scorePosition(board, AI);
  }
  const cols = validCols(board);
  if (maximizing) {
    let value = -Infinity;
    for (const col of cols) {
      const child = dropPiece(board, col, AI);
      value = Math.max(value, minimax(child, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  let value = Infinity;
  for (const col of cols) {
    const child = dropPiece(board, col, HUMAN);
    value = Math.min(value, minimax(child, depth - 1, alpha, beta, true));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
};

const bestMove = (board: number[][], depth: number) => {
  let best = columnOrder[0];
  let bestScore = -Infinity;
  for (const col of validCols(board)) {
    const child = dropPiece(board, col, AI);
    const score = minimax(child, depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      best = col;
    }
  }
  return best;
};

const CELL = 64;
const PADDING = 10;
const RADIUS = CELL / 2 - 4;

const ConnectFour: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(createBoard);
  const [turn, setTurn] = useState<'human' | 'ai'>('human');
  const [status, setStatus] = useState('Your move');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameOver, setGameOver] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<import('pixi.js').Application | null>(null);
  const pixiRef = useRef<typeof import('pixi.js')>();
  const piecesLayer = useRef<import('pixi.js').Container | null>(null);
  const lastMoveLayer = useRef<import('pixi.js').Container | null>(null);
  const hoverLayer = useRef<import('pixi.js').Container | null>(null);
  const piecesRef = useRef<(import('pixi.js').Graphics | null)[][]>(
    createBoard().map((row) => row.map(() => null)),
  );
  const hoverCol = useRef<number | null>(null);
  const hoverLines = useRef<[number, number][][]>([]);

  const depthMap = { easy: 3, medium: 5, hard: 7 } as const;

  useEffect(() => {
    let cancelled = false;
    import('pixi.js').then((PIXI) => {
      if (cancelled) return;
      pixiRef.current = PIXI;
      const app = new PIXI.Application({
        width: COLS * CELL + PADDING * 2,
        height: ROWS * CELL + PADDING * 2,
        background: 0x1e3a8a,
      });
      appRef.current = app;
      containerRef.current?.appendChild(app.view as HTMLCanvasElement);

      const boardLayer = new PIXI.Graphics();
      boardLayer.rect(PADDING, PADDING, COLS * CELL, ROWS * CELL).fill(0x1e40af);
      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          boardLayer
            .circle(
              PADDING + c * CELL + CELL / 2,
              PADDING + r * CELL + CELL / 2,
              RADIUS,
            )
            .fill(0xffffff);
        }
      }
      app.stage.addChild(boardLayer);

      piecesLayer.current = new PIXI.Container();
      app.stage.addChild(piecesLayer.current);

      lastMoveLayer.current = new PIXI.Container();
      app.stage.addChild(lastMoveLayer.current);

      hoverLayer.current = new PIXI.Container();
      app.stage.addChild(hoverLayer.current);

      for (let c = 0; c < COLS; c += 1) {
        const hit = new PIXI.Graphics();
        hit.rect(PADDING + c * CELL, PADDING, CELL, ROWS * CELL).fill(0, 0);
        hit.eventMode = 'static';
        hit.cursor = 'pointer';
        hit.on('pointerover', () => {
          if (gameOver || turn !== 'human') return;
          hoverCol.current = c;
          hoverLines.current = getWinningLines(dropPiece(board, c, HUMAN), HUMAN);
          drawHover();
        });
        hit.on('pointerout', () => {
          hoverCol.current = null;
          hoverLines.current = [];
          drawHover();
        });
        hit.on('pointertap', () => handleClick(c));
        app.stage.addChild(hit);
      }
    });
    return () => {
      cancelled = true;
      appRef.current?.destroy(true, { children: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drawLastMove = () => {
    const PIXI = pixiRef.current;
    if (!PIXI || !lastMoveLayer.current) return;
    lastMoveLayer.current.removeChildren();
    if (!lastMove) return;
    const [r, c] = lastMove;
    const x = PADDING + c * CELL + CELL / 2;
    const y = PADDING + r * CELL + CELL / 2;
    const g = new PIXI.Graphics();
    g.circle(x, y, RADIUS).stroke({ width: 4, color: 0x22c55e });
    lastMoveLayer.current.addChild(g);
  };

  const drawHover = () => {
    const PIXI = pixiRef.current;
    if (!PIXI || !hoverLayer.current) return;
    hoverLayer.current.removeChildren();
    if (hoverCol.current === null) return;
    const col = hoverCol.current;
    const row = getLandingRow(board, col);
    if (row < 0) return;
    const x = PADDING + col * CELL + CELL / 2;
    const y = PADDING + row * CELL + CELL / 2;
    const ghost = new PIXI.Graphics();
    ghost.circle(x, y, RADIUS).fill(0xff0000, 0.3);
    hoverLayer.current.addChild(ghost);
    for (const line of hoverLines.current) {
      for (const [r, c] of line) {
        const lx = PADDING + c * CELL + CELL / 2;
        const ly = PADDING + r * CELL + CELL / 2;
        const ring = new PIXI.Graphics();
        ring.circle(lx, ly, RADIUS).stroke({ width: 3, color: 0x22c55e, alpha: 0.7 });
        hoverLayer.current.addChild(ring);
      }
    }
  };

  const animateDrop = (row: number, col: number, player: number) => {
    const PIXI = pixiRef.current;
    if (!PIXI || !piecesLayer.current || !appRef.current) return;
    const disc = new PIXI.Graphics();
    disc.circle(0, 0, RADIUS).fill(player === HUMAN ? 0xef4444 : 0xfacc15);
    disc.x = PADDING + col * CELL + CELL / 2;
    disc.y = PADDING - CELL / 2;
    piecesLayer.current.addChild(disc);
    const target = PADDING + row * CELL + CELL / 2;
    const drop = (delta: number) => {
      disc.y += 15 * delta;
      if (disc.y >= target) {
        disc.y = target;
        appRef.current!.ticker.remove(drop);
        piecesRef.current[row][col] = disc;
        drawLastMove();
      }
    };
    appRef.current.ticker.add(drop);
  };

  const handleClick = (col: number) => {
    if (turn !== 'human' || gameOver) return;
    const row = getLandingRow(board, col);
    if (row < 0) return;
    const newBoard = dropPiece(board, col, HUMAN);
    setBoard(newBoard);
    setLastMove([row, col]);
    animateDrop(row, col, HUMAN);
    hoverCol.current = null;
    hoverLines.current = [];
    drawHover();
    if (checkWin(newBoard, HUMAN)) {
      setStatus('You win!');
      setGameOver(true);
      return;
    }
    if (validCols(newBoard).length === 0) {
      setStatus('Draw');
      setGameOver(true);
      return;
    }
    setTurn('ai');
    setStatus('AI thinking...');
  };

  useEffect(() => {
    drawLastMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  useEffect(() => {
    if (turn === 'ai' && !gameOver) {
      const depth = depthMap[difficulty];
      const col = bestMove(board, depth);
      const row = getLandingRow(board, col);
      const newBoard = dropPiece(board, col, AI);
      setTimeout(() => animateDrop(row, col, AI), 200);
      setBoard(newBoard);
      setLastMove([row, col]);
      if (checkWin(newBoard, AI)) {
        setStatus('AI wins');
        setGameOver(true);
      } else if (validCols(newBoard).length === 0) {
        setStatus('Draw');
        setGameOver(true);
      } else {
        setTurn('human');
        setStatus('Your move');
      }
    }
  }, [turn, board, difficulty, gameOver]);

  return (
    <div className="p-4 select-none">
      <h1 className="text-xl font-bold mb-2">Connect Four</h1>
      <div className="mb-2">
        <label className="mr-2">Difficulty:</label>
        <select
          className="border rounded p-1 text-black"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as any)}
          disabled={turn === 'ai' || gameOver}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <div ref={containerRef} />
      <p className="mt-2">{status}</p>
    </div>
  );
};

export default ConnectFour;

