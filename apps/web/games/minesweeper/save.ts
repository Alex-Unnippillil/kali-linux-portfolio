export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  question: boolean;
  adjacent: number;
}

// Serialized board uses compact tuples to minimize size
export type SerializedCell = [number, number, number, number, number];
export type SerializedBoard = SerializedCell[][];

export function serializeBoard(board: Cell[][]): SerializedBoard {
  return board.map((row) =>
    row.map((c) => [
      c.mine ? 1 : 0,
      c.revealed ? 1 : 0,
      c.flagged ? 1 : 0,
      c.question ? 1 : 0,
      c.adjacent,
    ]),
  );
}

export function deserializeBoard(data: SerializedBoard): Cell[][] {
  return data.map((row) =>
    row.map(([m, r, f, q, a]) => ({
      mine: !!m,
      revealed: !!r,
      flagged: !!f,
      question: !!q,
      adjacent: a,
    })),
  );
}
