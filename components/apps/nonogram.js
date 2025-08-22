import React, { useState } from 'react';

const parseClues = (text) =>
  text
    .trim()
    .split('\n')
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => parseInt(n, 10))
    );

const lineToClues = (line) => {
  const clues = [];
  let count = 0;
  line.forEach((cell) => {
    if (cell === 1) count += 1;
    else if (count) {
      clues.push(count);
      count = 0;
    }
  });
  if (count) clues.push(count);
  return clues.length ? clues : [];
};

const Nonogram = () => {
  const [rowInput, setRowInput] = useState('1\n3\n5\n3\n1');
  const [colInput, setColInput] = useState('1 1\n3\n5\n3\n1 1');
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [grid, setGrid] = useState([]);
  const [started, setStarted] = useState(false);

  const startGame = () => {
    const r = parseClues(rowInput);
    const c = parseClues(colInput);
    if (!r.length || !c.length) return;
    setRows(r);
    setCols(c);
    setGrid(Array(r.length).fill(null).map(() => Array(c.length).fill(0)));
    setStarted(true);
  };

  const toggleCell = (i, j, mark) => {
    setGrid((g) => {
      const ng = g.map((row) => row.slice());
      if (mark) ng[i][j] = ng[i][j] === -1 ? 0 : -1;
      else ng[i][j] = ng[i][j] === 1 ? 0 : 1;
      return ng;
    });
  };

  const validate = () => {
    const rowsValid = grid.every((row, i) =>
      JSON.stringify(lineToClues(row)) === JSON.stringify(rows[i])
    );
    const colsValid = cols.every((col, i) => {
      const column = grid.map((row) => row[i]);
      return JSON.stringify(lineToClues(column)) === JSON.stringify(col);
    });
    alert(rowsValid && colsValid ? 'Puzzle solved!' : 'Not yet solved');
  };

  if (!started)
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
        <div className="flex mb-4 space-x-4">
          <textarea
            className="bg-gray-700 p-2"
            rows={5}
            value={rowInput}
            onChange={(e) => setRowInput(e.target.value)}
            placeholder="Row clues"
          />
          <textarea
            className="bg-gray-700 p-2"
            rows={5}
            value={colInput}
            onChange={(e) => setColInput(e.target.value)}
            placeholder="Column clues"
          />
        </div>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={startGame}
        >
          Start
        </button>
      </div>
    );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 select-none">
      <div className="flex">
        <div className="flex flex-col mr-2 text-right">
          {rows.map((clue, i) => (
            <div key={i} className="h-8 flex items-center justify-end pr-1">
              {clue.join(' ')}
            </div>
          ))}
        </div>
        <div>
          <div className="flex mb-1">
            {cols.map((clue, i) => (
              <div key={i} className="w-8 text-center">
                {clue.join(' ')}
              </div>
            ))}
          </div>
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${cols.length}, 2rem)` }}
          >
            {grid.map((row, i) =>
              row.map((cell, j) => (
                <div
                  key={`${i}-${j}`}
                  onClick={() => toggleCell(i, j, false)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleCell(i, j, true);
                  }}
                  className={`w-8 h-8 border border-gray-600 flex items-center justify-center cursor-pointer ${
                    cell === 1 ? 'bg-gray-200' : ''
                  } ${cell === -1 ? 'text-gray-500' : ''}`}
                >
                  {cell === -1 ? 'X' : ''}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <button
        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={validate}
      >
        Check
      </button>
    </div>
  );
};

export default Nonogram;
