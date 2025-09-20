export type MinesweeperCell = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
  adjacent: number;
};

export type MinesweeperBoard = MinesweeperCell[][];

export type ChordTarget = { x: number; y: number };

const offsets = [-1, 0, 1];

export const isChordCombo = ({
  left,
  right,
  space,
  allowSpaceModifier = true,
}: {
  left: boolean;
  right: boolean;
  space: boolean;
  allowSpaceModifier?: boolean;
}) => {
  if (!left) return false;
  if (right) return true;
  return allowSpaceModifier && space;
};

export const getChordTargets = (
  board: MinesweeperBoard | null,
  x: number,
  y: number,
): ChordTarget[] => {
  if (!board || !board.length) return [];
  const cell = board[x]?.[y];
  if (!cell || !cell.revealed || cell.adjacent === 0) return [];

  let flagged = 0;
  const hidden: ChordTarget[] = [];

  for (const dx of offsets) {
    for (const dy of offsets) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      const neighbor = board[nx]?.[ny];
      if (!neighbor) continue;
      if (neighbor.flagged) {
        flagged += 1;
        continue;
      }
      if (!neighbor.revealed) {
        hidden.push({ x: nx, y: ny });
      }
    }
  }

  if (flagged !== cell.adjacent) {
    return [];
  }

  return hidden;
};
