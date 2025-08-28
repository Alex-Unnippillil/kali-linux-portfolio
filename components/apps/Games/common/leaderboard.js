const PREFIX = 'leaderboard:';
const MAX_SCORE = 1000000000;
const isValidScore = (score) => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= MAX_SCORE;
export const getLeaderboard = (gameId) => {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(`${PREFIX}${gameId}`);
        if (!raw)
            return [];
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
};
export const recordScore = (gameId, name, score, limit = 10) => {
    if (!isValidScore(score))
        return getLeaderboard(gameId);
    const board = getLeaderboard(gameId);
    board.push({ name, score });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, limit);
    try {
        window.localStorage.setItem(`${PREFIX}${gameId}`, JSON.stringify(trimmed));
    }
    catch {
        /* ignore storage errors */
    }
    return trimmed;
};
