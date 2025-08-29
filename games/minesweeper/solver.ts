export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
  adjacent: number;
}

export type Board = Cell[][];

// Calculate probability map for each unrevealed cell based on surrounding numbers.
export function calculateRiskMap(board: Board): number[][] {
  const size = board.length;
  const risk = Array.from({ length: size }, () => Array(size).fill(0));

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;

      let maxProb = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
          const nCell = board[nx][ny];
          if (!nCell.revealed || nCell.mine || nCell.adjacent === 0) continue;

          let flagged = 0;
          let hidden = 0;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              if (ox === 0 && oy === 0) continue;
              const mx = nx + ox;
              const my = ny + oy;
              if (mx < 0 || mx >= size || my < 0 || my >= size) continue;
              const around = board[mx][my];
              if (around.flagged) flagged++;
              if (!around.revealed && !around.flagged) hidden++;
            }
          }

          const remaining = nCell.adjacent - flagged;
          if (remaining > 0 && hidden > 0) {
            const prob = remaining / hidden;
            if (prob > maxProb) maxProb = prob;
          }
        }
      }

      risk[x][y] = maxProb;
    }
  }

  return risk;
}

// Find the safest move available. If no perfectly safe cell exists, returns the least risky one.
export function findBestMove(board: Board): { x: number; y: number; risk: number } | null {
  const risk = calculateRiskMap(board);
  let best: { x: number; y: number; risk: number } | null = null;

  for (let x = 0; x < risk.length; x++) {
    for (let y = 0; y < risk[x].length; y++) {
      const cell = board[x][y];
      if (cell.revealed || cell.flagged) continue;
      const r = risk[x][y];
      if (!best || r < best.risk) {
        best = { x, y, risk: r };
        if (r === 0) return best; // immediately safe
      }
    }
  }

  return best;
}

// Draw overlays for safe (green) and risky (red) cells onto the given canvas context.
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  board: Board,
  cellSize: number,
  riskMap?: number[][],
): void {
  const risk = riskMap || calculateRiskMap(board);
  for (let x = 0; x < board.length; x++) {
    for (let y = 0; y < board[x].length; y++) {
      const cell = board[x][y];
      if (cell.revealed || cell.flagged || cell.question) continue;
      const r = risk[x][y];
      if (r === 0) {
        ctx.fillStyle = 'rgba(0,255,0,0.3)';
        ctx.fillRect(y * cellSize, x * cellSize, cellSize, cellSize);
      } else if (r > 0) {
        ctx.fillStyle = `rgba(255,0,0,${r * 0.4})`;
        ctx.fillRect(y * cellSize, x * cellSize, cellSize, cellSize);
      }
    }
  }
}

// Utility to toggle overlay visibility
export function toggleOverlay(current: boolean): boolean {
  return !current;
}

