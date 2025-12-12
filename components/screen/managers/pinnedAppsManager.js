import apps from '../../../apps.config';
import { safeLocalStorage } from '../../../utils/safeStorage';

export const PINNED_APPS_STORAGE_KEY = 'pinnedApps';

export class PinnedAppsManager {
    constructor({
        storageKey = PINNED_APPS_STORAGE_KEY,
        setState,
        getState,
        onSaveSession,
        onBroadcast,
        onInitFavourite,
    }) {
        this.storageKey = storageKey;
        this.setState = setState;
        this.getState = getState;
        this.onSaveSession = onSaveSession;
        this.onBroadcast = onBroadcast;
        this.onInitFavourite = onInitFavourite;
        this.hasStoredPinnedAppIds = false;
    }

    normalizePinnedAppIds = (ids) => {
        const availableIds = new Set(apps.map((app) => app.id));
        const list = Array.isArray(ids) ? ids : [];
        const normalized = [];
        const seen = new Set();

        list.forEach((id) => {
            if (typeof id !== 'string') return;
            if (seen.has(id)) return;
            if (!availableIds.has(id)) return;
            normalized.push(id);
            seen.add(id);
        });

        return normalized;
    };

    loadPinnedAppIds = () => {
        const defaultPinned = this.normalizePinnedAppIds(
            apps.filter((app) => app.favourite).map((app) => app.id),
        );

        if (!safeLocalStorage) {
            return defaultPinned;
        }

        let storedValue = null;
        try {
            storedValue = safeLocalStorage.getItem(this.storageKey);
        } catch (e) {
            storedValue = null;
        }

        if (!storedValue) {
            this.hasStoredPinnedAppIds = false;
            return defaultPinned;
        }

        try {
            const parsed = JSON.parse(storedValue);
            if (Array.isArray(parsed)) {
                const normalized = this.normalizePinnedAppIds(parsed);
                this.hasStoredPinnedAppIds = true;
                return normalized;
            }
        } catch (e) {
            // ignore malformed entries and fall back to defaults
        }

        this.hasStoredPinnedAppIds = false;
        return defaultPinned;
    };

    persistPinnedAppIds = (ids) => {
        if (!safeLocalStorage) return;
        try {
            safeLocalStorage.setItem(this.storageKey, JSON.stringify(Array.isArray(ids) ? ids : []));
            this.hasStoredPinnedAppIds = true;
        } catch (e) {
            // ignore persistence errors
        }
    };

    getPinnedAppIds = () => {
        const state = this.getState();
        return Array.isArray(state?.pinnedAppIds)
            ? [...state.pinnedAppIds]
            : [];
    };

    applyPinnedFlags = (pinnedIds) => {
        const pinnedSet = new Set(Array.isArray(pinnedIds) ? pinnedIds : []);
        apps.forEach((app) => {
            app.favourite = pinnedSet.has(app.id);
        });
    };

    syncInitFavourite = (pinnedSet) => {
        const next = {};
        apps.forEach((app) => {
            next[app.id] = pinnedSet.has(app.id);
        });
        if (typeof this.onInitFavourite === 'function') {
            this.onInitFavourite(next);
        }
    };

    syncFavouriteAppsWithPinned = (pinnedSet) => {
        const validAppIds = new Set(apps.map((app) => app.id));
        this.setState((prevState) => {
            const previous = prevState.favourite_apps || {};
            const closed = prevState.closed_windows || {};
            const next = { ...previous };
            let changed = false;

            validAppIds.forEach((id) => {
                const isPinned = pinnedSet.has(id);
                const isOpen = closed[id] === false;
                const current = next[id];

                if (isPinned) {
                    if (current !== true) {
                        next[id] = true;
                        changed = true;
                    }
                } else if (!isOpen) {
                    if (current !== false) {
                        next[id] = false;
                        changed = true;
                    }
                }
            });

            Object.keys(next).forEach((id) => {
                if (!validAppIds.has(id)) {
                    delete next[id];
                    changed = true;
                }
            });

            if (!changed) return null;
            return { favourite_apps: next };
        }, () => {
            if (typeof this.onSaveSession === 'function') {
                this.onSaveSession();
            }
        });
    };

    setPinnedAppIds = (ids, options = {}) => {
        const {
            persist = true,
            broadcast = true,
            force = false,
            syncFavourite = true,
        } = options;
        const normalized = this.normalizePinnedAppIds(ids);
        const currentState = this.getState();
        const current = Array.isArray(currentState?.pinnedAppIds)
            ? currentState.pinnedAppIds
            : [];
        const changed = force
            || normalized.length !== current.length
            || normalized.some((id, index) => current[index] !== id);
        const pinnedSet = new Set(normalized);

        const finalize = () => {
            if (persist) {
                this.persistPinnedAppIds(normalized);
            }
            this.applyPinnedFlags(normalized);
            this.syncInitFavourite(pinnedSet);
            if (syncFavourite) {
                this.syncFavouriteAppsWithPinned(pinnedSet);
            }
            if (broadcast && typeof this.onBroadcast === 'function') {
                this.onBroadcast();
            }
        };

        if (!changed) {
            finalize();
            return normalized;
        }

        this.setState({ pinnedAppIds: normalized }, finalize);
        return normalized;
    };

    insertPinnedAppId = (list, id, targetId, insertAfter = false) => {
        const base = Array.isArray(list)
            ? list.filter((value) => value !== id)
            : [];

        let insertIndex;
        if (!targetId) {
            insertIndex = insertAfter ? base.length : 0;
        } else {
            const targetIndex = base.indexOf(targetId);
            insertIndex = targetIndex === -1 ? base.length : targetIndex;
            if (insertAfter && targetIndex !== -1) {
                insertIndex = targetIndex + 1;
            }
        }

        if (insertIndex < 0) insertIndex = 0;
        if (insertIndex > base.length) insertIndex = base.length;

        base.splice(insertIndex, 0, id);
        return base;
    };

    getPinnedAppSummaries = (state) => {
        const pinnedIds = this.getPinnedAppIds();
        if (!pinnedIds.length) return [];

        const {
            closed_windows = {},
            minimized_windows = {},
            focused_windows = {},
        } = state || {};

        return pinnedIds.map((id) => {
            const app = apps.find((candidate) => candidate.id === id);
            if (!app) return null;
            const icon = typeof app.icon === 'string' ? app.icon.replace('./', '/') : '';
            const isRunning = closed_windows[id] === false;
            return {
                id,
                title: app.title,
                icon,
                isRunning,
                isFocused: Boolean(focused_windows[id]),
                isMinimized: Boolean(minimized_windows[id]),
            };
        }).filter(Boolean);
    };

    getCurrentRunningAppIds = (closed_windows = {}) => {
        return apps
            .filter((app) => closed_windows[app.id] === false)
            .map((app) => app.id);
    };
}
