 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pointerHandlers } from '../../utils/pointer';
import {


  createBoard,
  getPieceMoves,
  getAllMoves as getForcedMoves,
  applyMove,
  hasMoves,
  isDraw,
} from '../../components/apps/checkers/engine';

// Helper to get all moves without enforcing capture
const getAllMovesNoForce = (board, color) => {
  let result = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (_optionalChain([board, 'access', _ => _[r], 'access', _2 => _2[c], 'optionalAccess', _3 => _3.color]) === color) {
        const moves = getPieceMoves(board, r, c);
        if (moves.length) result = result.concat(moves);
      }
    }
  }
  return result;
};

export default function CheckersPage() {
  const [board, setBoard] = useState(createBoard());
  const [turn, setTurn] = useState('red');
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState([]);
  const [rule, setRule] = useState('forced');
  const [algorithm, setAlgorithm] = useState('alphabeta');
  const [difficulty, setDifficulty] = useState(3);
  const [winner, setWinner] = useState(null);
  const [noCapture, setNoCapture] = useState(0);
  const workerRef = useRef(null);

  const makeMove = useCallback(
    (move) => {
      const { board: newBoard, capture } = applyMove(board, move);
      const further = capture
        ? getPieceMoves(newBoard, move.to[0], move.to[1]).filter((m) => m.captured)
        : [];
      setBoard(newBoard);
      if (capture && further.length) {
        setSelected([move.to[0], move.to[1]]);
        setMoves(further);
        setNoCapture(0);
        return;
      }
      const next = turn === 'red' ? 'black' : 'red';
      const newNo = capture ? 0 : noCapture + 1;
      setNoCapture(newNo);
      if (isDraw(newNo)) {
        setWinner('Draw');
      } else {
        const hasNext =
          rule === 'forced'
            ? hasMoves(newBoard, next)
            : getAllMovesNoForce(newBoard, next).length > 0;
        if (!hasNext) {
          setWinner(turn);
          return;
        }
        setTurn(next);
        if (next === 'black') {
          _optionalChain([workerRef, 'access', _4 => _4.current, 'optionalAccess', _5 => _5.postMessage, 'call', _6 => _6({
            board: newBoard,
            color: 'black',
            difficulty,
            algorithm,
            enforceCapture: rule === 'forced',
          })]);
        }
      }
      setSelected(null);
      setMoves([]);
    },
    [board, turn, noCapture, rule, difficulty, algorithm]
  );

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/checkersAI.ts', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const move = e.data;
      if (move) makeMove(move);
    };
    return () => _optionalChain([workerRef, 'access', _7 => _7.current, 'optionalAccess', _8 => _8.terminate, 'call', _9 => _9()]);
  }, [makeMove]);

  const allMoves = useMemo(
    () =>
      rule === 'forced'
        ? getForcedMoves(board, turn)
        : getAllMovesNoForce(board, turn),
    [board, turn, rule]
  );

  const selectPiece = (r, c) => {
    const piece = board[r][c];
    if (winner || !piece || piece.color !== turn) return;
    const pieceMoves = getPieceMoves(board, r, c);
    const mustCapture = rule === 'forced' && allMoves.some((m) => m.captured);
    const filtered = mustCapture ? pieceMoves.filter((m) => m.captured) : pieceMoves;
    if (filtered.length) {
      setSelected([r, c]);
      setMoves(filtered);
    }
  };

  const tryMove = (r, c) => {
    const move = moves.find((m) => m.to[0] === r && m.to[1] === c);
    if (move) makeMove(move);
  };

  const reset = () => {
    setBoard(createBoard());
    setTurn('red');
    setSelected(null);
    setMoves([]);
    setWinner(null);
    setNoCapture(0);
  };

  return (
    React.createElement('div', { className: "flex flex-col items-center justify-center h-full w-full bg-ub-cool-grey text-white p-4"        ,}
      , winner && React.createElement('div', { className: "mb-2 text-xl" ,}, winner === 'Draw' ? 'Draw!' : `${winner} wins!`)
      , React.createElement('div', { className: "mb-4 flex gap-4 items-center"   ,}
        , React.createElement('label', null, "Rules:"

          , React.createElement('select', {
            className: "ml-2 bg-gray-700 px-1"  ,
            value: rule,
            onChange: (e) => setRule(e.target.value ),}

            , React.createElement('option', { value: "forced",}, "Forced Capture" )
            , React.createElement('option', { value: "relaxed",}, "Capture Optional" )
          )
        )
        , React.createElement('label', null, "AI:"

          , React.createElement('select', {
            className: "ml-2 bg-gray-700 px-1"  ,
            value: algorithm,
            onChange: (e) => setAlgorithm(e.target.value ),}

            , React.createElement('option', { value: "alphabeta",}, "Alpha-Beta")
            , React.createElement('option', { value: "mcts",}, "MCTS")
          )
        )
        , React.createElement('label', { className: "flex items-center gap-1"  ,}, "Difficulty "
           , difficulty
          , React.createElement('input', {
            type: "range",
            min: 1,
            max: 8,
            value: difficulty,
            onChange: (e) => setDifficulty(Number(e.target.value)),}
          )
        )
        , React.createElement('button', {
          className: "px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"    ,
          onClick: reset,}
, "Reset"

        )
      )
      , React.createElement('div', { className: "grid grid-cols-8 gap-0"  ,}
        , board.map((row, r) =>
          row.map((cell, c) => {
            const isDark = (r + c) % 2 === 1;
            const isMove = moves.some((m) => m.to[0] === r && m.to[1] === c);
            const isSelected = selected && selected[0] === r && selected[1] === c;
            return (
              React.createElement('div', {
                key: `${r}-${c}`,
                ...pointerHandlers(() =>
                  selected ? tryMove(r, c) : selectPiece(r, c)
                ),
                className: `w-12 h-12 md:w-14 md:h-14 flex items-center justify-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-400'
                } ${isMove ? 'ring-2 ring-yellow-300 animate-pulse' : ''} ${
                  isSelected ? 'ring-2 ring-green-400' : ''
                }`,}

                , cell && (
                  React.createElement('div', {
                    className: `w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center ${
                      cell.color === 'red' ? 'bg-red-500' : 'bg-black'
                    } ${cell.king ? 'border-4 border-yellow-300' : ''}`,}
                  )
                )
              )
            );
          })
        )
      )
    )
  );
}
