export const updateScores = (ballX, width, scores) => {
  const newScores = { ...scores };
  let scorer = null;
  if (ballX < 0) {
    newScores.opponent += 1;
    scorer = 'opponent';
  } else if (ballX > width) {
    newScores.player += 1;
    scorer = 'player';
  }
  return { scores: newScores, scorer };
};

export const aiErrorOffset = (difficulty, rand = Math.random) => {
  const diff = difficulty / 10;
  const maxError = (1 - diff) * 50; // larger error at low difficulty
  return (rand() * 2 - 1) * maxError;
};
