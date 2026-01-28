const leaderboard = new Map();

export const addScore = ({ game, username, score }) => {
  if (!leaderboard.has(game)) {
    leaderboard.set(game, []);
  }
  const entry = {
    game,
    username: username.slice(0, 50),
    score,
    createdAt: Date.now(),
  };
  leaderboard.get(game).push(entry);
  return entry;
};

export const getTopScores = ({ game, limit = 10 }) => {
  const entries = leaderboard.get(game) || [];
  return [...entries]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ username, score, game: entryGame }) => ({
      username,
      score,
      game: entryGame,
    }));
};
