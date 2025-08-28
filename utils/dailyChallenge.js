const SEED_PREFIX = 'dailySeed:';
const LEADERBOARD_PREFIX = 'leaderboard:';
// Simple deterministic hash for string
const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
};
// Generate a daily seed based on UTC date so all devices share the same seed
export const getDailySeed = (gameId, date = new Date()) => {
    const day = date.toISOString().split('T')[0];
    const key = `${gameId}:${day}`;
    const seed = hash(key);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(`${SEED_PREFIX}${gameId}`, seed);
        }
        catch {
            /* ignore storage errors */
        }
    }
    return seed;
};
export const getLeaderboard = (gameId) => {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = window.localStorage.getItem(`${LEADERBOARD_PREFIX}${gameId}`);
        if (!raw)
            return [];
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
};
export const recordScore = (gameId, name, score, limit = 10) => {
    const board = getLeaderboard(gameId);
    board.push({ name, score });
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, limit);
    try {
        window.localStorage.setItem(`${LEADERBOARD_PREFIX}${gameId}`, JSON.stringify(trimmed));
    }
    catch {
        /* ignore storage errors */
    }
    return trimmed;
};
