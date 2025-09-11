let aiPromise;

onmessage = async (e) => {
  const { type, board } = e.data;
  aiPromise = aiPromise || import('../../apps/games/_2048/ai');
  const { findHint, scoreMoves } = await aiPromise;
  if (type === 'hint') {
    const move = findHint(board);
    postMessage({ type: 'hint', move });
  } else if (type === 'score') {
    const scores = scoreMoves(board);
    postMessage({ type: 'score', scores });
  }
};
