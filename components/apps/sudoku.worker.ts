import { solveBoard, generatePuzzle, getCandidates, getHint } from './sudoku-solver';

onmessage = (e: MessageEvent) => {
  const { type, board, difficulty, seed } = e.data as any;
  if (type === 'solve') {
    const { solution, stats } = solveBoard(board);
    postMessage({ type: 'solve', solution, stats });
  } else if (type === 'generate') {
    const result = generatePuzzle(difficulty, seed);
    postMessage({ type: 'generate', ...result });
  } else if (type === 'candidates') {
    const candidates = getCandidates(board);
    postMessage({ type: 'candidates', candidates });
  } else if (type === 'hint') {
    const hint = getHint(board);
    postMessage({ type: 'hint', hint });
  }
};
