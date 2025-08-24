// Simple Battleship AI using Hunt & Target strategy with probability density maps
// The AI keeps an internal representation of the opponent board. Cells are:
// 0 = unknown, 1 = miss, 2 = hit, 3 = sunk
export type CellState = 0 | 1 | 2 | 3;

export interface Shot {
  row: number;
  col: number;
}

// Fleet lengths for classic Battleship
const FLEET = [5, 4, 3, 3, 2];

export class BattleshipAI {
  private size: number;
  private parity: number;

  constructor(size = 10) {
    this.size = size;
    this.parity = 2; // parity optimisation when all remaining ships > 1
  }

  // Compute remaining ships from board knowledge
  private remainingShips(board: CellState[][]): number[] {
    // Copy the fleet so we can remove sunk ships
    const fleet = [...FLEET];
    const size = board.length;
    // Track which ships have been sunk by finding contiguous groups of '3' cells
    const sunkShips: number[] = [];
    const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Helper to mark contiguous sunk cells and return their length
    const markSunk = (r: number, c: number, dr: number, dc: number): number => {
      let len = 0;
      while (
        r >= 0 && r < size &&
        c >= 0 && c < size &&
        board[r][c] === 3 &&
        !visited[r][c]
      ) {
        visited[r][c] = true;
        len++;
        r += dr;
        c += dc;
      }
      return len;
    };

    // Scan for horizontal sunk ships
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 3 && !visited[r][c]) {
          // Check horizontal
          let len = markSunk(r, c, 0, 1);
          if (len > 1) sunkShips.push(len);
        }
      }
    }
    // Scan for vertical sunk ships
    for (let c = 0; c < size; c++) {
      for (let r = 0; r < size; r++) {
        if (board[r][c] === 3 && !visited[r][c]) {
          // Check vertical
          let len = markSunk(r, c, 1, 0);
          if (len > 1) sunkShips.push(len);
        }
      }
    }
    // Single cell sunk ships (if any)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 3 && !visited[r][c]) {
          sunkShips.push(1);
          visited[r][c] = true;
        }
      }
    }

    // Remove sunk ships from fleet
    for (const sunkLen of sunkShips) {
      const idx = fleet.indexOf(sunkLen);
      if (idx !== -1) {
        fleet.splice(idx, 1);
      }
    }
    if (fleet.every((l) => l === 1)) this.parity = 1;
    return fleet;
  }

  // Generate probability density map for current board state
  // Exposed publicly so the UI can render heat maps for assistance
  public probability(board: CellState[][]): number[][] {
    const map = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    const ships = this.remainingShips(board);
    const valid = (r: number, c: number) => r >= 0 && c >= 0 && r < this.size && c < this.size;
    for (const len of ships) {
      // horizontal placements
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c <= this.size - len; c++) {
          let ok = true;
          for (let k = 0; k < len; k++) {
            const cell = board[r][c + k];
            if (cell === 1 || cell === 3) {
              ok = false;
              break;
            }
          }
          if (ok) {
            for (let k = 0; k < len; k++) map[r][c + k]++;
          }
        }
      }
      // vertical placements
      for (let c = 0; c < this.size; c++) {
        for (let r = 0; r <= this.size - len; r++) {
          let ok = true;
          for (let k = 0; k < len; k++) {
            const cell = board[r + k][c];
            if (cell === 1 || cell === 3) {
              ok = false;
              break;
            }
          }
          if (ok) {
            for (let k = 0; k < len; k++) map[r + k][c]++;
          }
        }
      }
    }

    // Apply parity optimisation
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if ((r + c) % this.parity !== 0) map[r][c] = 0;
      }
    }

    // Never shoot at known cells
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] !== 0) map[r][c] = 0;
      }
    }
    return map;
  }

  // Find neighbouring cells of unresolved hits
  private targetMode(board: CellState[][]): Shot | null {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] === 2) {
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (
              nr >= 0 &&
              nc >= 0 &&
              nr < this.size &&
              nc < this.size &&
              board[nr][nc] === 0
            ) {
              return { row: nr, col: nc };
            }
          }
        }
      }
    }
    return null;
  }

  // Select next shot based on difficulty
  public nextShot(board: CellState[][], difficulty = 1): Shot {
    // Try targeting if there are hits
    const target = this.targetMode(board);
    if (target && difficulty > 0) return target;

    const map = this.probability(board);
    const cells: Shot[] = [];
    let best = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = map[r][c];
        if (val > best) {
          best = val;
          cells.length = 0;
          cells.push({ row: r, col: c });
        } else if (val === best && val > 0) {
          cells.push({ row: r, col: c });
        }
      }
    }

    if (cells.length === 0) {
      // fallback to random
      const all: Shot[] = [];
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (board[r][c] === 0 && (r + c) % this.parity === 0) all.push({ row: r, col: c });
        }
      }
      return all[Math.floor(Math.random() * all.length)];
    }

    if (difficulty === 0) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
    if (difficulty === 2) {
      // simple look-ahead: choose shot leaving fewest candidate placements if miss
      let bestShot = cells[0];
      let minPlacements = Infinity;
      for (const shot of cells) {
        const clone = board.map((row) => row.slice());
        clone[shot.row][shot.col] = 1; // assume miss
        const placements = this.probability(clone)
          .flat()
          .reduce((a, b) => a + b, 0);
        if (placements < minPlacements) {
          minPlacements = placements;
          bestShot = shot;
        }
      }
      return bestShot;
    }
    return cells[Math.floor(Math.random() * cells.length)];
  }
}

export default BattleshipAI;
