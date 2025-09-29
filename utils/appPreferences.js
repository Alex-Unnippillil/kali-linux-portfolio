import { safeLocalStorage } from './safeStorage';

export const FAVORITES_KEY = 'launcherFavorites';
export const RECENTS_KEY = 'recentApps';

export const readStoredIds = (key) => {
    if (!safeLocalStorage) return [];
    try {
        const raw = JSON.parse(safeLocalStorage.getItem(key) || '[]');
        if (Array.isArray(raw)) {
            return raw.filter((id) => typeof id === 'string');
        }
    } catch (error) {
        // ignore malformed entries
    }
    return [];
};

export const persistIds = (key, ids) => {
    if (!safeLocalStorage) return;
    try {
        safeLocalStorage.setItem(key, JSON.stringify(ids));
    } catch (error) {
        // ignore quota errors
    }
};

export const sanitizeIds = (ids, availableIds, limit) => {
    const unique = [];
    const seen = new Set();
    ids.forEach((id) => {
        if (!availableIds.has(id) || seen.has(id)) return;
        seen.add(id);
        unique.push(id);
    });
    if (typeof limit === 'number') {
        return unique.slice(0, limit);
    }
    return unique;
};

export const updateRecentIds = (current, id, limit = 10) => {
    const filtered = current.filter((existing) => existing !== id);
    const next = [id, ...filtered];
    return typeof limit === 'number' ? next.slice(0, limit) : next;
};

export const arraysEqual = (a, b) => {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};
