import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Board, Coord } from '../engine/types';

export const useInput = (board: Board, onAttemptSwap: (from: Coord, to: Coord) => void) => {
  const [focus, setFocus] = useState<Coord>({ r: 0, c: 0 });
  const dragStart = useRef<Coord | null>(null);

  const clamp = useMemo(() => (coord: Coord): Coord => ({
    r: Math.max(0, Math.min(board.rows - 1, coord.r)),
    c: Math.max(0, Math.min(board.cols - 1, coord.c)),
  }), [board.cols, board.rows]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, selected?: Coord) => {
    if (event.key === 'ArrowUp') setFocus((f) => clamp({ ...f, r: f.r - 1 }));
    if (event.key === 'ArrowDown') setFocus((f) => clamp({ ...f, r: f.r + 1 }));
    if (event.key === 'ArrowLeft') setFocus((f) => clamp({ ...f, c: f.c - 1 }));
    if (event.key === 'ArrowRight') setFocus((f) => clamp({ ...f, c: f.c + 1 }));
    if ((event.key === 'Enter' || event.key === ' ') && selected) {
      onAttemptSwap(selected, focus);
      event.preventDefault();
    }
  }, [clamp, focus, onAttemptSwap]);

  const pointerStart = (coord: Coord) => {
    dragStart.current = coord;
    setFocus(coord);
  };

  const pointerEnd = (coord: Coord) => {
    if (!dragStart.current) return;
    onAttemptSwap(dragStart.current, coord);
    dragStart.current = null;
  };

  return { focus, setFocus, onKeyDown, pointerStart, pointerEnd };
};
