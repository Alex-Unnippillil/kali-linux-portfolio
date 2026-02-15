let aiPromise;

const isBoard = (board) =>
  Array.isArray(board) &&
  board.length === 4 &&
  board.every((row) => Array.isArray(row) && row.length === 4 && row.every((cell) => typeof cell === 'number'));

const safePost = (payload) => {
  try {
    postMessage(payload);
  } catch {
    // ignore
  }
};

onmessage = async (e) => {
  try {
    const { type, board } = e.data || {};
    if (!isBoard(board) || (type !== 'hint' && type !== 'score')) {
      safePost({ type: 'error', reason: 'invalid-payload' });
      return;
    }

    aiPromise = aiPromise || import('../../apps/games/_2048/ai');
    const { findHint, scoreMoves } = await aiPromise;

    if (type === 'hint') {
      const move = findHint(board);
      safePost({ type: 'hint', move });
      return;
    }

    safePost({ type: 'score', scores: scoreMoves(board) });
  } catch {
    safePost({ type: 'error', reason: 'ai-unavailable' });
  }
};
