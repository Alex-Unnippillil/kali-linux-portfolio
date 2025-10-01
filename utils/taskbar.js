import apps from '../apps.config';
import { safeLocalStorage } from './safeStorage';

const STORAGE_KEY = 'taskbarPinnedApps';

const appMetadata = new Map(
        apps.map((app) => [
                app.id,
                {
                        id: app.id,
                        title: app.title,
                        icon: app.icon ? app.icon.replace('./', '/') : '',
                },
        ]),
);

let pinned = normalizePinned(loadPinned());
const subscribers = new Set();

function loadPinned() {
        if (!safeLocalStorage) return [];
        try {
                const stored = safeLocalStorage.getItem(STORAGE_KEY);
                if (!stored) return [];
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
        } catch (error) {
                return [];
        }
}

function persistPinned(next) {
        if (!safeLocalStorage) return;
        try {
                safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
                // Ignore write failures (e.g. storage disabled)
        }
}

function emitChange() {
        const snapshot = getPinnedAppIds();
        subscribers.forEach((listener) => {
                try {
                        listener(snapshot);
                } catch (error) {
                        // Fail silently so one bad listener does not break others
                }
        });
}

function normalizePinned(appIds) {
        if (!Array.isArray(appIds)) return [];
        const seen = new Set();
        const normalized = [];
        appIds.forEach((id) => {
                if (typeof id !== 'string') return;
                if (!appMetadata.has(id)) return;
                if (seen.has(id)) return;
                seen.add(id);
                normalized.push(id);
        });
        return normalized;
}

export function getPinnedAppIds() {
        return Array.from(pinned);
}

export function subscribePinnedApps(listener) {
        if (typeof listener !== 'function') return () => {};
        subscribers.add(listener);
        listener(getPinnedAppIds());
        return () => {
                subscribers.delete(listener);
        };
}

function setPinned(next) {
        const normalized = normalizePinned(next);
        pinned = normalized;
        persistPinned(pinned);
        emitChange();
}

export function pinApp(appId) {
        if (typeof appId !== 'string') return;
        if (pinned.includes(appId)) return;
        if (!appMetadata.has(appId)) return;
        setPinned([...pinned, appId]);
}

export function unpinApp(appId) {
        if (typeof appId !== 'string') return;
        if (!pinned.includes(appId)) return;
        setPinned(pinned.filter((id) => id !== appId));
}

export function reorderPinnedApps(fromIndex, toIndex) {
        if (typeof fromIndex !== 'number' || typeof toIndex !== 'number') return;
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || toIndex < 0) return;
        if (fromIndex >= pinned.length || toIndex >= pinned.length) return;
        const next = [...pinned];
        const [item] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, item);
        setPinned(next);
}

export function movePinnedApp(appId, targetIndex) {
        if (typeof targetIndex !== 'number') return;
        const currentIndex = pinned.indexOf(appId);
        if (currentIndex === -1) return;
        const clampedIndex = Math.max(0, Math.min(targetIndex, pinned.length - 1));
        reorderPinnedApps(currentIndex, clampedIndex);
}

export function isPinned(appId) {
        return pinned.includes(appId);
}

export function getAppMetadata(appId) {
        return appMetadata.get(appId) || null;
}

if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
                if (event.key !== STORAGE_KEY) return;
                pinned = normalizePinned(loadPinned());
                emitChange();
        });
}
