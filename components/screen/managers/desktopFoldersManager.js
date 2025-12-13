import { safeLocalStorage } from '../../../utils/safeStorage';

const FOLDER_CONTENTS_STORAGE_KEY = 'desktop_folder_contents';

export const sanitizeFolderItem = (item) => {
    if (!item) return null;
    if (typeof item === 'string') {
        return { id: item, title: item };
    }
    if (typeof item === 'object' && typeof item.id === 'string') {
        const title = typeof item.title === 'string' ? item.title : item.id;
        const icon = typeof item.icon === 'string' ? item.icon : undefined;
        return { id: item.id, title, icon };
    }
    return null;
};

export const loadStoredFolderContents = (storageKey = FOLDER_CONTENTS_STORAGE_KEY) => {
    if (!safeLocalStorage) return {};
    try {
        const raw = safeLocalStorage.getItem(storageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const normalized = {};
        Object.entries(parsed).forEach(([folderId, value]) => {
            if (!folderId || !Array.isArray(value)) return;
            const items = value
                .map((entry) => sanitizeFolderItem(entry))
                .filter(Boolean);
            normalized[folderId] = items;
        });
        return normalized;
    } catch (e) {
        return {};
    }
};

export const persistStoredFolderContents = (contents, storageKey = FOLDER_CONTENTS_STORAGE_KEY) => {
    if (!safeLocalStorage) return;
    try {
        safeLocalStorage.setItem(
            storageKey,
            JSON.stringify(contents || {}),
        );
    } catch (e) {
        // ignore storage errors
    }
};

export const getFolderStorageKey = () => FOLDER_CONTENTS_STORAGE_KEY;
