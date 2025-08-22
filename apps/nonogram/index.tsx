import React, { useEffect, useRef, useState } from 'react';
import { parseNON, type NonogramPuzzle } from './parser';

const CELL_SIZE = 24;

type Cell = -1 | 0 | 1; // -1 marked, 0 empty, 1 filled

interface Status {
  complete: boolean;
  contradiction: boolean;
}

function analyseLine(line: Cell[], clues: number[]): Status {
  const groups: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) count += 1;
    else if (count > 0) {
      groups.push(count);
      count = 0;
    }
  }
  if (count > 0) groups.push(count);
  const complete =
    groups.length === clues.length && groups.every((g, i) => g === clues[i]);
  const contradiction =
    groups.length > clues.length || groups.some((g, i) => g > (clues[i] || 0));
  return { complete, contradiction };
}

const Nonogram: React.FC = () => {
  const [puzzle, setPuzzle] = useState<NonogramPuzzle | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [puzzleId, setPuzzleId] = useState('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; dist?: number } | null>(null);

  useEffect(() => {
    fetch('/api/nonogram/daily')
      .then((res) => res.json())
      .then((data) => {
        setPuzzle({
          width: data.width,
          height: data.height,
          rows: data.rows,
          cols: data.cols,
        });
        setPuzzleId(data.id || 'daily');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!puzzle) return;
    const saved = localStorage.getItem(`nonogram-${puzzleId}`);
    if (saved) {
      setGrid(JSON.parse(saved));
    } else {
      setGrid(
        Array.from({ length: puzzle.height }, () =>
          Array(puzzle.width).fill(0)
        )
      );
    }
  }, [puzzle, puzzleId]);

  useEffect(() => {
    if (puzzle && grid.length) {
      localStorage.setItem(`nonogram-${puzzleId}`, JSON.stringify(grid));
    }
  }, [grid, puzzle, puzzleId]);

  const updateCell = (r: number, c: number, mark: boolean) => {
    if (!puzzle) return;
    setGrid((prev) => {
      const ng = prev.map((row) => row.slice());
      const current = ng[r][c];
      ng[r][c] = mark ? (current === -1 ? 0 : -1) : current === 1 ? 0 : 1;
      const rowStatus = analyseLine(ng[r], puzzle.rows[r]);
      if (rowStatus.complete) {
        ng[r] = ng[r].map((cell) => (cell === 0 ? -1 : cell));
      }
      const col = ng.map((row) => row[c]);
      const colStatus = analyseLine(col, puzzle.cols[c]);
      if (colStatus.complete) {
        col.forEach((_, ri) => {
          if (ng[ri][c] === 0) ng[ri][c] = -1;
        });
      }
      return ng;
    });
  };

  const handleCellClick = (r: number, c: number) => updateCell(r, c, false);
  const handleRightClick = (r: number, c: number, e: React.MouseEvent) => {
    e.preventDefault();
    updateCell(r, c, true);
  };

  const rowStatus =
    puzzle?.rows.map((clues, i) => analyseLine(grid[i] || [], clues)) || [];
  const colStatus =
    puzzle?.cols.map((clues, i) =>
      analyseLine(grid.map((row) => row[i]) || [], clues)
    ) || [];

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      last.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      last.current = { x: 0, y: 0, dist };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1 && last.current) {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    } else if (pointers.current.size === 2 && last.current?.dist) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const delta = dist / last.current.dist;
      setScale((s) => Math.min(3, Math.max(0.5, s * delta)));
      last.current = { x: 0, y: 0, dist };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      last.current = null;
    }
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    const p = parseNON(text);
    setPuzzle(p);
    setPuzzleId(file.name);
  };

  const topClues = puzzle?.cols.map((col, i) => (
    <div
      key={`col-${i}`}
      className={`flex flex-col-reverse items-center w-6 text-xs ${
        colStatus[i]?.complete ? 'text-green-600' : ''
      } ${colStatus[i]?.contradiction ? 'text-red-600' : ''}`}
    >
      {col.map((n, idx) => (
        <span key={idx}>{n}</span>
      ))}
    </div>
  ));

  const leftClues = puzzle?.rows.map((row, i) => (
    <div
      key={`row-${i}`}
      className={`h-6 flex items-center justify-end pr-1 text-xs ${
        rowStatus[i]?.complete ? 'text-green-600' : ''
      } ${rowStatus[i]?.contradiction ? 'text-red-600' : ''}`}
    >
      {row.join(' ')}
    </div>
  ));

  return (
    <div className="p-2 select-none">
      <div className="mb-2 flex gap-2 items-center">
        <input
          type="file"
          accept=".non"
          onChange={(e) => e.target.files && importFile(e.target.files[0])}
        />
      </div>
      {puzzle && (
        <div
          ref={containerRef}
          className="border overflow-hidden touch-none"
          style={{ width: '100%', height: '80vh' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            <div className="flex">
              <div className="flex flex-col mr-1 mt-6">{leftClues}</div>
              <div>
                <div className="flex mb-1">{topClues}</div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${puzzle.width}, ${CELL_SIZE}px)`,
                    gridTemplateRows: `repeat(${puzzle.height}, ${CELL_SIZE}px)`,
                  }}
                >
                  {grid.map((row, r) =>
                    row.map((cell, c) => (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        onContextMenu={(e) => handleRightClick(r, c, e)}
                        className={`w-6 h-6 border flex items-center justify-center cursor-pointer ${
                          cell === 1 ? 'bg-black' : ''
                        } ${cell === -1 ? 'text-gray-400' : ''}`}
                      >
                        {cell === -1 ? 'X' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nonogram;
