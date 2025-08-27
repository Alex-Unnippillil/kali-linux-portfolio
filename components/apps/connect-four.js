// Bitboard-based Connect Four AI engine
// Provides negamax search with alpha-beta pruning, iterative deepening,
// and a transposition table. The board uses a 7x6 layout encoded into two
// 64-bit bitboards represented with BigInt.

const COLS = 7;
const ROWS = 6;
const COL_SHIFT = ROWS + 1; // extra bit per column

const BOTTOM_MASK = Array.from({ length: COLS }, (_, c) => 1n << BigInt(c * COL_SHIFT));
const TOP_MASK = BOTTOM_MASK.map((m) => m << BigInt(ROWS));
const COLUMN_MASK = Array.from(
  { length: COLS },
  (_, c) => ((1n << BigInt(ROWS)) - 1n) << BigInt(c * COL_SHIFT)
);
const MOVE_ORDER = [3, 4, 2, 5, 1, 6, 0]; // prefer center
const WIN_SCORE = 1000000;

class Position {
  constructor(current = 0n, mask = 0n) {
    this.current = current; // bitboard for current player
    this.mask = mask; // bitboard for all discs
  }

  clone() {
    return new Position(this.current, this.mask);
  }

  canPlay(col) {
    return (this.mask & TOP_MASK[col]) === 0n;
  }

  play(col) {
    // switch players and add disc in given column
    this.current ^= this.mask;
    this.mask |= this.mask + BOTTOM_MASK[col];
  }

  isWinningMove(col) {
    const pos = this.current;
    const m = this.mask;
    const newPos = pos | ((m + BOTTOM_MASK[col]) & COLUMN_MASK[col]);
    return Position.hasWon(newPos);
  }

  static hasWon(bitboard) {
    // vertical
    let m = bitboard & (bitboard >> BigInt(COL_SHIFT));
    if (m & (m >> BigInt(2 * COL_SHIFT))) return true;
    // horizontal
    m = bitboard & (bitboard >> 1n);
    if (m & (m >> 2n)) return true;
    // diagonal /
    m = bitboard & (bitboard >> BigInt(COL_SHIFT - 1));
    if (m & (m >> BigInt(2 * (COL_SHIFT - 1)))) return true;
    // diagonal \
    m = bitboard & (bitboard >> BigInt(COL_SHIFT + 1));
    if (m & (m >> BigInt(2 * (COL_SHIFT + 1)))) return true;
    return false;
  }

  key() {
    // unique key for transposition table
    return `${this.current}_${this.mask}`;
  }
}

export class ConnectFourAI {
  constructor() {
    this.position = new Position();
    this.tt = new Map(); // transposition table
  }

  reset() {
    this.position = new Position();
    this.tt.clear();
  }

  canPlay(col) {
    return this.position.canPlay(col);
  }

  play(col) {
    this.position.play(col);
  }

  // Iterative deepening search for the best move
  bestMove(maxDepth = 8) {
    // Opening book: play center if board empty
    if (this.position.mask === 0n) return 3;
    let bestCol = MOVE_ORDER.find((c) => this.canPlay(c));
    for (let depth = 1; depth <= maxDepth; depth++) {
      const { column, score } = this.negamax(this.position, depth, -WIN_SCORE, WIN_SCORE);
      if (column !== null) bestCol = column;
      if (Math.abs(score) === WIN_SCORE) break; // found forced win or loss
    }
    return bestCol;
  }

  negamax(position, depth, alpha, beta) {
    const key = position.key();
    const ttEntry = this.tt.get(key);
    if (ttEntry && ttEntry.depth >= depth) {
      return { column: ttEntry.column, score: ttEntry.score };
    }

    const moves = MOVE_ORDER.filter((c) => position.canPlay(c));
    if (depth === 0 || moves.length === 0) {
      return { column: null, score: 0 };
    }

    let bestCol = moves[0];
    let bestScore = -WIN_SCORE;

    for (const col of moves) {
      if (position.isWinningMove(col)) {
        this.tt.set(key, { depth, column: col, score: WIN_SCORE });
        return { column: col, score: WIN_SCORE };
      }
      const child = position.clone();
      child.play(col);
      const { score } = this.negamax(child, depth - 1, -beta, -alpha);
      const val = -score;
      if (val > bestScore) {
        bestScore = val;
        bestCol = col;
      }
      if (bestScore > alpha) alpha = bestScore;
      if (alpha >= beta) break;
    }

    this.tt.set(key, { depth, column: bestCol, score: bestScore });
    return { column: bestCol, score: bestScore };
  }
}

export default ConnectFourAI;
