import React from 'react';
import type { Board, Coord } from '../engine/types';
import { TileView } from './TileView';

export const BoardView: React.FC<{
  board: Board;
  selected?: Coord;
  focused?: Coord;
  onCell: (coord: Coord) => void;
  disabled?: boolean;
}> = ({ board, selected, focused, onCell, disabled }) => {
  const size = Math.max(34, Math.min(56, Math.floor(420 / Math.max(board.rows, board.cols))));
  return (
    <div className="rounded-xl bg-slate-950/70 p-2" style={{ width: size * board.cols + 16 }}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${board.cols}, ${size}px)` }}>
        {board.cells.flat().map((cell) => (
          <TileView
            key={`${cell.coord.r}-${cell.coord.c}`}
            cell={cell}
            size={size}
            disabled={disabled}
            selected={Boolean(selected && selected.r === cell.coord.r && selected.c === cell.coord.c)}
            focused={Boolean(focused && focused.r === cell.coord.r && focused.c === cell.coord.c)}
            onSelect={() => onCell(cell.coord)}
          />
        ))}
      </div>
    </div>
  );
};
