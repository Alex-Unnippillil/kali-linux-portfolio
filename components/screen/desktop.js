"use client";

import React, { Component } from 'react';
import dynamic from 'next/dynamic';

const backgroundImageModule =
    process.env.NODE_ENV === 'test' ? require('../util-components/background-image') : null;
const BackgroundImage =
    process.env.NODE_ENV === 'test'
        ? (backgroundImageModule?.default || backgroundImageModule || (() => null))
        : dynamic(() => import('../util-components/background-image'), { ssr: false });
import apps, { games, displayDesktopFolder } from '../../apps.config';
import { DEFAULT_DESKTOP_FOLDERS } from '../../data/desktopFolders';
import Window from '../desktop/Window';
import UbuntuApp from '../base/ubuntu_app';
import SystemOverlayWindow from '../base/SystemOverlayWindow';
import AllApplications from '../screen/all-applications'
import ShortcutSelector from '../screen/shortcut-selector'
import WindowSwitcher from '../screen/window-switcher'
import CommandPalette from '../ui/CommandPalette';
import DesktopMenu from '../context-menus/desktop-menu';
import DefaultMenu from '../context-menus/default';
import AppMenu from '../context-menus/app-menu';
import TaskbarMenu from '../context-menus/taskbar-menu';
import { MinimizedWindowShelf, ClosedWindowShelf } from '../desktop/WindowStateShelf';
import ReactGA from 'react-ga4';
import { toPng } from 'html-to-image';
import { buildWindowPreviewFallbackDataUrl, createWindowPreviewFilter } from '../../utils/windowPreview';
import { safeLocalStorage } from '../../utils/safeStorage';
import { addRecentApp } from '../../utils/recentStorage';
import { DESKTOP_TOP_PADDING, WINDOW_TOP_INSET, WINDOW_TOP_MARGIN } from '../../utils/uiConstants';
import { useSnapSetting, useSnapGridSetting } from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import {
    clampWindowPositionWithinViewport,
    clampWindowTopPosition,
    getSafeAreaInsets,
    measureWindowTopOffset,
} from '../../utils/windowLayout';

const FOLDER_CONTENTS_STORAGE_KEY = 'desktop_folder_contents';
const WINDOW_SIZE_STORAGE_KEY = 'desktop_window_sizes';
const PINNED_APPS_STORAGE_KEY = 'pinnedApps';

const sanitizeFolderItem = (item) => {
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

const loadStoredFolderContents = () => {
    if (!safeLocalStorage) return {};
    try {
        const raw = safeLocalStorage.getItem(FOLDER_CONTENTS_STORAGE_KEY);
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

const persistStoredFolderContents = (contents) => {
    if (!safeLocalStorage) return;
    try {
        safeLocalStorage.setItem(
            FOLDER_CONTENTS_STORAGE_KEY,
            JSON.stringify(contents || {}),
        );
    } catch (e) {
        // ignore storage errors
    }
};

const resolveStorage = () => {
    if (safeLocalStorage) return safeLocalStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return undefined;
};

const loadStoredWindowSizes = (storageKey = WINDOW_SIZE_STORAGE_KEY) => {
    const storage = resolveStorage();
    if (!storage) return {};
    try {
        const stored = storage.getItem(storageKey);
        if (!stored) return {};
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') return {};
        const normalized = {};
        Object.entries(parsed).forEach(([key, value]) => {
            if (!value || typeof value !== 'object') return;
            const width = Number(value.width);
            const height = Number(value.height);
            if (Number.isFinite(width) && Number.isFinite(height)) {
                normalized[key] = { width, height };
            }
        });
        return normalized;
    } catch (e) {
        return {};
    }
};


const OVERLAY_WINDOWS = Object.freeze({
    launcher: {
        id: 'overlay-launcher',
        title: 'All Applications',
        icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    },
    shortcutSelector: {
        id: 'overlay-shortcut-selector',
        title: 'Add to Desktop',
        icon: '/themes/Yaru/system/user-desktop.png',
    },
    windowSwitcher: {
        id: 'overlay-window-switcher',
        title: 'Window Switcher',
        icon: '/themes/Yaru/window/window-restore-symbolic.svg',
    },
    commandPalette: {
        id: 'overlay-command-palette',
        title: 'Command Palette',
        icon: '/themes/Yaru/apps/word-search.svg',
    },
});

const OVERLAY_WINDOW_LIST = Object.values(OVERLAY_WINDOWS);
const LAUNCHER_OVERLAY_ID = OVERLAY_WINDOWS.launcher.id;
const SHORTCUT_OVERLAY_ID = OVERLAY_WINDOWS.shortcutSelector.id;
const SWITCHER_OVERLAY_ID = OVERLAY_WINDOWS.windowSwitcher.id;
const COMMAND_PALETTE_OVERLAY_ID = OVERLAY_WINDOWS.commandPalette.id;

const BADGE_TONE_MAP = Object.freeze({
    accent: 'accent',
    primary: 'accent',
    brand: 'accent',
    info: 'info',
    information: 'info',
    success: 'success',
    positive: 'success',
    complete: 'success',
    done: 'success',
    warning: 'warning',
    caution: 'warning',
    danger: 'danger',
    critical: 'danger',
    error: 'danger',
    alert: 'danger',
    neutral: 'neutral',
    muted: 'neutral',
    default: 'accent',
});

const clamp = (value, min = 0, max = 1) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return min;
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

const createOverlayFlagMap = (value) => {
    const flags = {};
    OVERLAY_WINDOW_LIST.forEach(({ id }) => {
        flags[id] = value;
    });
    return flags;
};

const createOverlayStateMap = () => {
    const next = {};
    OVERLAY_WINDOW_LIST.forEach(({ id }) => {
        next[id] = {
            open: false,
            minimized: false,
            maximized: false,
            focused: false,
        };
        if (id === LAUNCHER_OVERLAY_ID) {
            next[id].transitionState = 'exited';
        }
    });
    Object.entries(OVERLAY_WINDOWS).forEach(([key, meta]) => {
        if (next[meta.id]) {
            next[key] = next[meta.id];
        }
    });
    return next;
};

export class Desktop extends Component {
    static defaultProps = {
        snapGrid: [8, 8],
    };

    constructor(props = {}) {
        super(props);
        this._isMounted = false;
        this.workspaceCount = 4;
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.workspaceKeys = new Set([
            'focused_windows',
            'closed_windows',
            'minimized_windows',
            'window_positions',
            'window_sizes',
        ]);
        this.windowSizeStorageKey = 'desktop_window_sizes';
        this.defaultThemeConfig = {
            id: 'default',
            accent: (props.desktopTheme && props.desktopTheme.accent) || '#1793d1',
            wallpaperUrl: props.desktopTheme && props.desktopTheme.wallpaperUrl,
            fallbackWallpaperUrl: (props.desktopTheme && props.desktopTheme.fallbackWallpaperUrl) || '/wallpapers/wall-2.webp',
            wallpaperName: (props.desktopTheme && props.desktopTheme.wallpaperName) || 'wall-2',
            overlay: props.desktopTheme ? props.desktopTheme.overlay : undefined,
            useKaliWallpaper: Boolean(props.desktopTheme && props.desktopTheme.useKaliWallpaper),
        };
        const initialTheme = this.normalizeTheme(props.desktopTheme);
        this.workspaceThemes = Array.from({ length: this.workspaceCount }, () => ({ ...initialTheme }));
        this.initFavourite = {};
        this.allWindowClosed = false;

        this.iconSizePresetStorageKey = 'desktop_icon_size_presets';
        this.iconSizePresetLegacyKey = 'desktop_icon_size_preset';
        this.iconSizePresetBuckets = [
            { id: 'lt-640', label: 'mobile screens (tiny)', min: 0, max: 640 },
            { id: 'lt-1024', label: 'screens below 1024px', min: 640, max: 1024 },
            { id: 'gte-1024', label: 'screens 1024px and above', min: 1024, max: Infinity },
        ];
        this.iconSizePresets = {
            small: {
                dimensions: { width: 84, height: 76 },
                spacing: { row: 100, column: 116 },
                padding: { top: DESKTOP_TOP_PADDING, right: 20, bottom: 112, left: 20 },
            },
            medium: {
                dimensions: { width: 96, height: 88 },
                spacing: { row: 112, column: 128 },
                padding: { top: DESKTOP_TOP_PADDING, right: 24, bottom: 120, left: 24 },
            },
            large: {
                dimensions: { width: 112, height: 104 },
                spacing: { row: 132, column: 148 },
                padding: { top: DESKTOP_TOP_PADDING + 8, right: 28, bottom: 136, left: 28 },
            },
            tiny: {
                dimensions: { width: 72, height: 68 },
                spacing: { row: 88, column: 88 },
                padding: { top: 32, right: 12, bottom: 96, left: 12 },
            },
        };

        this.taskbarOrderKeyBase = 'taskbar-order';
        this.pinnedStorageKey = PINNED_APPS_STORAGE_KEY;
        this.hasStoredPinnedAppIds = false;
        // Initialize with defaults to avoid hydration mismatch
        const initialPinnedAppIds = this.normalizePinnedAppIds(
            apps.filter((app) => app.favourite).map((app) => app.id),
        );
        this.applyPinnedFlags(initialPinnedAppIds);

        this.iconSizePresetMap = {};

        // IMPORTANT: Keep constructor state SSR-safe and deterministic.
        // If we read `window.innerWidth` or `localStorage` here, the server markup can diverge from the first client render
        // during hydration (Next.js will warn and re-render the tree on the client).
        //
        // We intentionally start with stable defaults and then "upgrade" to the real viewport bucket + stored preset
        // in `componentDidMount()` via `setupViewportObserver()`.
        const initialViewportWidth = 0;
        const initialIconSizeBucket = 'gte-1024';
        const initialIconSizePreset = 'medium';
        const initialPresetConfig = this.getIconSizePresetConfig(initialIconSizePreset);

        this.baseIconDimensions = { ...initialPresetConfig.dimensions };
        this.baseIconGridSpacing = { ...initialPresetConfig.spacing };
        this.baseDesktopPadding = { ...initialPresetConfig.padding };

        this.iconDimensions = { ...this.baseIconDimensions };
        this.iconGridSpacing = { ...this.baseIconGridSpacing };
        this.desktopPadding = { ...this.baseDesktopPadding };
        this.latestViewportWidth = initialViewportWidth;
        this.viewportResizeObserver = null;

        const initialOverlayClosed = createOverlayFlagMap(true);
        const initialOverlayMinimized = createOverlayFlagMap(false);
        const initialOverlayFocused = createOverlayFlagMap(false);
        const initialAppFocused = {};
        const initialAppClosed = {};
        const initialAppMinimized = {};
        apps.forEach((app) => {
            initialAppFocused[app.id] = false;
            initialAppClosed[app.id] = app.id === 'about' ? false : true;
            initialAppMinimized[app.id] = false;
        });
        if (process.env.NODE_ENV === 'test') {
            initialAppClosed.about = true;
        }

        const initialWindowSizes = {};
        const storedFolderContents = {};

        this.state = {
            focused_windows: { ...initialOverlayFocused, ...initialAppFocused },
            closed_windows: { ...initialOverlayClosed, ...initialAppClosed },
            disabled_apps: {},
            favourite_apps: {},
            pinnedAppIds: initialPinnedAppIds,
            minimized_windows: { ...initialOverlayMinimized, ...initialAppMinimized },
            window_positions: {},
            window_sizes: initialWindowSizes,
            desktop_apps: [],
            desktop_icon_positions: {},
            folder_contents: storedFolderContents,
            window_context: {},
            context_menus: {
                desktop: false,
                default: false,
                app: false,
                taskbar: false,
            },
            context_app: null,
            showNameBar: false,
            switcherWindows: [],
            activeWorkspace: 0,
            workspaces: Array.from({ length: this.workspaceCount }, (_, index) => ({
                id: index,
                label: `Workspace ${index + 1}`,
            })),
            draggingIconId: null,
            keyboardMoveState: null,
            liveRegionMessage: '',
            selectedIcons: new Set(),
            selectionAnchorId: null,
            marqueeSelection: null,
            hoveredIconId: null,
            currentTheme: initialTheme,
            iconSizeBucket: initialIconSizeBucket,
            iconSizePreset: initialIconSizePreset,
            overlayWindows: createOverlayStateMap(),
            minimizedShelfOpen: false,
            closedShelfOpen: false,
            appBadges: {},
            taskbarOrder: [],
            mounted: false,
        };

        const cleanAppClosed = {};
        apps.forEach((app) => {
            cleanAppClosed[app.id] = true;
        });

        this.workspaceSnapshots = Array.from({ length: this.workspaceCount }, (_, index) => {
            if (index === 0) {
                return {
                    focused_windows: {},
                    closed_windows: {},
                    minimized_windows: {},
                    window_positions: {},
                    window_sizes: { ...initialWindowSizes },
                };
            }
            return {
                focused_windows: { ...initialOverlayFocused, ...initialAppFocused },
                closed_windows: { ...initialOverlayClosed, ...cleanAppClosed },
                minimized_windows: { ...initialOverlayMinimized, ...initialAppMinimized },
                window_positions: {},
                window_sizes: { ...initialWindowSizes },
            };
        });

        this.desktopRef = React.createRef();
        this.folderNameInputRef = React.createRef();
        this.allAppsSearchRef = React.createRef();
        this.allAppsOverlayRef = React.createRef();
        this.windowSwitcherContentRef = React.createRef();
        this.iconDragState = null;
        this.preventNextIconClick = false;
        this.savedIconPositions = {};

        this.gestureState = { pointer: null, overview: null };

        this.currentPointerIsCoarse = false;

        this.desktopIconVariables = {};
        this.desktopAccentVariables = {
            '--desktop-icon-selection-bg': 'rgba(56, 189, 248, 0.2)',
            '--desktop-icon-selection-border': 'rgba(165, 243, 252, 0.9)',
            '--desktop-icon-selection-glow': '0 0 0 1px rgba(56,189,248,0.7), 0 6px 24px rgba(8,47,73,0.55)',
            '--desktop-icon-hover-bg': 'rgba(56, 189, 248, 0.12)',
            '--desktop-icon-hover-border': 'rgba(165, 243, 252, 0.35)',
        };

        this.applyIconLayoutFromSettings(props);

        this.validAppIds = new Set();
        this.appMap = new Map();
        this.overlayRegistry = new Map(OVERLAY_WINDOW_LIST.map((meta) => [meta.id, meta]));
        this.folderMetadata = new Map(DEFAULT_DESKTOP_FOLDERS.map((folder) => [folder.id, folder]));
        this.windowPreviewCache = new Map();
        this.windowPreviewLastGoodCache = new Map();
        this.windowSwitcherRequestId = 0;
        this.refreshAppRegistry();

        if (!this.hasStoredPinnedAppIds) {
            this.persistPinnedAppIds(initialPinnedAppIds);
        }

        this.openSettingsTarget = null;
        this.openSettingsClickHandler = null;
        this.openSettingsListenerAttached = false;

        this.liveRegionTimeout = null;

        this.previousFocusElement = null;

        this.recentlyClosedOverlays = new Set();
        this.allAppsTriggerKey = null;
        this.allAppsCloseTimeout = null;
        this.allAppsEnterRaf = null;
        this.allAppsFocusTrapHandler = null;

        this.desktopSelectionState = null;

        this.commandPaletteUsesMeta = false;
        if (typeof navigator !== 'undefined') {
            const platform = navigator.platform || '';
            const userAgent = navigator.userAgent || '';
            this.commandPaletteUsesMeta = /Mac|iPhone|iPad|iPod/i.test(platform || userAgent);
        }

        this.longPressTimer = null;
        this.longPressState = null;
        this.longPressReleaseTimeout = null;
        this.mobileViewportActive = false;

    }

    createEmptyWorkspaceState = () => ({
        focused_windows: createOverlayFlagMap(false),
        closed_windows: createOverlayFlagMap(true),
        minimized_windows: createOverlayFlagMap(false),
        window_positions: {},
        window_sizes: {},
    });

    cloneWorkspaceState = (state) => ({
        focused_windows: { ...state.focused_windows },
        closed_windows: { ...state.closed_windows },
        minimized_windows: { ...state.minimized_windows },
        window_positions: { ...state.window_positions },
        window_sizes: { ...(state.window_sizes || {}) },
    });

    getActiveUserId = () => {
        const { user } = this.props || {};
        if (user && typeof user === 'object') {
            if (user.id) return String(user.id);
            if (user.userId) return String(user.userId);
            if (user.username) return String(user.username);
            if (user.email) return String(user.email);
        }
        if (!safeLocalStorage) return 'default';
        const candidateKeys = [
            'active-user-id',
            'active-user',
            'desktop-user',
            'current-user',
            'session-user',
        ];
        for (const key of candidateKeys) {
            const value = safeLocalStorage.getItem(key);
            if (value) return String(value);
        }
        return 'default';
    };

    getTaskbarOrderStorageKey = () => {
        const userId = this.getActiveUserId();
        return `${this.taskbarOrderKeyBase}:${userId}`;
    };

    loadTaskbarOrder = () => {
        if (!safeLocalStorage) return [];
        try {
            const stored = safeLocalStorage.getItem(this.getTaskbarOrderStorageKey());
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter((value) => typeof value === 'string');
            }
        } catch (e) {
            // ignore malformed entries and fall back to default order
        }
        return [];
    };

    persistTaskbarOrder = (order) => {
        if (!safeLocalStorage) return;
        try {
            safeLocalStorage.setItem(this.getTaskbarOrderStorageKey(), JSON.stringify(order));
        } catch (e) {
            // ignore write errors (storage may be unavailable)
        }
    };

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
            storedValue = safeLocalStorage.getItem(this.pinnedStorageKey);
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
            safeLocalStorage.setItem(this.pinnedStorageKey, JSON.stringify(Array.isArray(ids) ? ids : []));
            this.hasStoredPinnedAppIds = true;
        } catch (e) {
            // ignore persistence errors
        }
    };

    getPinnedAppIds = () => {
        return Array.isArray(this.state?.pinnedAppIds)
            ? [...this.state.pinnedAppIds]
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
        this.initFavourite = next;
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
                } else if (current === undefined && isOpen) {
                    next[id] = true;
                    changed = true;
                }

                if (current === undefined && !isPinned && !isOpen) {
                    next[id] = false;
                    changed = true;
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
            this.saveSession();
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
        const current = Array.isArray(this.state?.pinnedAppIds)
            ? this.state.pinnedAppIds
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
            if (broadcast) {
                this.broadcastWorkspaceState();
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

    getNormalizedTaskbarOrder = (runningIds, preferredOrder) => {
        const base = Array.isArray(preferredOrder)
            ? preferredOrder
            : (this.state.taskbarOrder || []);
        const normalized = [];
        const seen = new Set();

        base.forEach((id) => {
            if (typeof id !== 'string') return;
            if (!seen.has(id) && runningIds.includes(id)) {
                normalized.push(id);
                seen.add(id);
            }
        });

        runningIds.forEach((id) => {
            if (!seen.has(id)) {
                normalized.push(id);
                seen.add(id);
            }
        });

        return normalized;
    };

    setTaskbarOrder = (nextOrder) => {
        if (!Array.isArray(nextOrder)) return;
        this.setState((prevState) => {
            const current = prevState.taskbarOrder || [];
            if (
                current.length === nextOrder.length &&
                current.every((id, index) => id === nextOrder[index])
            ) {
                return null;
            }
            return { taskbarOrder: nextOrder };
        }, () => {
            const order = this.state.taskbarOrder || [];
            this.persistTaskbarOrder(order);
        });
    };

    getCurrentRunningAppIds = () => {
        const { closed_windows = {} } = this.state;
        return apps
            .filter((app) => closed_windows[app.id] === false)
            .map((app) => app.id);
    };

    normalizeTheme(theme) {
        const fallback = this.defaultThemeConfig || {};
        if (!theme) {
            return { ...fallback };
        }
        const normalized = {
            id: theme.id || fallback.id || 'default',
            accent: theme.accent || fallback.accent || '#1793d1',
            wallpaperUrl: theme.useKaliWallpaper
                ? null
                : theme.wallpaperUrl || theme.fallbackWallpaperUrl || fallback.wallpaperUrl || fallback.fallbackWallpaperUrl || null,
            fallbackWallpaperUrl: theme.fallbackWallpaperUrl || fallback.fallbackWallpaperUrl || null,
            wallpaperName: theme.wallpaperName || fallback.wallpaperName || null,
            overlay: theme.overlay !== undefined ? theme.overlay : fallback.overlay,
            useKaliWallpaper: typeof theme.useKaliWallpaper === 'boolean'
                ? theme.useKaliWallpaper
                : Boolean(fallback.useKaliWallpaper),
        };
        if (!normalized.wallpaperUrl && !normalized.useKaliWallpaper) {
            normalized.wallpaperUrl = normalized.fallbackWallpaperUrl || null;
        }
        return normalized;
    }

    themesAreEqual(themeA, themeB) {
        if (!themeA || !themeB) return false;
        return (
            themeA.id === themeB.id &&
            themeA.accent === themeB.accent &&
            themeA.wallpaperUrl === themeB.wallpaperUrl &&
            themeA.fallbackWallpaperUrl === themeB.fallbackWallpaperUrl &&
            themeA.wallpaperName === themeB.wallpaperName &&
            themeA.overlay === themeB.overlay &&
            themeA.useKaliWallpaper === themeB.useKaliWallpaper
        );
    }

    getWorkspaceTheme(index) {
        const stored = this.workspaceThemes && this.workspaceThemes[index];
        return stored ? { ...stored } : this.normalizeTheme(this.props.desktopTheme);
    }

    setWorkspaceTheme(index, theme) {
        if (!this.workspaceThemes) {
            this.workspaceThemes = [];
        }
        this.workspaceThemes[index] = this.normalizeTheme(theme);
    }
    getIconSizePresetConfig = (preset) => {
        if (preset && this.iconSizePresets && this.iconSizePresets[preset]) {
            return this.iconSizePresets[preset];
        }
        return this.iconSizePresets?.medium || {
            dimensions: { width: 96, height: 88 },
            spacing: { row: 112, column: 128 },
            padding: { top: DESKTOP_TOP_PADDING, right: 24, bottom: 120, left: 24 },
        };
    };

    getViewportBucketId = (width) => {
        const numeric = Number.isFinite(width) ? width : 0;
        if (numeric < 640) return 'lt-640';
        return numeric >= 1024 ? 'gte-1024' : 'lt-1024';
    };

    getViewportBucketLabel = (bucketId) => {
        if (!this.iconSizePresetBuckets) return 'current display';
        const bucket = this.iconSizePresetBuckets.find((entry) => entry.id === bucketId);
        return bucket ? bucket.label : 'current display';
    };

    loadStoredIconPresetMap = () => {
        const map = {};
        if (!safeLocalStorage) return map;
        try {
            const raw = safeLocalStorage.getItem(this.iconSizePresetStorageKey);
            if (!raw) return map;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return map;
            }
            const buckets = Array.isArray(this.iconSizePresetBuckets) ? this.iconSizePresetBuckets : [];
            buckets.forEach(({ id }) => {
                if (!id) return;
                const stored = parsed[id];
                if (stored && this.iconSizePresets?.[stored]) {
                    map[id] = stored;
                }
            });
            return map;
        } catch (e) {
            return map;
        }
    };

    getStoredIconSizePreset = (bucketId = this.state?.iconSizeBucket) => {
        const targetBucket = bucketId || 'gte-1024';
        const fallback = targetBucket === 'lt-640' ? 'tiny' : (targetBucket === 'lt-1024' ? 'small' : 'medium');
        if (this.iconSizePresetMap && this.iconSizePresetMap[targetBucket]) {
            return this.iconSizePresetMap[targetBucket];
        }
        if (!safeLocalStorage) return fallback;
        try {
            const map = this.loadStoredIconPresetMap();
            this.iconSizePresetMap = map;
            if (map[targetBucket]) {
                return map[targetBucket];
            }
            const legacy = safeLocalStorage.getItem(this.iconSizePresetLegacyKey);
            if (legacy && this.iconSizePresets?.[legacy]) {
                this.iconSizePresetMap = { ...(this.iconSizePresetMap || {}), [targetBucket]: legacy };
                this.persistIconSizePreset(legacy, targetBucket);
                return legacy;
            }
        } catch (e) {
            // ignore read errors
        }
        return fallback;
    };

    persistIconSizePreset = (preset, bucketId = this.state?.iconSizeBucket) => {
        if (!safeLocalStorage) return;
        const normalizedPreset = this.iconSizePresets?.[preset] ? preset : 'medium';
        const targetBucket = bucketId || 'gte-1024';
        const nextMap = { ...(this.iconSizePresetMap || {}) };
        nextMap[targetBucket] = normalizedPreset;
        try {
            safeLocalStorage.setItem(this.iconSizePresetStorageKey, JSON.stringify(nextMap));
            safeLocalStorage.removeItem(this.iconSizePresetLegacyKey);
            this.iconSizePresetMap = nextMap;
        } catch (e) {
            // ignore write errors
        }
    };

    broadcastIconSizePreset = (preset, bucketId = this.state?.iconSizeBucket) => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('desktop-icon-size', { detail: { preset, bucket: bucketId } }));
    };

    handleViewportBucketChange = (width, options = {}) => {
        const { force = false } = options || {};
        const numericWidth = Number.isFinite(width) ? width : 0;
        this.latestViewportWidth = numericWidth;
        const nextBucket = this.getViewportBucketId(numericWidth);
        const currentBucket = this.state?.iconSizeBucket;
        if (!force && nextBucket === currentBucket) {
            return;
        }
        const storedPreset = this.getStoredIconSizePreset(nextBucket);
        this.setIconSizePreset(storedPreset, { bucketId: nextBucket, persist: false });
    };

    setupViewportObserver = () => {
        const node = this.desktopRef && this.desktopRef.current ? this.desktopRef.current : null;
        const fallbackWidth = (() => {
            if (node && typeof node.getBoundingClientRect === 'function') {
                return node.getBoundingClientRect().width;
            }
            if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
                return window.innerWidth;
            }
            return 0;
        })();

        if (typeof ResizeObserver === 'undefined' || !node) {
            this.handleViewportBucketChange(fallbackWidth, { force: true });
            return;
        }

        if (this.viewportResizeObserver && typeof this.viewportResizeObserver.disconnect === 'function') {
            this.viewportResizeObserver.disconnect();
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries && entries.length ? entries[0] : null;
            const widthFromEntry = entry?.contentRect?.width;
            let nextWidth = Number.isFinite(widthFromEntry) ? widthFromEntry : null;
            if (nextWidth === null) {
                if (node && typeof node.getBoundingClientRect === 'function') {
                    nextWidth = node.getBoundingClientRect().width;
                } else if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
                    nextWidth = window.innerWidth;
                } else {
                    nextWidth = 0;
                }
            }
            this.handleViewportBucketChange(nextWidth);
        });

        observer.observe(node);
        this.viewportResizeObserver = observer;
        this.handleViewportBucketChange(fallbackWidth, { force: true });
    };

    teardownViewportObserver = () => {
        if (this.viewportResizeObserver && typeof this.viewportResizeObserver.disconnect === 'function') {
            this.viewportResizeObserver.disconnect();
        }
        this.viewportResizeObserver = null;
    };

    commitWorkspacePartial = (partial, index) => {
        const targetIndex = typeof index === 'number' ? index : this.state.activeWorkspace;
        const snapshot = this.workspaceSnapshots[targetIndex] || this.createEmptyWorkspaceState();
        const nextSnapshot = { ...snapshot };
        Object.entries(partial).forEach(([key, value]) => {
            if (this.workspaceKeys.has(key)) {
                nextSnapshot[key] = value;
            }
        });
        this.workspaceSnapshots[targetIndex] = nextSnapshot;
    };

    mergeWorkspaceMaps = (current = {}, base = {}, validKeys = null) => {
        const keys = validKeys
            ? Array.from(validKeys)
            : Array.from(new Set([...Object.keys(base), ...Object.keys(current)]));
        const merged = {};
        keys.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
                merged[key] = current[key];
            } else if (Object.prototype.hasOwnProperty.call(base, key)) {
                merged[key] = base[key];
            }
        });
        return merged;
    };

    setupPointerMediaWatcher = () => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            this.configureTouchTargets(false);
            return;
        }
        const query = window.matchMedia('(pointer: coarse)');
        this.pointerMedia = query;
        const listener = (event) => {
            this.configureTouchTargets(event.matches);
        };
        this.pointerMediaListener = listener;
        this.configureTouchTargets(query.matches);
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', listener);
        } else if (typeof query.addListener === 'function') {
            query.addListener(listener);
        }
    };

    teardownPointerMediaWatcher = () => {
        if (!this.pointerMedia) return;
        const listener = this.pointerMediaListener;
        if (listener) {
            if (typeof this.pointerMedia.removeEventListener === 'function') {
                this.pointerMedia.removeEventListener('change', listener);
            } else if (typeof this.pointerMedia.removeListener === 'function') {
                this.pointerMedia.removeListener(listener);
            }
        }
        this.pointerMedia = null;
        this.pointerMediaListener = null;
    };

    configureTouchTargets = (isCoarse) => {
        this.currentPointerIsCoarse = Boolean(isCoarse);
        const presetConfig = this.getIconSizePresetConfig(this.state.iconSizePreset);
        this.baseIconDimensions = { ...presetConfig.dimensions };
        this.baseIconGridSpacing = { ...presetConfig.spacing };
        this.baseDesktopPadding = { ...presetConfig.padding };
        const layoutChanged = this.applyIconLayoutFromSettings(this.props);
        if (layoutChanged) {
            this.realignIconPositions();
        }
    };

    applyIconLayoutFromSettings = (props = this.props) => {
        const density = props?.density === 'compact' ? 'compact' : 'regular';
        const rawFontScale = typeof props?.fontScale === 'number' ? props.fontScale : 1;
        const fontScale = Number.isFinite(rawFontScale) ? rawFontScale : 1;
        const largeHitAreas = Boolean(props?.largeHitAreas);

        const clamp = (value, min, max) => {
            const safe = Number.isFinite(value) ? value : min;
            return Math.min(Math.max(safe, min), max);
        };

        const normalizedFont = clamp(fontScale, 0.85, 1.6);
        const pointerMultiplier = this.currentPointerIsCoarse ? 1.08 : 1;
        const densitySizeMultiplier = density === 'compact' ? 0.9 : 1;
        const densitySpacingMultiplier = density === 'compact' ? 0.88 : 1;
        const densityPaddingMultiplier = density === 'compact' ? 0.92 : 1;
        const hitAreaSizeMultiplier = largeHitAreas || this.currentPointerIsCoarse ? 1.12 : 1;
        const hitAreaSpacingMultiplier = largeHitAreas || this.currentPointerIsCoarse ? 1.15 : 1;

        const sizeMultiplier = normalizedFont * densitySizeMultiplier * hitAreaSizeMultiplier * pointerMultiplier;
        const spacingMultiplier = normalizedFont * densitySpacingMultiplier * hitAreaSpacingMultiplier * pointerMultiplier;
        const paddingMultiplier = normalizedFont * densityPaddingMultiplier * hitAreaSpacingMultiplier * pointerMultiplier;

        const activePresetConfig = this.getIconSizePresetConfig(this.state.iconSizePreset);
        const baseDimensions = this.baseIconDimensions || activePresetConfig.dimensions;
        const baseSpacing = this.baseIconGridSpacing || activePresetConfig.spacing;
        const basePaddingConfig = this.baseDesktopPadding || activePresetConfig.padding;

        const nextIconDimensions = {
            width: clamp(Math.round(baseDimensions.width * sizeMultiplier), 72, 192),
            height: clamp(Math.round(baseDimensions.height * sizeMultiplier), 64, 176),
        };

        const nextIconGridSpacing = {
            row: clamp(Math.round(baseSpacing.row * spacingMultiplier), 96, 256),
            column: clamp(Math.round(baseSpacing.column * spacingMultiplier), 108, 288),
        };

        const safeArea = getSafeAreaInsets();
        const basePadding = {
            top: clamp(Math.round(basePaddingConfig.top * paddingMultiplier), 40, 256),
            right: clamp(Math.round(basePaddingConfig.right * paddingMultiplier), 16, 220),
            bottom: clamp(Math.round(basePaddingConfig.bottom * paddingMultiplier), 72, 384),
            left: clamp(Math.round(basePaddingConfig.left * paddingMultiplier), 16, 220),
        };

        const nextDesktopPadding = {
            top: basePadding.top + safeArea.top,
            right: basePadding.right + safeArea.right,
            bottom: basePadding.bottom + safeArea.bottom,
            left: basePadding.left + safeArea.left,
        };

        const mediumDimensions = this.iconSizePresets.medium.dimensions;
        const dimensionScale = mediumDimensions?.width ? baseDimensions.width / mediumDimensions.width : 1;
        const fontBase = normalizedFont * (density === 'compact' ? 0.95 : 1);
        const iconPaddingRem = (0.25 * dimensionScale * hitAreaSpacingMultiplier).toFixed(3);
        const iconGapRem = (0.375 * dimensionScale * hitAreaSpacingMultiplier).toFixed(3);
        const fontSizeRem = (0.75 * dimensionScale * fontBase).toFixed(3);
        const lineHeightRem = Math.max(1.05, 1.1 * dimensionScale * fontBase).toFixed(3);
        const baseImageSize = Math.round((baseDimensions.width || 96) * 0.5);
        const imageSize = clamp(Math.round(baseImageSize * sizeMultiplier), 32, 128);

        const cssVariables = {
            '--desktop-icon-width': `${nextIconDimensions.width}px`,
            '--desktop-icon-height': `${nextIconDimensions.height}px`,
            '--desktop-icon-padding': `${iconPaddingRem}rem`,
            '--desktop-icon-gap': `${iconGapRem}rem`,
            '--desktop-icon-font-size': `${fontSizeRem}rem`,
            '--desktop-icon-image': `${imageSize}px`,
            '--desktop-icon-line-height': `${lineHeightRem}rem`,
        };

        const changed =
            nextIconDimensions.width !== this.iconDimensions.width ||
            nextIconDimensions.height !== this.iconDimensions.height ||
            nextIconGridSpacing.row !== this.iconGridSpacing.row ||
            nextIconGridSpacing.column !== this.iconGridSpacing.column ||
            nextDesktopPadding.top !== this.desktopPadding.top ||
            nextDesktopPadding.right !== this.desktopPadding.right ||
            nextDesktopPadding.bottom !== this.desktopPadding.bottom ||
            nextDesktopPadding.left !== this.desktopPadding.left;

        this.desktopIconVariables = cssVariables;

        if (changed) {
            this.iconDimensions = nextIconDimensions;
            this.iconGridSpacing = nextIconGridSpacing;
            this.desktopPadding = nextDesktopPadding;
        }

        return changed;
    };

    handleViewportResize = () => {
        this.configureTouchTargets(this.currentPointerIsCoarse);
        this.realignIconPositions();

        if (typeof window === 'undefined') return;

        const viewportWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
        const viewportHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
        this.handleViewportBucketChange(viewportWidth);
        const isCompact = this.isCompactViewport(viewportWidth);
        if (this.mobileViewportActive !== isCompact) {
            this.mobileViewportActive = isCompact;
            if (isCompact) {
                this.autoMaximizeFocusedWindow();
            }
        }
        const topOffset = measureWindowTopOffset();
        const closedWindows = this.state.closed_windows || {};
        const storedPositions = this.state.window_positions || {};
        const nextPositions = { ...storedPositions };
        let changed = false;

        const extractPositionFromNode = (node) => {
            if (!node || !node.style) return null;
            const parse = (value) => {
                if (typeof value !== 'string') return null;
                const parsed = parseFloat(value);
                return Number.isFinite(parsed) ? parsed : null;
            };
            if (typeof node.style.getPropertyValue === 'function') {
                const xVar = parse(node.style.getPropertyValue('--window-transform-x'));
                const yVar = parse(node.style.getPropertyValue('--window-transform-y'));
                if (xVar !== null && yVar !== null) {
                    return { x: xVar, y: yVar };
                }
            }
            if (typeof node.style.transform === 'string') {
                const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(node.style.transform);
                if (match) {
                    const parsedX = parseFloat(match[1]);
                    const parsedY = parseFloat(match[2]);
                    if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
                        return { x: parsedX, y: parsedY };
                    }
                }
            }
            return null;
        };

        Object.keys(closedWindows).forEach((id) => {
            if (closedWindows[id] !== false) return;
            const node = typeof document !== 'undefined' ? document.getElementById(id) : null;
            let position = nextPositions[id];
            if (!position && node) {
                const extracted = extractPositionFromNode(node);
                if (extracted) {
                    position = extracted;
                    nextPositions[id] = { ...extracted };
                }
            }
            if (!position) return;

            const rect = node && typeof node.getBoundingClientRect === 'function'
                ? node.getBoundingClientRect()
                : null;
            const clamped = clampWindowPositionWithinViewport(position, rect, {
                viewportWidth,
                viewportHeight,
                topOffset,
            });
            if (!clamped) return;
            if (clamped.x !== position.x || clamped.y !== position.y) {
                nextPositions[id] = { x: clamped.x, y: clamped.y };
                changed = true;
            }
        });

        if (changed) {
            this.setWorkspaceState({ window_positions: nextPositions }, this.saveSession);
        }
    };

    computeTouchCentroid = (touchList) => {
        if (!touchList || touchList.length === 0) return null;
        const touches = Array.from(touchList);
        const total = touches.reduce(
            (acc, touch) => {
                acc.x += touch.clientX;
                acc.y += touch.clientY;
                return acc;
            },
            { x: 0, y: 0 }
        );
        return {
            x: total.x / touches.length,
            y: total.y / touches.length,
        };
    };

    setupGestureListeners = () => {
        const node = this.desktopRef && this.desktopRef.current ? this.desktopRef.current : null;
        if (!node) return;
        if (this.gestureRoot && this.gestureRoot !== node) {
            this.teardownGestureListeners();
        }
        if (this.gestureListenersAttached) return;
        this.gestureListenersAttached = true;
        this.gestureRoot = node;
        const options = { passive: true };
        node.addEventListener('pointerdown', this.handleShellPointerDown, options);
        node.addEventListener('pointermove', this.handleShellPointerMove, options);
        node.addEventListener('pointerup', this.handleShellPointerUp, options);
        node.addEventListener('pointercancel', this.handleShellPointerCancel, options);
        node.addEventListener('touchstart', this.handleShellTouchStart, options);
        node.addEventListener('touchmove', this.handleShellTouchMove, options);
        node.addEventListener('touchend', this.handleShellTouchEnd, options);
        node.addEventListener('touchcancel', this.handleShellTouchCancel, options);
    };

    teardownGestureListeners = () => {
        const node = this.gestureRoot;
        if (!node || !this.gestureListenersAttached) return;
        this.gestureListenersAttached = false;
        node.removeEventListener('pointerdown', this.handleShellPointerDown);
        node.removeEventListener('pointermove', this.handleShellPointerMove);
        node.removeEventListener('pointerup', this.handleShellPointerUp);
        node.removeEventListener('pointercancel', this.handleShellPointerCancel);
        node.removeEventListener('touchstart', this.handleShellTouchStart);
        node.removeEventListener('touchmove', this.handleShellTouchMove);
        node.removeEventListener('touchend', this.handleShellTouchEnd);
        node.removeEventListener('touchcancel', this.handleShellTouchCancel);
        this.gestureRoot = null;
        this.gestureState.pointer = null;
        this.gestureState.overview = null;
    };

    handleShellPointerDown = (event) => {
        if (event.pointerType !== 'touch' || event.isPrimary === false) return;
        const targetWindow = event.target && event.target.closest ? event.target.closest('.opened-window') : null;
        if (!targetWindow || !targetWindow.id) return;
        this.gestureState.pointer = {
            pointerId: event.pointerId,
            windowId: targetWindow.id,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
    };

    handleShellPointerMove = (event) => {
        const gesture = this.gestureState.pointer;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
    };

    handleShellPointerUp = (event) => {
        const gesture = this.gestureState.pointer;
        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }
        this.gestureState.pointer = null;
        if (!gesture.windowId) return;
        const deltaX = gesture.lastX - gesture.startX;
        const deltaY = gesture.lastY - gesture.startY;
        const distance = Math.abs(deltaX);
        const verticalDrift = Math.abs(deltaY);
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = now - gesture.startTime;
        if (distance < 120 || verticalDrift > 90 || duration > 600) {
            return;
        }
        const velocity = distance / Math.max(duration, 1);
        if (velocity < 0.35) {
            return;
        }
        const direction = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
        const dispatched = this.dispatchWindowCommand(gesture.windowId, direction);
        if (dispatched) {
            this.focus(gesture.windowId);
        }
    };

    handleShellPointerCancel = (event) => {
        const gesture = this.gestureState.pointer;
        if (gesture && gesture.pointerId === event.pointerId) {
            this.gestureState.pointer = null;
        }
    };

    handleShellTouchStart = (event) => {
        if (event.touches && event.touches.length > 1) {
            this.gestureState.pointer = null;
        }
        if (!event.touches || event.touches.length !== 3) return;
        const centroid = this.computeTouchCentroid(event.touches);
        if (!centroid) return;
        this.gestureState.overview = {
            startY: centroid.y,
            lastY: centroid.y,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
            triggered: false,
        };
    };

    handleShellTouchMove = (event) => {
        const gesture = this.gestureState.overview;
        if (!gesture) return;
        const centroid = this.computeTouchCentroid(event.touches);
        if (!centroid) return;
        gesture.lastY = centroid.y;
    };

    handleShellTouchEnd = (event) => {
        const gesture = this.gestureState.overview;
        if (!gesture) {
            return;
        }
        if (event.touches && event.touches.length > 0) {
            return;
        }
        const deltaY = gesture.startY - (gesture.lastY ?? gesture.startY);
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = now - gesture.startTime;
        const shouldTrigger = deltaY > 60 || (deltaY > 40 && duration < 400);
        if (shouldTrigger && !gesture.triggered) {
            if (!this.isOverlayOpen(SWITCHER_OVERLAY_ID)) {
                this.openWindowSwitcher();
            }
            gesture.triggered = true;
        }
        this.gestureState.overview = null;
    };

    handleShellTouchCancel = () => {
        this.gestureState.overview = null;
    };

    resolveContextTarget = (target) => {
        if (!target || typeof target.closest !== 'function') {
            return { context: null, appId: null, contextNode: null };
        }
        const contextNode = target.closest('[data-context]');
        return {
            context: contextNode ? contextNode.dataset.context : null,
            appId: contextNode ? contextNode.dataset.appId : null,
            contextNode: contextNode || null,
        };
    };

    openContextMenuFromTarget = (target, event) => {
        const { context, appId } = this.resolveContextTarget(target);
        this.openContextMenuFromContext(context, appId, event);
    };

    openContextMenuFromContext = (context, appId, event) => {
        this.hideAllContextMenu();
        const fakeEvent = event || {};
        switch (context) {
            case "desktop-area":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Desktop Context Menu`,
                });
                this.showContextMenu(fakeEvent, "desktop");
                break;
            case "app":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened App Context Menu`,
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "app"));
                break;
            case "taskbar":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Taskbar Context Menu`,
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "taskbar"));
                break;
            default:
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Default Context Menu`,
                });
                this.showContextMenu(fakeEvent, "default");
        }
    };

    clearLongPressTimer = () => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    };

    clearLongPressReleaseTimeout = () => {
        if (this.longPressReleaseTimeout) {
            clearTimeout(this.longPressReleaseTimeout);
            this.longPressReleaseTimeout = null;
        }
    };

    clearLongPressState = (pointerId) => {
        if (!this.longPressState) return;
        if (pointerId && this.longPressState.pointerId !== pointerId) return;
        this.clearLongPressTimer();
        this.clearLongPressReleaseTimeout();
        this.longPressState = null;
    };

    isLongPressTriggered = (event) => {
        if (!this.longPressState || !this.longPressState.triggered) return false;
        if (typeof event?.pointerId === 'number' && this.longPressState.pointerId !== event.pointerId) {
            return false;
        }
        return true;
    };

    handleTouchContextStart = (event) => {
        if (event.pointerType !== 'touch' || event.isPrimary === false) return;
        if (typeof event.button === 'number' && event.button !== 0) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

        this.clearLongPressTimer();
        this.longPressState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            target,
            triggered: false,
        };

        const pageX = typeof event.pageX === 'number' ? event.pageX : event.clientX;
        const pageY = typeof event.pageY === 'number' ? event.pageY : event.clientY;
        this.longPressTimer = setTimeout(() => {
            if (!this.longPressState || this.longPressState.pointerId !== event.pointerId) return;
            this.longPressState.triggered = true;
            this.longPressState.blockClicksUntil = Date.now() + 800;
            this.preventNextIconClick = true;
            this.cancelIconDrag(true);
            this.clearDesktopSelection();
            this.openContextMenuFromTarget(target, { pageX, pageY });
            this.clearLongPressReleaseTimeout();
            this.longPressReleaseTimeout = setTimeout(() => {
                this.clearLongPressState(event.pointerId);
            }, 900);
        }, 550);
    };

    handleTouchContextMove = (event) => {
        const state = this.longPressState;
        if (!state || event.pointerId !== state.pointerId) return;
        const deltaX = event.clientX - state.startX;
        const deltaY = event.clientY - state.startY;
        if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
            this.clearLongPressState(event.pointerId);
        }
    };

    handleTouchContextEnd = (event) => {
        if (this.isLongPressTriggered(event)) {
            return;
        }
        this.clearLongPressState(event.pointerId);
    };

    handleTouchContextCancel = (event) => {
        this.clearLongPressState(event.pointerId);
    };

    handleLongPressClickCapture = (event) => {
        const state = this.longPressState;
        if (!state || !state.triggered) return;
        const blockUntil = state.blockClicksUntil;
        if (blockUntil && Date.now() > blockUntil) {
            this.clearLongPressState(state.pointerId);
            return;
        }
        const target = event.target instanceof Element ? event.target : null;
        if (state.target && target && state.target.contains(target)) {
            event.preventDefault();
            event.stopPropagation();
            this.clearLongPressState(state.pointerId);
        }
    };

    clearDesktopSelection = () => {
        const selectionState = this.desktopSelectionState;
        if (selectionState) {
            selectionState.container?.releasePointerCapture?.(selectionState.pointerId);
            this.desktopSelectionState = null;
        }
        this.setState((prevState) => (prevState.marqueeSelection ? { marqueeSelection: null } : null));
    };

    isCompactViewport = (widthOverride) => {
        const width = Number.isFinite(widthOverride)
            ? widthOverride
            : (typeof window !== 'undefined' ? window.innerWidth : 0);
        if (!width) return false;
        if (width < 640) return true;
        return this.currentPointerIsCoarse && width < 768;
    };

    shouldAutoMaximizeWindows = () => {
        if (typeof window === 'undefined') return false;
        return this.isCompactViewport(window.innerWidth);
    };

    autoMaximizeFocusedWindow = () => {
        if (!this.shouldAutoMaximizeWindows()) return;
        const focused = this.getFocusedWindowId();
        if (focused) {
            this.autoMaximizeWindow(focused);
        }
    };

    autoMaximizeWindow = (id) => {
        if (!id || !this.shouldAutoMaximizeWindows()) return;
        const app = this.getAppById(id);
        if (app && app.allowMaximize === false) return;
        if (this.isOverlayId(id)) return;
        const node = typeof document !== 'undefined' ? document.getElementById(id) : null;
        if (node && node.getAttribute('data-window-state') === 'maximized') {
            return;
        }
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(() => this.dispatchWindowCommand(id, 'ArrowUp'));
        } else {
            this.dispatchWindowCommand(id, 'ArrowUp');
        }
    };

    dispatchWindowCommand = (windowId, key) => {
        if (!windowId) return false;
        const node = typeof document !== 'undefined' ? document.getElementById(windowId) : null;
        if (!node) return false;
        const event = new CustomEvent('super-arrow', { detail: key, bubbles: true });
        node.dispatchEvent(event);
        return true;
    };

    updateWorkspaceSnapshots = (baseState) => {
        const validKeys = new Set(Object.keys(baseState.closed_windows || {}));
        this.workspaceSnapshots = this.workspaceSnapshots.map((snapshot, index) => {
            const existing = snapshot || this.createEmptyWorkspaceState();
            if (index === this.state.activeWorkspace) {
                return this.cloneWorkspaceState(baseState);
            }
            return {
                focused_windows: this.mergeWorkspaceMaps(existing.focused_windows, baseState.focused_windows, validKeys),
                closed_windows: this.mergeWorkspaceMaps(existing.closed_windows, baseState.closed_windows, validKeys),
                minimized_windows: this.mergeWorkspaceMaps(existing.minimized_windows, baseState.minimized_windows, validKeys),
                window_positions: this.mergeWorkspaceMaps(existing.window_positions, baseState.window_positions, validKeys),
                window_sizes: this.mergeWorkspaceMaps(existing.window_sizes, baseState.window_sizes, validKeys),
            };
        });
    };

    getWorkspaceWindows = (workspaceId) => {
        const snapshot = this.workspaceSnapshots[workspaceId];
        const stateSource = (workspaceId === this.state.activeWorkspace) ? this.state : (snapshot || this.createEmptyWorkspaceState());

        const closed = stateSource.closed_windows || {};
        const minimized = stateSource.minimized_windows || {};
        const focused = stateSource.focused_windows || {};
        const positions = stateSource.window_positions || {};
        const sizes = stateSource.window_sizes || {};

        const openWindowIds = Object.keys(closed).filter(id => closed[id] === false);

        const stack = this.workspaceStacks[workspaceId] || [];
        const ordered = stack.filter(id => openWindowIds.includes(id));

        openWindowIds.forEach(id => {
            if (!ordered.includes(id)) ordered.push(id);
        });

        return ordered.map(id => {
            const app = this.getAppById(id);
            if (!app) return null;

            const pos = positions[id] || {};
            const size = sizes[id] || {};

            // Fallback logic if stored size is incomplete
            const width = (size.width && size.width > 0)
                ? size.width
                : (app.defaultWidth || 800);

            const height = (size.height && size.height > 0)
                ? size.height
                : (app.defaultHeight || 600);

            // Fix relative icon paths (e.g. ./themes/...)
            const icon = app.icon ? app.icon.replace(/^\.\//, '/') : '';

            return {
                id,
                title: app.title || app.name || id,
                icon,
                isMinimized: Boolean(minimized[id]),
                isFocused: Boolean(focused[id]),
                x: pos.x || 0,
                y: pos.y || 0,
                w: width,
                h: height
            };
        }).filter(Boolean);
    };

    getWorkspaceSummaries = () => {
        return this.state.workspaces.map((workspace) => {
            const snapshot = this.workspaceSnapshots[workspace.id] || this.createEmptyWorkspaceState();
            const openWindows = Object.values(snapshot.closed_windows || {}).filter((value) => value === false).length;
            const windows = this.getWorkspaceWindows(workspace.id);
            return {
                id: workspace.id,
                label: workspace.label,
                openWindows,
                windows,
            };
        });
    };

    getPinnedAppSummaries = () => {
        const pinnedIds = this.getPinnedAppIds();
        if (!pinnedIds.length) return [];

        const {
            closed_windows = {},
            minimized_windows = {},
            focused_windows = {},
        } = this.state;

        return pinnedIds.map((id) => {
            const app = this.getAppById(id);
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

    getRunningAppSummaries = () => {
        const {
            closed_windows = {},
            minimized_windows = {},
            focused_windows = {},
            overlayWindows = {},
            appBadges = {},
        } = this.state;
        const summaries = [];
        const appIndex = new Map(apps.map((app) => [app.id, app]));
        const runningIds = Object.keys(closed_windows).filter((id) => closed_windows[id] === false);
        const orderedIds = this.getNormalizedTaskbarOrder(runningIds, this.state.taskbarOrder || runningIds);

        orderedIds.forEach((id) => {
            const app = appIndex.get(id);
            if (!app) return;
            const badge = appBadges[id];
            const summary = {
                id,
                title: app.title,
                icon: app.icon.replace('./', '/'),
                isFocused: Boolean(focused_windows[id]),
                isMinimized: Boolean(minimized_windows[id]),
            };
            if (badge) {
                summary.badge = { ...badge };
            }
            summaries.push(summary);
        });
        OVERLAY_WINDOW_LIST.forEach((overlay) => {
            const state = overlayWindows?.[overlay.id] || {};
            const isOpen = state.open === true || closed_windows[overlay.id] === false;
            if (!isOpen) {
                return;
            }
            const isMinimized = typeof state.minimized === 'boolean'
                ? state.minimized
                : Boolean(minimized_windows[overlay.id]);
            const isFocused = typeof state.focused === 'boolean'
                ? state.focused
                : Boolean(focused_windows[overlay.id]);
            const badge = appBadges[overlay.id];
            const summary = {
                id: overlay.id,
                title: overlay.title,
                icon: overlay.icon,
                isFocused,
                isMinimized,
                isOverlay: true,
            };
            if (badge) {
                summary.badge = { ...badge };
            }
            summaries.push(summary);
        });
        return summaries;
    };

    setWorkspaceState = (updater, callback) => {
        if (typeof updater === 'function') {
            this.setState((prevState) => {
                const partial = updater(prevState);
                this.commitWorkspacePartial(partial, prevState.activeWorkspace);
                return partial;
            }, callback);
        } else {
            this.commitWorkspacePartial(updater);
            this.setState(updater, callback);
        }
    };

    setIconSizePreset = (preset, options = {}) => {
        const { bucketId, persist = true, broadcast = true } = options || {};
        const activeBucket = bucketId || this.state.iconSizeBucket;
        const normalizedBucket = activeBucket || 'gte-1024';
        const normalizedPreset = preset && this.iconSizePresets?.[preset] ? preset : 'medium';
        const presetConfig = this.getIconSizePresetConfig(normalizedPreset);
        this.baseIconDimensions = { ...presetConfig.dimensions };
        this.baseIconGridSpacing = { ...presetConfig.spacing };
        this.baseDesktopPadding = { ...presetConfig.padding };
        if (persist) {
            this.persistIconSizePreset(normalizedPreset, normalizedBucket);
        }
        if (!this._isMounted) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state = {
                ...this.state,
                iconSizePreset: normalizedPreset,
                iconSizeBucket: normalizedBucket,
            };
            return;
        }

        const applyLayout = () => {
            const changed = this.applyIconLayoutFromSettings(this.props);
            if (changed) {
                this.realignIconPositions();
            }
            if (broadcast) {
                this.broadcastIconSizePreset(normalizedPreset, normalizedBucket);
            }
            this.broadcastWorkspaceState();
        };

        if (
            normalizedPreset === this.state.iconSizePreset &&
            normalizedBucket === this.state.iconSizeBucket
        ) {
            applyLayout();
            return;
        }

        this.setState(
            { iconSizePreset: normalizedPreset, iconSizeBucket: normalizedBucket },
            applyLayout
        );
    };

    loadDesktopIconPositions = () => {
        if (!safeLocalStorage) return {};
        try {
            const stored = safeLocalStorage.getItem('desktop_icon_positions');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    };

    persistIconPositions = () => {
        if (!safeLocalStorage) return;
        const positions = this.state.desktop_icon_positions || {};
        try {
            safeLocalStorage.setItem('desktop_icon_positions', JSON.stringify(positions));
            this.savedIconPositions = { ...positions };
        } catch (e) {
            // ignore write errors (storage may be unavailable)
        }
    };

    persistFolderContents = (contents) => {
        const source = contents ?? this.state.folder_contents ?? {};
        const normalized = {};
        if (source && typeof source === 'object') {
            Object.entries(source).forEach(([folderId, entries]) => {
                if (!folderId) return;
                if (!Array.isArray(entries)) {
                    normalized[folderId] = [];
                    return;
                }
                const sanitized = entries
                    .map((entry) => sanitizeFolderItem(entry))
                    .filter(Boolean);
                normalized[folderId] = sanitized;
            });
        }
        persistStoredFolderContents(normalized);
    };

    loadWindowSizes = () => loadStoredWindowSizes(this.windowSizeStorageKey);

    persistWindowSizes = (sizes) => {
        const storage = resolveStorage();
        if (!storage) return;
        try {
            storage.setItem(this.windowSizeStorageKey, JSON.stringify(sizes));
        } catch (e) {
            // ignore write errors (storage may be unavailable)
        }
    };

    ensureIconPositions = (desktopApps = []) => {
        if (!Array.isArray(desktopApps)) return;
        this.setState((prevState) => {
            const current = prevState.desktop_icon_positions || {};
            const layout = this.resolveIconLayout(desktopApps, current);
            if (this.areIconLayoutsEqual(current, layout)) {
                return null;
            }
            return { desktop_icon_positions: layout };
        }, () => {
            this.persistIconPositions();
        });
    };

    getAllFolderItemIds = (contents = this.state.folder_contents) => {
        const ids = new Set();
        if (!contents || typeof contents !== 'object') return ids;
        Object.values(contents).forEach((items) => {
            if (!Array.isArray(items)) return;
            items.forEach((item) => {
                if (!item) return;
                if (typeof item === 'string') {
                    ids.add(item);
                    return;
                }
                if (typeof item === 'object' && typeof item.id === 'string') {
                    ids.add(item.id);
                }
            });
        });
        return ids;
    };

    isFolderApp = (appOrId, fallbackId = null) => {
        if (!appOrId && !fallbackId) return false;
        const id = typeof appOrId === 'string' ? appOrId : (appOrId?.id || fallbackId);
        if (!id) return false;
        if (appOrId && typeof appOrId === 'object' && appOrId.isFolder) return true;
        const contents = this.state.folder_contents || {};
        return Object.prototype.hasOwnProperty.call(contents, id);
    };

    ensureFolderEntry = (folderId) => {
        if (!folderId) return;
        this.setState((prevState) => {
            const current = prevState.folder_contents || {};
            if (Object.prototype.hasOwnProperty.call(current, folderId)) {
                return null;
            }
            return { folder_contents: { ...current, [folderId]: [] } };
        }, this.persistFolderContents);
    };

    getFolderDropTarget = (event, dragState) => {
        if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
            return null;
        }
        const rect = this.getDesktopRect();
        if (!rect) return null;
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        if (!Number.isFinite(localX) || !Number.isFinite(localY)) return null;
        const desktopApps = this.state.desktop_apps || [];
        for (let index = 0; index < desktopApps.length; index += 1) {
            const appId = desktopApps[index];
            if (!appId || appId === dragState?.id) continue;
            const app = this.getAppById(appId);
            if (!this.isFolderApp(app, appId)) continue;
            const bounds = this.getIconBounds(appId, index);
            if (!bounds) continue;
            const withinX = localX >= bounds.left && localX <= bounds.left + bounds.width;
            const withinY = localY >= bounds.top && localY <= bounds.top + bounds.height;
            if (withinX && withinY) {
                return { type: 'folder', id: appId };
            }
        }
        return null;
    };

    moveIconIntoFolder = (iconId, folderId) => {
        if (!iconId || !folderId) return;
        const app = this.getAppById(iconId);
        if (!app) return;
        this.setState((prevState) => {
            const desktopApps = Array.isArray(prevState.desktop_apps)
                ? prevState.desktop_apps.filter((id) => id !== iconId)
                : [];
            const positions = { ...(prevState.desktop_icon_positions || {}) };
            if (positions[iconId]) {
                delete positions[iconId];
            }
            const currentContents = prevState.folder_contents || {};
            const folderItems = Array.isArray(currentContents[folderId])
                ? currentContents[folderId].slice()
                : [];
            const exists = folderItems.some((item) => {
                if (!item) return false;
                if (typeof item === 'string') return item === iconId;
                return item.id === iconId;
            });
            if (!exists) {
                folderItems.push({
                    id: iconId,
                    title: app.title || app.name || iconId,
                    icon: app.icon,
                });
            }
            const nextContents = { ...currentContents, [folderId]: folderItems };
            const nextSelected = prevState.selectedIcons instanceof Set
                ? new Set(prevState.selectedIcons)
                : new Set();
            nextSelected.delete(iconId);
            let nextAnchor = prevState.selectionAnchorId;
            if (!nextSelected.size) {
                nextAnchor = null;
            } else if (nextAnchor === iconId) {
                const first = nextSelected.values().next().value;
                nextAnchor = first ?? null;
            }
            return {
                desktop_apps: desktopApps,
                desktop_icon_positions: positions,
                folder_contents: nextContents,
                selectedIcons: nextSelected,
                selectionAnchorId: nextAnchor,
                draggingIconId: null,
            };
        }, () => {
            this.persistIconPositions();
            this.persistFolderContents();
        });
    };

    getFolderContext = (folderId) => {
        if (!folderId) return null;
        const contents = this.state.folder_contents?.[folderId];
        if (!Array.isArray(contents)) {
            const meta = this.folderMetadata?.get(folderId) || null;
            const app = this.getAppById(folderId);
            return {
                folderId,
                folderItems: [],
                folderTitle: meta?.title || app?.title || folderId,
                folderDescription: meta?.description,
            };
        }
        const items = contents.map((item) => {
            if (!item) return null;
            if (typeof item === 'string') {
                return { id: item, title: item };
            }
            return {
                id: item.id,
                title: item.title || item.id,
                icon: item.icon,
            };
        }).filter(Boolean);
        const meta = this.folderMetadata?.get(folderId) || null;
        const app = this.getAppById(folderId);
        return {
            folderId,
            folderItems: items,
            folderTitle: meta?.title || app?.title || folderId,
            folderDescription: meta?.description,
        };
    };

    getDesktopRect = () => {
        if (this.desktopRef && this.desktopRef.current) {
            return this.desktopRef.current.getBoundingClientRect();
        }
        return null;
    };

    getDesktopBounds = () => {
        const rect = this.getDesktopRect();
        if (rect) {
            return { width: rect.width, height: rect.height };
        }
        if (typeof window !== 'undefined') {
            return { width: window.innerWidth, height: window.innerHeight };
        }
        return { width: 1280, height: 720 };
    };

    computeGridMetrics = () => {
        const { width, height } = this.getDesktopBounds();
        const usableHeight = Math.max(
            this.iconDimensions.height,
            height - (this.desktopPadding.top + this.desktopPadding.bottom)
        );
        const iconsPerColumn = Math.max(1, Math.floor(usableHeight / this.iconGridSpacing.row));
        return {
            iconsPerColumn,
            offsetX: this.desktopPadding.left,
            offsetY: this.desktopPadding.top,
            columnSpacing: this.iconGridSpacing.column,
            rowSpacing: this.iconGridSpacing.row,
        };
    };

    computeGridPosition = (index = 0) => {
        const { iconsPerColumn, offsetX, offsetY, columnSpacing, rowSpacing } = this.computeGridMetrics();
        const column = Math.floor(index / iconsPerColumn);
        const row = index % iconsPerColumn;
        const x = offsetX + column * columnSpacing;
        const y = offsetY + row * rowSpacing;
        return this.clampIconPosition(x, y);
    };

    refreshAppRegistry() {
        const nextAppMap = new Map();
        const nextValidAppIds = new Set();
        apps.forEach((app) => {
            nextAppMap.set(app.id, app);
            nextValidAppIds.add(app.id);
        });
        this.overlayRegistry.forEach((overlay) => {
            const meta = {
                id: overlay.id,
                title: overlay.title,
                icon: overlay.icon,
                isOverlay: true,
            };
            nextAppMap.set(overlay.id, meta);
            nextValidAppIds.add(overlay.id);
        });
        this.appMap = nextAppMap;
        this.validAppIds = nextValidAppIds;
    }

    normalizeBadgeTone = (tone) => {
        if (typeof tone !== 'string') {
            return 'accent';
        }
        const normalized = tone.trim().toLowerCase();
        return BADGE_TONE_MAP[normalized] || 'accent';
    };

    formatBadgeCount = (value, maxValue) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return null;
        }
        const count = Math.max(0, Math.floor(numeric));
        const max = Number.isFinite(maxValue) && maxValue > 0 ? Math.floor(maxValue) : 99;
        const displayValue = count > max ? `${max}+` : `${count}`;
        return { count, displayValue, max };
    };

    normalizeBadgeMetadata = (raw) => {
        if (!raw || typeof raw !== 'object') {
            return null;
        }

        const typeInput = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : null;
        let type = typeInput;
        if (!type) {
            if (Number.isFinite(raw.count) || Number.isFinite(raw.value) || Number.isFinite(raw.total) || Number.isFinite(raw.notifications)) {
                type = 'count';
            } else if (Number.isFinite(raw.progress) || Number.isFinite(raw.current) || Number.isFinite(raw.done) || Number.isFinite(raw.completed)) {
                type = 'ring';
            } else {
                type = 'dot';
            }
        }

        if (type === 'progress') {
            type = 'ring';
        }

        const tone = this.normalizeBadgeTone(raw.tone);
        const persistOnFocus = Boolean(raw.persistOnFocus);
        const pulseOverride = raw.pulse === undefined ? undefined : Boolean(raw.pulse);

        if (type === 'count') {
            const numericSource = raw.count ?? raw.value ?? raw.total ?? raw.notifications ?? raw.number;
            const formatted = this.formatBadgeCount(numericSource, raw.max);
            if (!formatted) {
                return null;
            }
            const { count, displayValue, max } = formatted;
            const label = typeof raw.label === 'string' && raw.label.trim()
                ? raw.label.trim()
                : (count === 1 ? '1 notification' : `${displayValue} notifications`);
            const pulse = pulseOverride === undefined ? false : pulseOverride;
            return {
                type: 'count',
                tone,
                count,
                displayValue,
                max,
                label,
                pulse,
                persistOnFocus,
            };
        }

        if (type === 'ring') {
            const rawValue = raw.progress ?? raw.value ?? raw.current ?? raw.done ?? raw.completed ?? 0;
            if (!Number.isFinite(rawValue)) {
                return null;
            }
            const rawMax = raw.max ?? raw.total ?? (rawValue > 1 ? 100 : 1);
            let ratio;
            if (Number.isFinite(rawMax) && rawMax > 0) {
                ratio = rawValue / rawMax;
            } else if (rawValue > 1) {
                ratio = rawValue / 100;
            } else {
                ratio = rawValue;
            }
            const progress = clamp(Number(ratio), 0, 1);
            const displayValue = typeof raw.displayValue === 'string' && raw.displayValue.trim()
                ? raw.displayValue.trim()
                : `${Math.round(progress * 100)}%`;
            const label = typeof raw.label === 'string' && raw.label.trim()
                ? raw.label.trim()
                : `${displayValue} complete`;
            const pulse = pulseOverride === undefined ? progress < 1 : pulseOverride;
            return {
                type: 'ring',
                tone,
                progress,
                displayValue,
                label,
                pulse,
                persistOnFocus,
            };
        }

        const label = typeof raw.label === 'string' && raw.label.trim()
            ? raw.label.trim()
            : 'Attention needed';
        const pulse = pulseOverride === undefined ? true : pulseOverride;
        return {
            type: 'dot',
            tone,
            label,
            pulse,
            persistOnFocus,
        };
    };

    areAppBadgesEqual = (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.type !== b.type) return false;
        if (a.tone !== b.tone) return false;
        if (Boolean(a.pulse) !== Boolean(b.pulse)) return false;
        if (Boolean(a.persistOnFocus) !== Boolean(b.persistOnFocus)) return false;
        if ((a.displayValue || b.displayValue) && a.displayValue !== b.displayValue) return false;
        if ((a.label || b.label) && a.label !== b.label) return false;
        if ((typeof a.count === 'number' || typeof b.count === 'number') && a.count !== b.count) return false;
        if ((typeof a.max === 'number' || typeof b.max === 'number') && a.max !== b.max) return false;
        if (typeof a.progress === 'number' || typeof b.progress === 'number') {
            const progressA = typeof a.progress === 'number' ? a.progress : 0;
            const progressB = typeof b.progress === 'number' ? b.progress : 0;
            if (Math.abs(progressA - progressB) > 0.0005) {
                return false;
            }
        }
        return true;
    };

    clearAppBadge = (appId, options = {}) => {
        if (!appId) return;
        const force = Boolean(options.force);
        this.setState((prev) => {
            const current = prev.appBadges || {};
            const existing = current[appId];
            if (!existing) {
                return null;
            }
            if (!force && existing.persistOnFocus) {
                return null;
            }
            const next = { ...current };
            delete next[appId];
            return { appBadges: next };
        });
    };

    handleAppBadgeEvent = (event) => {
        const detail = event?.detail || {};
        const appId = typeof detail.appId === 'string' ? detail.appId : '';
        if (!appId || !this.validAppIds.has(appId)) {
            return;
        }

        if (detail.clear === true) {
            this.clearAppBadge(appId, { force: true });
            return;
        }

        let rawBadge = detail.badge;
        if (rawBadge === undefined) {
            const { appId: _ignored, clear, ...rest } = detail || {};
            rawBadge = rest;
        }

        const normalized = this.normalizeBadgeMetadata(rawBadge);
        if (!normalized) {
            this.clearAppBadge(appId, { force: true });
            return;
        }

        this.setState((prev) => {
            const current = prev.appBadges || {};
            const existing = current[appId];
            if (existing && this.areAppBadgesEqual(existing, normalized)) {
                return null;
            }
            return { appBadges: { ...current, [appId]: normalized } };
        });
    };

    initializeDefaultFolders = (callback) => {
        const stored = this.state.folder_contents || {};
        const nextContents = { ...stored };
        let changed = false;

        DEFAULT_DESKTOP_FOLDERS.forEach((folder) => {
            const folderId = folder.id;
            if (!folderId) return;

            if (!Object.prototype.hasOwnProperty.call(nextContents, folderId)) {
                const defaults = Array.isArray(folder.items)
                    ? folder.items
                        .map((appId) => {
                            const app = this.getAppById(appId);
                            if (!app) return null;
                            return {
                                id: app.id,
                                title: app.title || app.id,
                                icon: app.icon,
                            };
                        })
                        .filter(Boolean)
                    : [];
                nextContents[folderId] = defaults;
                changed = true;
                return;
            }

            const currentItems = nextContents[folderId];
            if (!Array.isArray(currentItems)) {
                nextContents[folderId] = [];
                changed = true;
                return;
            }

            const sanitizedItems = currentItems
                .map((entry) => sanitizeFolderItem(entry))
                .filter(Boolean);

            const lengthChanged = sanitizedItems.length !== currentItems.length;
            const contentChanged = sanitizedItems.some((item, index) => {
                const original = currentItems[index];
                if (!original) return true;
                if (typeof original === 'string') return true;
                return (
                    original.id !== item.id ||
                    original.title !== item.title ||
                    original.icon !== item.icon
                );
            });

            if (lengthChanged || contentChanged) {
                nextContents[folderId] = sanitizedItems;
                changed = true;
            }
        });

        if (changed) {
            this.setState({ folder_contents: nextContents }, () => {
                this.persistFolderContents(nextContents);
                if (typeof callback === 'function') callback();
            });
            return;
        }

        if (typeof callback === 'function') callback();
    };

    resolveOverlayId = (id) => {
        if (!id) return null;
        if (this.overlayRegistry?.has(id)) {
            return id;
        }
        const meta = OVERLAY_WINDOWS?.[id];
        if (meta?.id && this.overlayRegistry?.has(meta.id)) {
            return meta.id;
        }
        return null;
    };

    isOverlayId = (id) => Boolean(this.resolveOverlayId(id));

    getOverlayMeta = (id) => {
        const resolved = this.resolveOverlayId(id);
        if (!resolved) return null;
        return this.overlayRegistry?.get(resolved) || null;
    };

    buildOverlayStateMap = (prev, id, partial) => {
        const resolvedId = this.resolveOverlayId(id) || id;
        const current = (prev && prev[resolvedId]) || {};
        const next = { ...current, ...(partial || {}) };
        const aliasKey = Object.entries(OVERLAY_WINDOWS).find(([, meta]) => meta.id === resolvedId)?.[0];
        const map = {
            ...prev,
            [resolvedId]: next,
        };
        if (aliasKey) {
            map[aliasKey] = next;
        }
        return map;
    };

    isOverlayOpen = (id) => {
        const resolved = this.resolveOverlayId(id);
        if (!resolved) return false;
        return Boolean(this.state.overlayWindows?.[resolved]?.open);
    };

    getLauncherState = () => this.state.overlayWindows?.[LAUNCHER_OVERLAY_ID] || null;

    normalizePaletteIconPath = (icon) => {
        if (!icon || typeof icon !== 'string') return undefined;
        if (/^(https?:|data:)/i.test(icon)) return icon;
        const sanitized = icon.replace(/^\.\//, '').replace(/^\/+/, '');
        if (!sanitized) return undefined;
        return sanitized.startsWith('/') ? sanitized : `/${sanitized}`;
    };

    getCommandPaletteAppItems = () => {
        return apps
            .filter((app) => !app.disabled)
            .map((app) => ({
                id: app.id,
                title: app.title,
                icon: this.normalizePaletteIconPath(app.icon),
                subtitle: undefined,
                keywords: [app.id, app.title].filter(Boolean),
            }));
    };

    getCommandPaletteRecentWindows = () => {
        const stack = this.getActiveStack();
        const seen = new Set();
        const overlays = this.state.overlayWindows || {};
        const results = [];
        stack.forEach((id) => {
            if (!id || seen.has(id)) return;
            seen.add(id);
            if (this.isOverlayId(id)) {
                const overlayState = overlays[id] || {};
                if (!overlayState.open) return;
                const meta = this.getOverlayMeta(id);
                if (!meta) return;
                results.push({
                    id,
                    title: meta.title || id,
                    icon: this.normalizePaletteIconPath(meta.icon),
                    subtitle: 'System overlay',
                    keywords: [id, meta.title, 'overlay'].filter(Boolean),
                });
                return;
            }
            const closedWindows = this.state.closed_windows || {};
            if (closedWindows[id] !== false) return;
            const app = this.getAppById(id);
            if (!app) return;
            results.push({
                id,
                title: app.title || id,
                icon: this.normalizePaletteIconPath(app.icon),
                subtitle: 'Open window',
                keywords: [id, app.title, 'window'].filter(Boolean),
            });
        });
        return results;
    };

    getCommandPaletteSettingsActions = () => {
        const actions = [
            {
                id: 'command-open-settings',
                title: 'Open Settings',
                subtitle: 'Launch the settings application',
                icon: this.normalizePaletteIconPath('/themes/Yaru/apps/gnome-control-center.svg'),
                keywords: ['settings', 'preferences', 'control'],
                data: { action: 'open-settings', target: 'settings' },
            },
        ];

        const presets = [
            { preset: 'small', title: 'Use small desktop icons', keywords: ['small', 'icons', 'desktop'] },
            { preset: 'medium', title: 'Use medium desktop icons', keywords: ['medium', 'icons', 'desktop'] },
            { preset: 'large', title: 'Use large desktop icons', keywords: ['large', 'icons', 'desktop'] },
        ];

        presets.forEach(({ preset, title, keywords }) => {
            if (this.state.iconSizePreset === preset) return;
            actions.push({
                id: `command-set-icon-size-${preset}`,
                title,
                subtitle: 'Desktop setting',
                icon: this.normalizePaletteIconPath('/themes/Yaru/system/user-desktop.png'),
                keywords: ['icon size', ...keywords],
                data: { action: 'set-icon-size', preset },
            });
        });

        return actions;
    };

    openCommandPalette = () => {
        this.openOverlay(COMMAND_PALETTE_OVERLAY_ID, { transitionState: 'entered' }, () => {
            this.focus(COMMAND_PALETTE_OVERLAY_ID);
        });
    };

    closeCommandPalette = () => {
        this.closeOverlay(COMMAND_PALETTE_OVERLAY_ID, undefined, () => {
            const stack = this.getActiveStack();
            const index = stack.indexOf(COMMAND_PALETTE_OVERLAY_ID);
            if (index !== -1) {
                stack.splice(index, 1);
            }
            this.setState((prev) => ({
                focused_windows: { ...prev.focused_windows, [COMMAND_PALETTE_OVERLAY_ID]: false },
            }), () => {
                this.giveFocusToLastApp();
            });
        });
    };

    toggleCommandPalette = () => {
        if (this.isOverlayOpen(COMMAND_PALETTE_OVERLAY_ID)) {
            this.closeCommandPalette();
        } else {
            this.openCommandPalette();
        }
    };

    isCommandPaletteShortcut = (event) => {
        if (!event || typeof event !== 'object') return false;
        if (event.repeat) return false;
        const key = event.key || '';
        const code = event.code || '';
        const isSpace = key === ' ' || key === 'Spacebar' || key === 'Space' || code === 'Space';
        if (!isSpace) return false;
        if (event.altKey || event.shiftKey) return false;
        if (this.commandPaletteUsesMeta) {
            return Boolean(event.metaKey);
        }
        return Boolean(event.ctrlKey);
    };

    handleCommandPaletteAction = (item) => {
        if (!item || typeof item !== 'object') return false;
        const actionType = item?.data?.action;
        if (actionType === 'open-settings') {
            this.openApp('settings');
            return true;
        }
        if (actionType === 'set-icon-size') {
            const preset = item?.data?.preset;
            if (preset && this.iconSizePresets?.[preset]) {
                this.setIconSizePreset(preset);
                return true;
            }
        }
        return false;
    };

    handleCommandPaletteSelect = (item) => {
        if (!item || typeof item !== 'object') return;
        if (item.type === 'action') {
            const handled = this.handleCommandPaletteAction(item);
            if (handled) {
                this.closeCommandPalette();
            }
            return;
        }
        if (item.id) {
            this.openApp(item.id);
        }
        this.closeCommandPalette();
    };

    syncOverlayWindowFlags = (id, flags, callback) => {
        const resolvedId = this.resolveOverlayId(id) || id;
        if (!resolvedId) {
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }

        const { closed, minimized, focused } = flags || {};
        let didUpdate = false;

        this.setState((prev) => {
            const partial = {};

            if (typeof closed === 'boolean') {
                const previousClosed = prev.closed_windows || {};
                if (!Object.prototype.hasOwnProperty.call(previousClosed, resolvedId) || previousClosed[resolvedId] !== closed) {
                    partial.closed_windows = { ...previousClosed, [resolvedId]: closed };
                }
            }

            if (typeof minimized === 'boolean') {
                const previousMinimized = prev.minimized_windows || {};
                if (!Object.prototype.hasOwnProperty.call(previousMinimized, resolvedId) || previousMinimized[resolvedId] !== minimized) {
                    partial.minimized_windows = { ...previousMinimized, [resolvedId]: minimized };
                }
            }

            if (typeof focused === 'boolean') {
                const previousFocused = prev.focused_windows || {};
                if (!Object.prototype.hasOwnProperty.call(previousFocused, resolvedId) || previousFocused[resolvedId] !== focused) {
                    partial.focused_windows = { ...previousFocused, [resolvedId]: focused };
                }
            }

            if (!Object.keys(partial).length) {
                return null;
            }

            didUpdate = true;

            const workspacePartial = {
                closed_windows: partial.closed_windows || prev.closed_windows,
                minimized_windows: partial.minimized_windows || prev.minimized_windows,
                focused_windows: partial.focused_windows || prev.focused_windows,
            };

            this.commitWorkspacePartial(workspacePartial, prev.activeWorkspace);
            return partial;
        }, () => {
            if (typeof callback === 'function') {
                callback();
            }
        });

        if (!didUpdate && typeof callback === 'function') {
            callback();
        }
    };

    openOverlay = (id, overrides = {}, callback) => {
        const resolvedId = this.resolveOverlayId(id);
        if (!resolvedId) return;
        this.recentlyClosedOverlays.delete(resolvedId);
        this.promoteWindowInStack(resolvedId);

        const applyOverrides = (current = {}) => {
            const resolved = typeof overrides === 'function' ? overrides({ ...current }) : overrides;
            const baseState = {
                ...current,
                open: true,
                minimized: false,
                focused: true,
            };

            if (resolvedId === LAUNCHER_OVERLAY_ID) {
                const previousTransition = current.transitionState;
                baseState.transitionState = resolved?.transitionState
                    || (previousTransition === 'entered' ? 'entered' : 'entering');
            }

            if (resolved && typeof resolved === 'object') {
                return { ...baseState, ...resolved };
            }

            return baseState;
        };

        this.updateOverlayState(resolvedId, applyOverrides);

        this.syncOverlayWindowFlags(
            resolvedId,
            { closed: false, minimized: false, focused: true },
            () => {
                this.focus(resolvedId);
                if (typeof callback === 'function') {
                    callback();
                }
            },
        );
    };

    toggleOverlayMinimize = (id) => {
        const resolvedId = this.resolveOverlayId(id);
        if (!resolvedId) return;
        if (this.state.minimized_windows?.[resolvedId]) {
            this.openOverlay(resolvedId, { transitionState: 'entered' });
        } else {
            this.minimizeOverlay(resolvedId);
        }
    };

    toggleOverlayMaximize = (id) => {
        const resolvedId = this.resolveOverlayId(id);
        if (!resolvedId) return;
        this.updateOverlayState(resolvedId, (current = {}) => {
            const defaults = this.getOverlayDefaults(resolvedId);
            const merged = { ...defaults, ...current };
            const nextMaximized = !merged.maximized;
            return {
                ...merged,
                open: true,
                minimized: false,
                maximized: nextMaximized,
                focused: true,
                transitionState: resolvedId === LAUNCHER_OVERLAY_ID
                    ? (merged.transitionState || 'entered')
                    : merged.transitionState,
            };
        });
        this.syncOverlayWindowFlags(resolvedId, { closed: false, minimized: false, focused: true });
    };

    minimizeOverlay = (id) => {
        const resolvedId = this.resolveOverlayId(id);
        if (!resolvedId) return;
        const defaults = this.getOverlayDefaults(resolvedId);
        const aliasKey = Object.entries(OVERLAY_WINDOWS).find(([, meta]) => meta.id === resolvedId)?.[0];
        this.setState((prev) => {
            const overlays = prev.overlayWindows || {};
            const previous = overlays[resolvedId] ? { ...defaults, ...overlays[resolvedId] } : { ...defaults };
            const nextOverlay = {
                ...previous,
                open: true,
                minimized: true,
                maximized: false,
                focused: false,
            };

            const closed_windows = { ...(prev.closed_windows || {}), [resolvedId]: false };
            const minimized_windows = { ...(prev.minimized_windows || {}), [resolvedId]: true };
            const focused_windows = { ...(prev.focused_windows || {}), [resolvedId]: false };

            const noOverlayChange = (
                previous.open === nextOverlay.open &&
                previous.minimized === nextOverlay.minimized &&
                previous.maximized === nextOverlay.maximized &&
                previous.focused === nextOverlay.focused
            );
            const noFlagChange = (
                prev.closed_windows?.[resolvedId] === closed_windows[resolvedId] &&
                prev.minimized_windows?.[resolvedId] === minimized_windows[resolvedId] &&
                prev.focused_windows?.[resolvedId] === focused_windows[resolvedId]
            );

            if (noOverlayChange && noFlagChange) {
                return null;
            }

            this.commitWorkspacePartial({ closed_windows, minimized_windows, focused_windows }, prev.activeWorkspace);

            const overlayWindows = { ...overlays, [resolvedId]: nextOverlay };
            if (aliasKey) {
                overlayWindows[aliasKey] = nextOverlay;
            }

            return {
                overlayWindows,
                closed_windows,
                minimized_windows,
                focused_windows,
            };
        }, () => {
            this.giveFocusToLastApp();
        });
    };

    restoreOverlay = (id, overrides = {}, callback) => {
        this.openOverlay(id, overrides, callback);
    };

    closeOverlay = (id, overrides = {}, callback) => {
        const resolvedId = this.resolveOverlayId(id);
        if (!resolvedId) return;
        this.recentlyClosedOverlays.add(resolvedId);

        const stack = this.getActiveStack();
        const index = stack.indexOf(resolvedId);
        if (index !== -1) {
            stack.splice(index, 1);
        }

        if (this.windowPreviewCache?.has(resolvedId)) {
            this.windowPreviewCache.delete(resolvedId);
        }

        const applyOverrides = (current = {}) => {
            const resolved = typeof overrides === 'function' ? overrides({ ...current }) : overrides;
            const baseState = {
                ...current,
                open: false,
                minimized: false,
                maximized: false,
                focused: false,
            };

            if (resolvedId === LAUNCHER_OVERLAY_ID) {
                const transitionOverride = resolved && typeof resolved === 'object' && resolved.transitionState;
                baseState.transitionState = transitionOverride || 'exiting';
            }

            if (resolved && typeof resolved === 'object') {
                return { ...baseState, ...resolved };
            }

            return baseState;
        };

        this.updateOverlayState(resolvedId, applyOverrides);

        this.syncOverlayWindowFlags(
            resolvedId,
            { closed: true, minimized: false, focused: false },
            () => {
                this.giveFocusToLastApp();
                this.saveSession();
                if (typeof callback === 'function') {
                    callback();
                }
            },
        );

        this.clearAppBadge(id, { force: true });
    };

    getAppById = (id) => {
        if (!this.appMap?.has(id)) {
            const match = apps.find((app) => app.id === id);
            if (match) {
                this.appMap.set(id, match);
                this.validAppIds.add(id);
            }
        }
        return this.appMap.get(id);
    };

    buildWindowShelfEntry = (id) => {
        const app = this.getAppById(id);
        if (!app) return null;
        const title = app.title || app.name || id;
        const icon = typeof app.icon === 'string' ? app.icon : undefined;
        return { id, title, icon };
    };

    getMinimizedWindowEntries = () => {
        const closed = this.state.closed_windows || {};
        const minimized = this.state.minimized_windows || {};
        const entries = [];
        Object.keys(minimized).forEach((id) => {
            if (!minimized[id]) return;
            if (!this.validAppIds.has(id)) return;
            if (this.isOverlayId(id)) {
                const overlayState = this.state.overlayWindows?.[id];
                if (!overlayState || overlayState.open === false) {
                    return;
                }
            } else if (closed[id]) {
                return;
            }
            const entry = this.buildWindowShelfEntry(id);
            if (entry) {
                entries.push(entry);
            }
        });
        return entries;
    };

    getClosedWindowOrderMap = () => {
        const order = new Map();
        if (!safeLocalStorage) return order;
        try {
            const raw = safeLocalStorage.getItem('window-trash');
            if (!raw) return order;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return order;
            parsed.forEach((item) => {
                if (item && typeof item.id === 'string') {
                    const closedAt = Number(item.closedAt);
                    order.set(item.id, Number.isFinite(closedAt) ? closedAt : 0);
                }
            });
        } catch (e) {
            return order;
        }
        return order;
    };

    getClosedWindowEntries = () => {
        const closed = this.state.closed_windows || {};
        const order = this.getClosedWindowOrderMap();
        const entries = [];
        Object.keys(closed).forEach((id) => {
            if (!closed[id]) return;
            if (!this.validAppIds.has(id)) return;
            if (this.isOverlayId(id) && !this.recentlyClosedOverlays.has(id)) return;
            const entry = this.buildWindowShelfEntry(id);
            if (entry) {
                const closedAt = order.has(id) ? order.get(id) : 0;
                entries.push({ ...entry, closedAt });
            }
        });
        entries.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
        return entries.map(({ id, title, icon }) => ({ id, title, icon }));
    };

    getDesktopAppIndex = (id) => {
        const appsOnDesktop = this.state.desktop_apps || [];
        return appsOnDesktop.indexOf(id);
    };

    describeKeyboardIconPosition = (position) => {
        if (!this.isValidIconPosition(position)) {
            return { column: null, row: null };
        }
        const metrics = this.computeGridMetrics();
        const columnSpacing = Math.max(metrics.columnSpacing || 0, 1);
        const rowSpacing = Math.max(metrics.rowSpacing || 0, 1);
        const column = Math.max(1, Math.round((position.x - metrics.offsetX) / columnSpacing) + 1);
        const row = Math.max(1, Math.round((position.y - metrics.offsetY) / rowSpacing) + 1);
        return { column, row };
    };

    buildKeyboardMoveHint = (app, isMoving, position) => {
        if (!app || this.state.disabled_apps?.[app.id]) {
            return undefined;
        }
        const title = app.title || app.name || 'app';
        if (isMoving) {
            let location = '';
            if (this.isValidIconPosition(position)) {
                const { column, row } = this.describeKeyboardIconPosition(position);
                if (column && row) {
                    location = ` Current position column ${column}, row ${row}.`;
                }
            }
            return `Move mode active for ${title}. Use the arrow keys to reposition. Press Enter to place or Escape to cancel.${location}`;
        }
        let location = '';
        if (this.isValidIconPosition(position)) {
            const { column, row } = this.describeKeyboardIconPosition(position);
            if (column && row) {
                location = ` It is currently in column ${column}, row ${row}.`;
            }
        }
        return `Press Enter to move ${title} with the keyboard. Press Space to open it.${location}`;
    };

    isValidIconPosition = (position) => {
        if (!position) return false;
        const { x, y } = position;
        return Number.isFinite(x) && Number.isFinite(y);
    };

    getIconPositionKey = (position) => {
        if (!this.isValidIconPosition(position)) return null;
        return `${Math.round(position.x)}:${Math.round(position.y)}`;
    };

    areIconLayoutsEqual = (a = {}, b = {}) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        return aKeys.every((key) => {
            const first = a[key];
            const second = b[key];
            if (!this.isValidIconPosition(first) || !this.isValidIconPosition(second)) {
                return false;
            }
            return first.x === second.x && first.y === second.y;
        });
    };

    areSetsEqual = (first, second) => {
        if (first === second) return true;
        const a = first instanceof Set ? first : new Set(first || []);
        const b = second instanceof Set ? second : new Set(second || []);
        if (a.size !== b.size) return false;
        for (const value of a) {
            if (!b.has(value)) {
                return false;
            }
        }
        return true;
    };

    areRectsEqual = (a, b) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
    };

    rectsOverlap = (a, b) => {
        if (!a || !b) return false;
        if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
        return (
            a.left < b.left + b.width &&
            a.left + a.width > b.left &&
            a.top < b.top + b.height &&
            a.top + a.height > b.top
        );
    };

    getIconBounds = (appId, index, state = this.state) => {
        if (!appId) return null;
        const positions = state.desktop_icon_positions || {};
        const keyboardMoveState = state.keyboardMoveState;
        const basePosition = (keyboardMoveState && keyboardMoveState.id === appId && keyboardMoveState.position)
            ? keyboardMoveState.position
            : (positions[appId] || this.computeGridPosition(index));
        if (!this.isValidIconPosition(basePosition)) return null;
        const width = this.iconDimensions?.width ?? this.defaultIconDimensions.width;
        const height = this.iconDimensions?.height ?? this.defaultIconDimensions.height;
        return {
            left: basePosition.x,
            top: basePosition.y,
            width,
            height,
        };
    };

    calculateSelectionForState = (state, appId, modifiers = {}) => {
        if (!appId) return null;
        const desktopApps = Array.isArray(state.desktop_apps) ? state.desktop_apps : [];
        const prevSelected = state.selectedIcons instanceof Set ? state.selectedIcons : new Set();
        const prevAnchor = state.selectionAnchorId ?? null;
        const multi = Boolean(modifiers.multi);
        const range = Boolean(modifiers.range);

        let anchorId = prevAnchor;
        let nextSelected = null;

        if (!multi && !range) {
            nextSelected = new Set([appId]);
            anchorId = appId;
        } else if (range) {
            const order = desktopApps;
            if (!order.length) {
                nextSelected = new Set(prevSelected);
            } else {
                let anchor = anchorId;
                if (!anchor || !order.includes(anchor)) {
                    const fallback = Array.from(prevSelected).find((id) => order.includes(id));
                    anchor = fallback || order[0] || appId;
                }
                if (!order.includes(appId) || !order.includes(anchor)) {
                    nextSelected = new Set(prevSelected);
                } else {
                    const startIndex = order.indexOf(anchor);
                    const endIndex = order.indexOf(appId);
                    const [start, end] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
                    nextSelected = multi ? new Set(prevSelected) : new Set();
                    for (let i = start; i <= end; i += 1) {
                        nextSelected.add(order[i]);
                    }
                    anchorId = anchor;
                }
            }
        } else if (multi) {
            nextSelected = new Set(prevSelected);
            if (nextSelected.has(appId)) {
                nextSelected.delete(appId);
                if (anchorId === appId) {
                    const remaining = nextSelected.values().next().value;
                    anchorId = remaining ?? null;
                }
            } else {
                nextSelected.add(appId);
                anchorId = appId;
            }
        }

        if (!nextSelected) {
            nextSelected = new Set(prevSelected);
        }

        if (!nextSelected.size) {
            anchorId = null;
        }

        const changed = !this.areSetsEqual(prevSelected, nextSelected);
        const anchorChanged = anchorId !== prevAnchor && !(anchorId === null && prevAnchor === null);

        return {
            nextSelected,
            anchorId,
            changed,
            shouldUpdate: changed || anchorChanged,
        };
    };

    applyKeyboardSelection = (appId, modifiers = {}) => {
        const selection = this.calculateSelectionForState(this.state, appId, modifiers);
        if (!selection) return;
        if (!selection.shouldUpdate) return;
        this.setState({
            selectedIcons: selection.nextSelected,
            selectionAnchorId: selection.nextSelected.size ? selection.anchorId : null,
        });
    };

    buildMarqueeSelection = (state, rect, selectionState) => {
        if (!rect) return null;
        const desktopApps = Array.isArray(state.desktop_apps) ? state.desktop_apps : [];
        const base = selectionState?.mode === 'add'
            ? new Set(selectionState?.baseSelection || [])
            : new Set();
        if (!desktopApps.length) {
            return { nextSelected: base };
        }
        desktopApps.forEach((appId, index) => {
            const bounds = this.getIconBounds(appId, index, state);
            if (bounds && this.rectsOverlap(rect, bounds)) {
                base.add(appId);
            }
        });
        return { nextSelected: base };
    };

    updateMarqueeSelection = (rect, selectionState) => {
        this.setState((prevState) => {
            const changes = {};
            if (!this.areRectsEqual(prevState.marqueeSelection, rect)) {
                changes.marqueeSelection = rect;
            }
            const result = this.buildMarqueeSelection(prevState, rect, selectionState);
            if (result) {
                const prevSelected = prevState.selectedIcons instanceof Set ? prevState.selectedIcons : new Set();
                const nextSelected = result.nextSelected;
                if (!this.areSetsEqual(prevSelected, nextSelected)) {
                    changes.selectedIcons = nextSelected;
                }
                if (nextSelected && nextSelected.size) {
                    const anchorCandidate = selectionState?.anchor;
                    let nextAnchor = null;
                    if (anchorCandidate && nextSelected.has(anchorCandidate)) {
                        nextAnchor = anchorCandidate;
                    } else if (prevState.selectionAnchorId && nextSelected.has(prevState.selectionAnchorId)) {
                        nextAnchor = prevState.selectionAnchorId;
                    } else {
                        nextAnchor = nextSelected.values().next().value ?? null;
                    }
                    if (prevState.selectionAnchorId !== nextAnchor && (nextAnchor || prevState.selectionAnchorId !== null)) {
                        changes.selectionAnchorId = nextAnchor;
                    }
                } else if (prevState.selectionAnchorId !== null) {
                    changes.selectionAnchorId = null;
                }
            }
            return Object.keys(changes).length ? changes : null;
        });
    };

    resolveIconLayout = (desktopApps = [], current = {}, options = {}) => {
        const next = {};
        const taken = new Set();
        const clampOnly = options?.clampOnly === true;

        const claimPosition = (position) => {
            if (!this.isValidIconPosition(position)) return null;
            const base = this.clampIconPosition(position.x, position.y);
            const key = this.getIconPositionKey(base);
            if (!key || taken.has(key)) return null;
            taken.add(key);
            return base;
        };

        let fallbackIndex = 0;
        const assignFallback = (startIndex) => {
            let index = Math.max(startIndex, fallbackIndex);
            while (index < startIndex + 1000) {
                const candidate = this.computeGridPosition(index);
                const key = this.getIconPositionKey(candidate);
                if (key && !taken.has(key)) {
                    taken.add(key);
                    fallbackIndex = index + 1;
                    return candidate;
                }
                index += 1;
            }
            const fallback = this.computeGridPosition(startIndex);
            const fallbackKey = this.getIconPositionKey(fallback);
            if (fallbackKey && !taken.has(fallbackKey)) {
                taken.add(fallbackKey);
            }
            return fallback;
        };

        desktopApps.forEach((id, orderIndex) => {
            const candidates = [];
            if (current[id]) {
                candidates.push(current[id]);
            }
            if (!clampOnly) {
                const saved = this.savedIconPositions?.[id];
                if (saved) {
                    candidates.push(saved);
                }
            }

            let assigned = null;
            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = claimPosition(candidates[i]);
                if (candidate) {
                    assigned = candidate;
                    break;
                }
            }

            if (!assigned) {
                assigned = assignFallback(orderIndex);
            }

            next[id] = assigned;
        });

        return next;
    };

    clampIconPosition = (x, y) => {
        const { width, height } = this.getDesktopBounds();
        const minX = this.desktopPadding.left;
        const maxX = Math.max(minX, width - this.iconDimensions.width - this.desktopPadding.right);
        const minY = this.desktopPadding.top;
        const maxY = Math.max(minY, height - this.iconDimensions.height - this.desktopPadding.bottom);
        const clampedX = Math.min(Math.max(x, minX), maxX);
        const clampedY = Math.min(Math.max(y, minY), maxY);
        return { x: Math.round(clampedX), y: Math.round(clampedY) };
    };

    snapIconPosition = (x, y) => {
        const metrics = this.computeGridMetrics();
        const snapAxis = (value, offset, spacing) => {
            if (!Number.isFinite(value) || !Number.isFinite(offset) || !Number.isFinite(spacing) || spacing <= 0) {
                return value;
            }
            const relative = value - offset;
            const snappedRelative = Math.round(relative / spacing) * spacing;
            return offset + snappedRelative;
        };

        const snappedX = snapAxis(x, metrics.offsetX, metrics.columnSpacing);
        const snappedY = snapAxis(y, metrics.offsetY, metrics.rowSpacing);

        return { x: snappedX, y: snappedY };
    };

    calculateIconPosition = (clientX, clientY, dragState = this.iconDragState) => {
        if (!dragState) return { x: 0, y: 0 };
        const rect = this.getDesktopRect();
        if (!rect) {
            const snapped = this.snapIconPosition(clientX - dragState.offsetX, clientY - dragState.offsetY);
            return this.clampIconPosition(snapped.x, snapped.y);
        }
        const x = clientX - rect.left - dragState.offsetX;
        const y = clientY - rect.top - dragState.offsetY;
        const snapped = this.snapIconPosition(x, y);
        return this.clampIconPosition(snapped.x, snapped.y);
    };

    updateIconPosition = (id, x, y, persist = false) => {
        const nextPosition = this.clampIconPosition(x, y);
        if (persist) {
            this.setState((prevState) => {
                const current = prevState.desktop_icon_positions || {};
                const desktopApps = Array.isArray(prevState.desktop_apps) ? prevState.desktop_apps : [];
                const layout = this.resolveIconLayout(desktopApps, { ...current, [id]: nextPosition });
                const shouldUpdatePositions = !this.areIconLayoutsEqual(current, layout);
                const nextPositions = shouldUpdatePositions ? layout : current;
                if (!shouldUpdatePositions && prevState.draggingIconId === null) {
                    return null;
                }
                return {
                    desktop_icon_positions: nextPositions,
                    draggingIconId: null,
                };
            }, () => {
                this.persistIconPositions();
            });
            return;
        }

        this.setState((prevState) => {
            const current = prevState.desktop_icon_positions || {};
            const previous = current[id];
            if (previous && previous.x === nextPosition.x && previous.y === nextPosition.y) {
                return null;
            }
            return {
                desktop_icon_positions: { ...current, [id]: nextPosition },
                draggingIconId: prevState.draggingIconId,
            };
        });
    };

    startKeyboardIconMove = (appId) => {
        if (!this.validAppIds.has(appId)) return;
        if (this.state.disabled_apps?.[appId]) return;
        const positions = this.state.desktop_icon_positions || {};
        const currentIndex = this.getDesktopAppIndex(appId);
        const fallback = currentIndex >= 0 ? this.computeGridPosition(currentIndex) : this.computeGridPosition(0);
        const currentPosition = positions[appId] || fallback;
        const basePosition = this.clampIconPosition(currentPosition.x, currentPosition.y);
        this.setState({
            keyboardMoveState: {
                id: appId,
                origin: basePosition,
                position: basePosition,
            },
        }, () => {
            this.announceKeyboardMoveStart(appId, basePosition);
        });
    };

    moveIconWithKeyboard = (appId, deltaX, deltaY) => {
        const metrics = this.computeGridMetrics();
        const stepX = (deltaX || 0) * (metrics.columnSpacing || 0);
        const stepY = (deltaY || 0) * (metrics.rowSpacing || 0);
        if (stepX === 0 && stepY === 0) return;
        this.setState((prevState) => {
            const moveState = prevState.keyboardMoveState;
            if (!moveState || moveState.id !== appId || !this.isValidIconPosition(moveState.position)) {
                return null;
            }
            const current = moveState.position;
            const next = this.clampIconPosition(current.x + stepX, current.y + stepY);
            if (next.x === current.x && next.y === current.y) {
                return null;
            }
            return {
                keyboardMoveState: { ...moveState, position: next },
            };
        }, () => {
            const moveState = this.state.keyboardMoveState;
            if (!moveState || moveState.id !== appId || !this.isValidIconPosition(moveState.position)) {
                return;
            }
            const { position } = moveState;
            this.updateIconPosition(appId, position.x, position.y, false);
            this.announceKeyboardPosition(appId, position);
        });
    };

    completeKeyboardIconMove = () => {
        const moveState = this.state.keyboardMoveState;
        if (!moveState) return;
        const { id, position } = moveState;
        this.setState({ keyboardMoveState: null }, () => {
            if (this.isValidIconPosition(position)) {
                this.updateIconPosition(id, position.x, position.y, true);
                this.announceKeyboardPlacement(id, position);
            } else {
                this.announceKeyboardPlacement(id, null);
            }
        });
    };

    cancelKeyboardIconMove = () => {
        const moveState = this.state.keyboardMoveState;
        if (!moveState) return;
        const { id, origin } = moveState;
        this.setState({ keyboardMoveState: null }, () => {
            if (this.isValidIconPosition(origin)) {
                this.updateIconPosition(id, origin.x, origin.y, false);
            }
            this.announceKeyboardCancel(id);
        });
    };

    handleIconKeyDown = (event, app) => {
        if (!app) return;
        const appId = app.id;
        if (!appId || this.state.disabled_apps?.[appId]) return;

        const moveState = this.state.keyboardMoveState;
        const isMoving = moveState && moveState.id === appId;
        const key = event.key;
        const multi = event.ctrlKey || event.metaKey;
        const range = event.shiftKey;

        if (isMoving) {
            switch (key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.moveIconWithKeyboard(appId, 0, -1);
                    return;
                case 'ArrowDown':
                    event.preventDefault();
                    this.moveIconWithKeyboard(appId, 0, 1);
                    return;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.moveIconWithKeyboard(appId, -1, 0);
                    return;
                case 'ArrowRight':
                    event.preventDefault();
                    this.moveIconWithKeyboard(appId, 1, 0);
                    return;
                case 'Enter':
                    event.preventDefault();
                    this.completeKeyboardIconMove();
                    return;
                case 'Escape':
                    event.preventDefault();
                    this.cancelKeyboardIconMove();
                    return;
                case ' ':
                case 'Spacebar':
                    event.preventDefault();
                    return;
                default:
                    return;
            }
        }

        if (key === 'Enter') {
            event.preventDefault();
            this.startKeyboardIconMove(appId);
            return;
        }

        if (key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            if (multi || range) {
                this.applyKeyboardSelection(appId, { multi, range });
            } else {
                this.openApp(appId);
            }
        }
    };

    handleIconBlur = (_event, appId) => {
        const moveState = this.state.keyboardMoveState;
        if (moveState && moveState.id === appId) {
            this.completeKeyboardIconMove();
        }
    };

    announce = (message) => {
        if (this.liveRegionTimeout) {
            clearTimeout(this.liveRegionTimeout);
            this.liveRegionTimeout = null;
        }
        this.setState({ liveRegionMessage: '' });
        if (!message) return;
        this.liveRegionTimeout = setTimeout(() => {
            this.setState({ liveRegionMessage: message });
            this.liveRegionTimeout = null;
        }, 75);
    };

    announceKeyboardMoveStart = (appId, position) => {
        const app = this.getAppById(appId);
        if (!app) return;
        const title = app.title || app.name || 'app';
        let location = '';
        if (this.isValidIconPosition(position)) {
            const { column, row } = this.describeKeyboardIconPosition(position);
            if (column && row) {
                location = ` Starting position column ${column}, row ${row}.`;
            }
        }
        this.announce(`Moving ${title}. Use arrow keys to reposition. Press Enter to place or Escape to cancel.${location}`);
    };

    announceKeyboardPosition = (appId, position) => {
        const app = this.getAppById(appId);
        if (!app || !this.isValidIconPosition(position)) return;
        const { column, row } = this.describeKeyboardIconPosition(position);
        if (!column || !row) return;
        const title = app.title || app.name || 'app';
        this.announce(`${title} moved to column ${column}, row ${row}.`);
    };

    announceKeyboardPlacement = (appId, position) => {
        const app = this.getAppById(appId);
        if (!app) return;
        const title = app.title || app.name || 'app';
        if (this.isValidIconPosition(position)) {
            const { column, row } = this.describeKeyboardIconPosition(position);
            if (column && row) {
                this.announce(`${title} placed at column ${column}, row ${row}.`);
                return;
            }
        }
        this.announce(`${title} position unchanged.`);
    };

    announceKeyboardCancel = (appId) => {
        const app = this.getAppById(appId);
        if (!app) return;
        const title = app.title || app.name || 'app';
        this.announce(`Cancelled moving ${title}.`);
    };

    handleIconPointerEnter = (appId) => {
        this.setState((prevState) => {
            if (prevState.hoveredIconId === appId) return null;
            return { hoveredIconId: appId };
        });
    };

    handleIconPointerLeave = (appId) => {
        this.setState((prevState) => {
            if (prevState.hoveredIconId !== appId) return null;
            return { hoveredIconId: null };
        });
    };

    handleDesktopPointerDown = (event) => {
        if (event.button !== 0) return;
        if (event.target !== event.currentTarget) return;
        event.stopPropagation();

        const container = event.currentTarget;
        container.setPointerCapture?.(event.pointerId);

        const baseSelectionArray = Array.from(this.state.selectedIcons instanceof Set ? this.state.selectedIcons : []);
        const selectionAnchor = this.state.selectionAnchorId ?? null;
        const isAdditive = event.metaKey || event.ctrlKey;
        const isRange = event.shiftKey;

        this.desktopSelectionState = {
            pointerId: event.pointerId,
            container,
            rect: container.getBoundingClientRect(),
            startClientX: event.clientX,
            startClientY: event.clientY,
            moved: false,
            baseSelection: baseSelectionArray,
            mode: isAdditive ? 'add' : 'replace',
            anchor: selectionAnchor,
        };

        if (!isAdditive && !isRange) {
            if (baseSelectionArray.length > 0) {
                this.setState({ selectedIcons: new Set(), selectionAnchorId: null });
            }
        }

        if (this.state.keyboardMoveState) {
            this.setState({ keyboardMoveState: null });
        }
        if (this.state.hoveredIconId !== null) {
            this.setState({ hoveredIconId: null });
        }
    };

    handleDesktopPointerMove = (event) => {
        const selectionState = this.desktopSelectionState;
        if (!selectionState || event.pointerId !== selectionState.pointerId) return;
        event.stopPropagation();

        const deltaX = event.clientX - selectionState.startClientX;
        const deltaY = event.clientY - selectionState.startClientY;
        if (!selectionState.moved) {
            const threshold = 4;
            if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
                return;
            }
            selectionState.moved = true;
        }

        event.preventDefault();

        const rect = selectionState.rect;
        const clampX = (value) => {
            const relative = value - rect.left;
            if (!Number.isFinite(relative)) return 0;
            return Math.min(Math.max(relative, 0), Math.max(rect.width, 0));
        };
        const clampY = (value) => {
            const relative = value - rect.top;
            if (!Number.isFinite(relative)) return 0;
            return Math.min(Math.max(relative, 0), Math.max(rect.height, 0));
        };

        const originX = clampX(selectionState.startClientX);
        const originY = clampY(selectionState.startClientY);
        const currentX = clampX(event.clientX);
        const currentY = clampY(event.clientY);

        const marqueeRect = {
            left: Math.min(originX, currentX),
            top: Math.min(originY, currentY),
            width: Math.abs(currentX - originX),
            height: Math.abs(currentY - originY),
        };

        this.updateMarqueeSelection(marqueeRect, selectionState);
    };

    handleDesktopPointerUp = (event) => {
        const selectionState = this.desktopSelectionState;
        if (!selectionState || event.pointerId !== selectionState.pointerId) return;
        event.stopPropagation();

        selectionState.container?.releasePointerCapture?.(selectionState.pointerId);

        this.desktopSelectionState = null;

        this.setState((prevState) => {
            if (!prevState.marqueeSelection) return null;
            return { marqueeSelection: null };
        });
    };

    handleDesktopPointerCancel = (event) => {
        const selectionState = this.desktopSelectionState;
        if (!selectionState) return;
        event?.stopPropagation?.();

        selectionState.container?.releasePointerCapture?.(selectionState.pointerId);
        this.desktopSelectionState = null;

        const restoreSelection = new Set(selectionState.baseSelection || []);
        this.setState((prevState) => {
            const updates = {};
            if (prevState.marqueeSelection) {
                updates.marqueeSelection = null;
            }
            updates.selectedIcons = restoreSelection;
            updates.selectionAnchorId = restoreSelection.size ? (restoreSelection.values().next().value ?? null) : null;
            return Object.keys(updates).length ? updates : null;
        });
    };

    handleIconPointerDown = (event, appId) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        container.setPointerCapture?.(event.pointerId);
        this.preventNextIconClick = false;
        const modifiers = {
            multi: event.metaKey || event.ctrlKey,
            range: event.shiftKey,
        };
        let selectionChangedFlag = false;
        this.setState((prevState) => {
            const partial = { draggingIconId: appId };
            if (prevState.keyboardMoveState) {
                partial.keyboardMoveState = null;
            }
            const selection = this.calculateSelectionForState(prevState, appId, modifiers);
            if (selection) {
                selectionChangedFlag = selection.changed;
                if (selection.shouldUpdate) {
                    partial.selectedIcons = selection.nextSelected;
                    partial.selectionAnchorId = selection.nextSelected.size ? selection.anchorId : null;
                }
            }
            return partial;
        });
        let startPosition = null;
        const positions = this.state.desktop_icon_positions || {};
        if (positions[appId]) {
            startPosition = { ...positions[appId] };
        } else if (typeof window !== 'undefined') {
            const style = window.getComputedStyle(container);
            const left = parseFloat(style.left) || 0;
            const top = parseFloat(style.top) || 0;
            startPosition = { x: left, y: top };
        }
        this.iconDragState = {
            id: appId,
            pointerId: event.pointerId,
            offsetX,
            offsetY,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            container,
            startPosition,
            lastPosition: startPosition,
            selectionChangedOnPointerDown: selectionChangedFlag,
            multiSelectIntent: modifiers.multi || modifiers.range,
        };
        this.attachIconKeyboardListeners();
    };

    handleIconPointerMove = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        const dragState = this.iconDragState;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        if (!dragState.moved) {
            const threshold = 4;
            if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
                return;
            }
            dragState.moved = true;
        }
        event.preventDefault();
        const position = this.calculateIconPosition(event.clientX, event.clientY, dragState);
        dragState.lastPosition = position;
        this.updateIconPosition(dragState.id, position.x, position.y, false);
    };

    handleIconPointerUp = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        event.stopPropagation();
        const dragState = this.iconDragState;
        const longPressTriggered = this.isLongPressTriggered(event);
        const moved = dragState.moved;
        const selectionChanged = Boolean(dragState.selectionChangedOnPointerDown);
        const hadMultiIntent = Boolean(dragState.multiSelectIntent);
        this.iconDragState = null;
        dragState.container?.releasePointerCapture?.(event.pointerId);
        this.detachIconKeyboardListeners();
        if (longPressTriggered) {
            event.preventDefault();
            this.clearLongPressState(event.pointerId);
            this.setState({ draggingIconId: null });
            return;
        }
        if (moved) {
            event.preventDefault();
            this.preventNextIconClick = true;
            const dropTarget = this.getFolderDropTarget(event, dragState);
            if (dropTarget && dropTarget.type === 'folder') {
                this.moveIconIntoFolder(dragState.id, dropTarget.id);
            } else {
                const position = this.resolveDropPosition(event, dragState);
                this.updateIconPosition(dragState.id, position.x, position.y, true);
                this.setState({ draggingIconId: null });
            }
            return;
        }

        event.preventDefault();
        const isTouch = event.pointerType === 'touch';
        const shouldActivate = (isTouch && !longPressTriggered)
            || (!selectionChanged && !hadMultiIntent && !(event.ctrlKey || event.metaKey || event.shiftKey));
        this.setState({ draggingIconId: null }, () => {
            if (shouldActivate) {
                this.openApp(dragState.id);
            }
        });
    };

    handleIconPointerCancel = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        event.preventDefault();
        this.cancelIconDrag(true);
    };

    handleIconClickCapture = (event) => {
        if (this.preventNextIconClick) {
            event.stopPropagation();
            event.preventDefault();
            this.preventNextIconClick = false;
        }
    };

    realignIconPositions = () => {
        const desktopApps = this.state.desktop_apps || [];
        if (!desktopApps.length) return;
        this.setState((prevState) => {
            const current = prevState.desktop_icon_positions || {};
            const layout = this.resolveIconLayout(desktopApps, current, { clampOnly: true });
            if (this.areIconLayoutsEqual(current, layout)) {
                return null;
            }
            return { desktop_icon_positions: layout };
        }, () => {
            this.persistIconPositions();
        });
    };

    switchWorkspace = (workspaceId) => {
        if (workspaceId === this.state.activeWorkspace) return;
        if (workspaceId < 0 || workspaceId >= this.state.workspaces.length) return;
        const snapshot = this.workspaceSnapshots[workspaceId] || this.createEmptyWorkspaceState();
        const nextTheme = this.getWorkspaceTheme(workspaceId);
        this.closeOverlay('windowSwitcher');
        this.setState({
            activeWorkspace: workspaceId,
            focused_windows: { ...snapshot.focused_windows },
            closed_windows: { ...snapshot.closed_windows },
            minimized_windows: { ...snapshot.minimized_windows },
            window_positions: { ...snapshot.window_positions },
            switcherWindows: [],
            currentTheme: nextTheme,
        }, () => {
            this.broadcastWorkspaceState();
            this.giveFocusToLastApp();
            if (this.isOverlayOpen(SWITCHER_OVERLAY_ID)) {
                this.closeOverlay(SWITCHER_OVERLAY_ID);
            }
        });
    };

    shiftWorkspace = (direction) => {
        const { activeWorkspace, workspaces } = this.state;
        const count = workspaces.length;
        const next = (activeWorkspace + direction + count) % count;
        this.switchWorkspace(next);
    };

    getActiveStack = () => {
        const { activeWorkspace } = this.state;
        if (!this.workspaceStacks[activeWorkspace]) {
            this.workspaceStacks[activeWorkspace] = [];
        }
        return this.workspaceStacks[activeWorkspace];
    };

    promoteWindowInStack = (id) => {
        if (!id) return;
        const stack = this.getActiveStack();
        const index = stack.indexOf(id);
        if (index !== -1) {
            stack.splice(index, 1);
        }
        stack.unshift(id);
    };

    handleExternalWorkspaceSelect = (event) => {
        const workspaceId = event?.detail?.workspaceId;
        if (typeof workspaceId === 'number') {
            this.switchWorkspace(workspaceId);
        }
    };

    broadcastWorkspaceState = () => {
        if (typeof window === 'undefined') return;
        const runningApps = this.getRunningAppSummaries();
        const runningIds = runningApps.map((app) => app.id);
        if (runningIds.length) {
            const normalizedOrder = this.getNormalizedTaskbarOrder(runningIds, this.state.taskbarOrder || runningIds);
            const currentOrder = this.state.taskbarOrder || [];
            if (
                normalizedOrder.length !== currentOrder.length ||
                normalizedOrder.some((id, index) => id !== currentOrder[index])
            ) {
                this.setTaskbarOrder(normalizedOrder);
            }
        }
        const detail = {
            workspaces: this.getWorkspaceSummaries(),
            activeWorkspace: this.state.activeWorkspace,
            runningApps,
            pinnedApps: this.getPinnedAppSummaries(),
            iconSizePreset: this.state.iconSizePreset,
        };
        window.dispatchEvent(new CustomEvent('workspace-state', { detail }));
    };

    getOverlayDefaults = (key) => {
        const resolved = this.resolveOverlayId(key) || key;
        if (resolved === LAUNCHER_OVERLAY_ID || key === 'launcher') {
            return { open: false, minimized: false, maximized: false, transitionState: 'exited' };
        }
        return { open: false, minimized: false, maximized: false };
    };

    getOverlayState = (key) => {
        const resolved = this.resolveOverlayId(key) || key;
        const overlays = this.state?.overlayWindows || {};
        const current = overlays[resolved] || overlays[key];
        const defaults = this.getOverlayDefaults(resolved);
        return current ? { ...defaults, ...current } : { ...defaults };
    };

    updateOverlayState = (key, updater, callback) => {
        const resolvedKey = this.resolveOverlayId(key) || key;
        if (!resolvedKey) return;
        const aliasKey = Object.entries(OVERLAY_WINDOWS).find(([, meta]) => meta.id === resolvedKey)?.[0];
        this.setState((prevState) => {
            const overlays = prevState.overlayWindows || {};
            const previous = overlays[resolvedKey] ? { ...overlays[resolvedKey] } : this.getOverlayDefaults(resolvedKey);
            const nextState = typeof updater === 'function'
                ? updater({ ...previous })
                : { ...previous, ...(updater || {}) };

            if (!nextState || typeof nextState !== 'object') {
                return null;
            }

            const next = { ...previous, ...nextState };
            const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
            let changed = false;
            for (const name of keys) {
                if (previous[name] !== next[name]) {
                    changed = true;
                    break;
                }
            }

            if (!changed) {
                return null;
            }

            const overlayWindows = { ...overlays, [resolvedKey]: next };
            if (aliasKey) {
                overlayWindows[aliasKey] = next;
            }

            return { overlayWindows };
        }, callback);
    };

    hydrateFromStorage = () => {
        const pinnedAppIds = this.loadPinnedAppIds();
        const iconSizePresetMap = this.loadStoredIconPresetMap();
        const window_sizes = this.loadWindowSizes();
        const folder_contents = loadStoredFolderContents();
        const taskbarOrder = this.loadTaskbarOrder();

        this.iconSizePresetMap = iconSizePresetMap;

        this.setState({
            pinnedAppIds,
            window_sizes,
            folder_contents,
            taskbarOrder,
            mounted: true,
        }, () => {
            this.applyPinnedFlags(pinnedAppIds);
            this.syncFavouriteAppsWithPinned(new Set(pinnedAppIds));
            this.broadcastWorkspaceState();
        });
    };


    componentDidMount() {
        this._isMounted = true;
        // google analytics
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        if (typeof window !== 'undefined') {
            window.addEventListener('workspace-select', this.handleExternalWorkspaceSelect);
            window.addEventListener('workspace-request', this.broadcastWorkspaceState);
            window.addEventListener('taskbar-command', this.handleExternalTaskbarCommand);
            window.addEventListener('taskbar-preview-request', this.handleTaskbarPreviewRequest);
            window.addEventListener('app-badge', this.handleAppBadgeEvent);
            this.broadcastWorkspaceState();
            this.broadcastIconSizePreset(this.state.iconSizePreset);
        }

        this.hydrateFromStorage();
        this.savedIconPositions = this.loadDesktopIconPositions();
        this.setupViewportObserver();
        this.initializeDefaultFolders(() => {
            this.fetchAppsData(() => {
                const session = this.props.session || {};
                const positions = {};
                if (session.windows && session.windows.length) {
                    const safeTopOffset = measureWindowTopOffset();
                    session.windows.forEach(({ id, x, y }) => {
                        positions[id] = {
                            x,
                            y: clampWindowTopPosition(y, safeTopOffset),
                        };
                    });
                    this.setWorkspaceState({ window_positions: positions }, () => {
                        session.windows.forEach(({ id }) => this.openApp(id));
                    });
                } else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production') {
                    this.openApp('about');
                }
            });
            this.checkForNewFolders();
            this.checkForAppShortcuts();
            this.updateTrashIcon();
        });
        this.setContextListeners();
        this.setEventListeners();
        window.addEventListener('trash-change', this.updateTrashIcon);
        window.addEventListener('resize', this.handleViewportResize);
        document.addEventListener('keydown', this.handleGlobalShortcut);
        document.addEventListener('keyup', this.handleGlobalShortcutKeyup);
        window.addEventListener('open-app', this.handleOpenAppEvent);
        this.setupPointerMediaWatcher();
        this.setupGestureListeners();
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            prevProps?.density !== this.props.density ||
            prevProps?.fontScale !== this.props.fontScale ||
            prevProps?.largeHitAreas !== this.props.largeHitAreas
        ) {
            const layoutChanged = this.applyIconLayoutFromSettings(this.props);
            if (layoutChanged) {
                this.realignIconPositions();
            }
        }
        const prevLauncher = prevState.overlayWindows?.[LAUNCHER_OVERLAY_ID];
        const nextLauncher = this.state.overlayWindows?.[LAUNCHER_OVERLAY_ID];

        if (
            prevState.activeWorkspace !== this.state.activeWorkspace ||
            prevState.closed_windows !== this.state.closed_windows ||
            prevState.focused_windows !== this.state.focused_windows ||
            prevState.minimized_windows !== this.state.minimized_windows ||
            prevState.workspaces !== this.state.workspaces ||
            prevState.appBadges !== this.state.appBadges ||
            prevLauncher?.open !== nextLauncher?.open ||
            prevLauncher?.transitionState !== nextLauncher?.transitionState
        ) {
            this.broadcastWorkspaceState();
        }

        const nextTheme = this.normalizeTheme(this.props.desktopTheme);
        const storedTheme = (this.workspaceThemes && this.workspaceThemes[this.state.activeWorkspace]) || null;
        const themeChanged = !this.themesAreEqual(storedTheme, nextTheme);
        const stateThemeChanged = !this.themesAreEqual(this.state.currentTheme, nextTheme);
        if (themeChanged) {
            this.setWorkspaceTheme(this.state.activeWorkspace, nextTheme);
        }
        if (stateThemeChanged) {
            this.setState({ currentTheme: nextTheme });
        }
        if (themeChanged || stateThemeChanged) {
            this.defaultThemeConfig = { ...this.defaultThemeConfig, ...nextTheme };
        }

        const launcherWasOpen = Boolean(prevLauncher?.open);
        const launcherIsOpen = Boolean(nextLauncher?.open);
        if (!launcherWasOpen && launcherIsOpen) {
            this.activateAllAppsFocusTrap();
            this.focusAllAppsSearchInput();
        } else if (launcherWasOpen && !launcherIsOpen) {
            this.deactivateAllAppsFocusTrap();
            this.restoreFocusToPreviousElement();
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.removeEventListeners();
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        document.removeEventListener('keyup', this.handleGlobalShortcutKeyup);
        window.removeEventListener('trash-change', this.updateTrashIcon);
        window.removeEventListener('open-app', this.handleOpenAppEvent);
        window.removeEventListener('resize', this.handleViewportResize);
        this.detachIconKeyboardListeners();
        if (typeof window !== 'undefined') {
            window.removeEventListener('workspace-select', this.handleExternalWorkspaceSelect);
            window.removeEventListener('workspace-request', this.broadcastWorkspaceState);
            window.removeEventListener('taskbar-command', this.handleExternalTaskbarCommand);
            window.removeEventListener('taskbar-preview-request', this.handleTaskbarPreviewRequest);
            window.removeEventListener('app-badge', this.handleAppBadgeEvent);
        }
        this.teardownGestureListeners();
        this.teardownPointerMediaWatcher();
        this.teardownViewportObserver();
        if (this.liveRegionTimeout) {
            clearTimeout(this.liveRegionTimeout);
            this.liveRegionTimeout = null;
        }
        if (this.allAppsCloseTimeout) {
            clearTimeout(this.allAppsCloseTimeout);
            this.allAppsCloseTimeout = null;
        }
        if (this.allAppsEnterRaf && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(this.allAppsEnterRaf);
            this.allAppsEnterRaf = null;
        }
        this.deactivateAllAppsFocusTrap();
        this.clearLongPressState();
    }

    handleExternalTaskbarCommand = (event) => {
        const detail = event?.detail || {};
        const action = detail.action || 'toggle';

        if (action === 'reorderPinned') {
            if (Array.isArray(detail.order)) {
                this.setPinnedAppIds(detail.order);
            }
            return;
        }

        const appId = detail.appId;

        if (action === 'pin') {
            if (appId) {
                const targetId = typeof detail.targetId === 'string' ? detail.targetId : null;
                const insertAfter = Boolean(detail.insertAfter);
                this.pinAppAtPosition(appId, targetId, insertAfter);
            }
            return;
        }

        if (action === 'unpin') {
            if (appId) {
                const current = this.getPinnedAppIds();
                if (current.includes(appId)) {
                    const next = current.filter((id) => id !== appId);
                    this.setPinnedAppIds(next);
                }
            }
            return;
        }

        if (action === 'reorder') {
            if (Array.isArray(detail.order)) {
                const runningIds = this.getCurrentRunningAppIds();
                const normalized = this.getNormalizedTaskbarOrder(runningIds, detail.order);
                this.setTaskbarOrder(normalized);
            }
            return;
        }

        if (!appId || !this.validAppIds.has(appId)) return;

        if (this.isOverlayId(appId)) {
            switch (action) {
                case 'minimize':
                    if (!this.state.minimized_windows[appId]) {
                        this.minimizeOverlay(appId);
                    }
                    break;
                case 'focus':
                case 'open':
                    this.openOverlay(appId, { transitionState: 'entered' });
                    break;
                case 'toggle':
                default:
                    if (this.state.minimized_windows[appId]) {
                        this.openOverlay(appId, { transitionState: 'entered' });
                    } else if (this.state.focused_windows[appId]) {
                        this.minimizeOverlay(appId);
                    } else {
                        this.openOverlay(appId, { transitionState: 'entered' });
                    }
            }
            return;
        }

        switch (action) {
            case 'minimize':
                if (!this.state.minimized_windows[appId]) {
                    this.hasMinimised(appId);
                }
                break;
            case 'focus':
                this.focus(appId);
                break;
            case 'open':
                this.openApp(appId);
                break;
            case 'toggle':
            default:
                if (this.state.minimized_windows[appId]) {
                    this.openApp(appId);
                } else if (this.state.focused_windows[appId]) {
                    this.hasMinimised(appId);
                } else {
                    this.openApp(appId);
                }
        }
    };

    attachIconKeyboardListeners = () => {
        if (this.iconKeyListenerAttached || typeof document === 'undefined') return;
        document.addEventListener('keydown', this.handleIconKeyboardCancel, true);
        this.iconKeyListenerAttached = true;
    };

    detachIconKeyboardListeners = () => {
        if (!this.iconKeyListenerAttached || typeof document === 'undefined') return;
        document.removeEventListener('keydown', this.handleIconKeyboardCancel, true);
        this.iconKeyListenerAttached = false;
    };

    handleIconKeyboardCancel = (event) => {
        if (!this.iconDragState) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.cancelIconDrag(true);
        }
    };

    cancelIconDrag = (revert = false) => {
        const dragState = this.iconDragState;
        if (!dragState) return;

        dragState.container?.releasePointerCapture?.(dragState.pointerId);
        this.iconDragState = null;
        this.detachIconKeyboardListeners();

        if (revert && dragState.startPosition) {
            const original = this.clampIconPosition(dragState.startPosition.x, dragState.startPosition.y);
            this.setState((prevState) => {
                const current = prevState.desktop_icon_positions || {};
                const previous = current[dragState.id];
                if (previous && previous.x === original.x && previous.y === original.y && prevState.draggingIconId === null) {
                    return { draggingIconId: null };
                }
                return {
                    desktop_icon_positions: { ...current, [dragState.id]: original },
                    draggingIconId: null,
                };
            });
        } else {
            this.setState({ draggingIconId: null });
        }

        this.preventNextIconClick = false;
    };

    resolveDropPosition = (event, dragState) => {
        const hasValidCoordinates = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
        if (hasValidCoordinates) {
            return this.calculateIconPosition(event.clientX, event.clientY, dragState);
        }
        const fallback = dragState?.lastPosition || dragState?.startPosition || { x: 0, y: 0 };
        const snapped = this.snapIconPosition(fallback.x, fallback.y);
        return this.clampIconPosition(snapped.x, snapped.y);
    };

    checkForNewFolders = () => {
        const stored = safeLocalStorage?.getItem('new_folders');
        if (!stored) {
            safeLocalStorage?.setItem('new_folders', JSON.stringify([]));
            return;
        }
        try {
            const new_folders = JSON.parse(stored);
            const addedIds = [];
            new_folders.forEach((folder) => {
                const rawId = typeof folder?.id === 'string' ? folder.id : '';
                const nameFallback = typeof folder?.name === 'string' ? folder.name : rawId;
                const baseId = rawId || (nameFallback ? nameFallback.replace(/\s+/g, '-').toLowerCase() : '');
                const normalizedId = baseId
                    ? (baseId.startsWith('new-folder-') ? baseId : `new-folder-${baseId}`)
                    : '';
                if (!normalizedId) return;
                const title = typeof folder?.name === 'string' ? folder.name : (nameFallback || 'New Folder');
                const exists = apps.some((app) => app.id === normalizedId);
                if (!exists) {
                    apps.push({
                        id: normalizedId,
                        title,
                        icon: '/themes/Yaru/system/folder.png',
                        disabled: false,
                        favourite: false,
                        desktop_shortcut: true,
                        isFolder: true,
                        screen: () => null,
                    });
                }
                addedIds.push(normalizedId);
            });
            addedIds.forEach((id) => this.ensureFolderEntry(id));
            if (addedIds.length) {
                this.updateAppsData();
            }
        } catch (e) {
            safeLocalStorage?.setItem('new_folders', JSON.stringify([]));
        }
    }

    setEventListeners = () => {
        const openSettings = document.getElementById("open-settings");
        if (!openSettings) {
            this.removeEventListeners();
            return;
        }

        if (!this.openSettingsClickHandler) {
            this.openSettingsClickHandler = () => {
                this.openApp("settings");
            };
        }

        if (this.openSettingsTarget && this.openSettingsTarget !== openSettings && this.openSettingsClickHandler) {
            this.openSettingsTarget.removeEventListener('click', this.openSettingsClickHandler);
            this.openSettingsListenerAttached = false;
        }

        this.openSettingsTarget = openSettings;

        if (!this.openSettingsListenerAttached && this.openSettingsClickHandler) {
            this.openSettingsTarget.addEventListener('click', this.openSettingsClickHandler);
            this.openSettingsListenerAttached = true;
        }
    }

    removeEventListeners = () => {
        if (this.openSettingsTarget && this.openSettingsClickHandler) {
            this.openSettingsTarget.removeEventListener('click', this.openSettingsClickHandler);
        }
        this.openSettingsTarget = null;
        this.openSettingsListenerAttached = false;
    }

    setContextListeners = () => {
        document.addEventListener('contextmenu', this.checkContextMenu);
        // on click, anywhere, hide all menus
        document.addEventListener('click', this.hideAllContextMenu);
        // allow keyboard activation of context menus
        document.addEventListener('keydown', this.handleContextKey);
        document.addEventListener('click', this.handleLongPressClickCapture, true);
        document.addEventListener('pointerdown', this.handleTouchContextStart, { passive: true });
        document.addEventListener('pointermove', this.handleTouchContextMove, { passive: true });
        document.addEventListener('pointerup', this.handleTouchContextEnd, { passive: true });
        document.addEventListener('pointercancel', this.handleTouchContextCancel, { passive: true });
    }

    removeContextListeners = () => {
        document.removeEventListener("contextmenu", this.checkContextMenu);
        document.removeEventListener("click", this.hideAllContextMenu);
        document.removeEventListener('keydown', this.handleContextKey);
        document.removeEventListener('click', this.handleLongPressClickCapture, true);
        document.removeEventListener('pointerdown', this.handleTouchContextStart);
        document.removeEventListener('pointermove', this.handleTouchContextMove);
        document.removeEventListener('pointerup', this.handleTouchContextEnd);
        document.removeEventListener('pointercancel', this.handleTouchContextCancel);
    }

    handleGlobalShortcut = (e) => {
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            if (!this.isOverlayOpen(SWITCHER_OVERLAY_ID)) {
                this.openWindowSwitcher();
            }
        } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.openApp('clipboard-manager');
        }
        else if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.cycleApps(e.shiftKey ? -1 : 1);
        }
        else if (e.altKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            this.cycleAppWindows(e.shiftKey ? -1 : 1);
        }
        else if (e.metaKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            const id = this.getFocusedWindowId();
            if (id) {
                const event = new CustomEvent('super-arrow', { detail: e.key });
                document.getElementById(id)?.dispatchEvent(event);
            }
        }
        else if (this.isCommandPaletteShortcut(e)) {
            e.preventDefault();
            this.toggleCommandPalette();
        }
        else if (e.key === 'Meta' && !e.repeat && !this.commandPaletteUsesMeta) {
            if (typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
            this.openAllAppsOverlay('Meta');
        }
        else if (e.ctrlKey && e.key === 'Escape' && !e.repeat) {
            e.preventDefault();
            if (this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) {
                this.closeAllAppsOverlay();
            } else {
                this.openAllAppsOverlay('Ctrl+Escape');
            }
        }
    }

    handleGlobalShortcutKeyup = (event) => {
        if (!this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeAllAppsOverlay();
            return;
        }

        if (this.allAppsTriggerKey === 'Meta' && event.key === 'Meta') {
            event.preventDefault();
            this.closeAllAppsOverlay();
            return;
        }

        if (this.allAppsTriggerKey === 'Ctrl+Escape' && event.key === 'Control') {
            event.preventDefault();
            this.closeAllAppsOverlay();
        }
    }

    focusAllAppsSearchInput = () => {
        const focusInput = () => {
            const input = this.allAppsSearchRef?.current;
            if (input && typeof input.focus === 'function') {
                try {
                    input.focus({ preventScroll: true });
                } catch (e) {
                    input.focus();
                }
                if (typeof input.select === 'function') {
                    input.select();
                }
            }
        };

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(focusInput);
        } else {
            focusInput();
        }
    }

    restoreFocusToPreviousElement = () => {
        const target = this.previousFocusElement;
        this.previousFocusElement = null;
        this.allAppsTriggerKey = null;

        if (target && typeof target.focus === 'function') {
            try {
                target.focus();
            } catch (e) {
                // ignore focus errors
            }
        }
    }

    openAllAppsOverlay = (triggerKey = null) => {
        if (this.allAppsCloseTimeout) {
            clearTimeout(this.allAppsCloseTimeout);
            this.allAppsCloseTimeout = null;
        }

        const enter = () => {
            this.setState((state) => {
                const launcher = state.overlayWindows?.[LAUNCHER_OVERLAY_ID];
                if (!launcher?.open) return null;
                return {
                    overlayWindows: this.buildOverlayStateMap(state.overlayWindows, LAUNCHER_OVERLAY_ID, {
                        transitionState: 'entered',
                    }),
                };
            });
            this.allAppsEnterRaf = null;
        };

        const launcherState = this.getLauncherState();
        if (!launcherState?.open) {
            if (typeof document !== 'undefined') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement !== document.body) {
                    this.previousFocusElement = activeElement;
                } else {
                    this.previousFocusElement = null;
                }
            }

            this.openOverlay(LAUNCHER_OVERLAY_ID, { transitionState: 'entering' });
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                this.allAppsEnterRaf = window.requestAnimationFrame(enter);
            } else {
                enter();
            }
        } else {
            this.setState((state) => ({
                overlayWindows: this.buildOverlayStateMap(state.overlayWindows, LAUNCHER_OVERLAY_ID, {
                    transitionState: 'entered',
                }),
            }));
        }

        this.allAppsTriggerKey = triggerKey;
    }

    closeAllAppsOverlay = () => {
        if (!this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) {
            this.allAppsTriggerKey = null;
            return;
        }

        if (this.allAppsCloseTimeout) {
            clearTimeout(this.allAppsCloseTimeout);
            this.allAppsCloseTimeout = null;
        }
        this.closeOverlay(LAUNCHER_OVERLAY_ID, { transitionState: 'exiting' });
        this.allAppsCloseTimeout = setTimeout(() => {
            this.setState((state) => ({
                overlayWindows: this.buildOverlayStateMap(state.overlayWindows, LAUNCHER_OVERLAY_ID, {
                    transitionState: 'exited',
                }),
            }));
            this.allAppsCloseTimeout = null;
        }, 220);
        this.allAppsTriggerKey = null;
    }

    activateAllAppsFocusTrap = () => {
        if (this.allAppsFocusTrapHandler || typeof document === 'undefined') return;

        this.allAppsFocusTrapHandler = (event) => {
            if (event.key !== 'Tab') return;
            if (!this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) return;

            const overlay = this.allAppsOverlayRef?.current;
            if (!overlay) return;

            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([type="hidden"]):not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
            ];

            const focusable = Array.from(
                overlay.querySelectorAll(focusableSelectors.join(','))
            ).filter((element) => {
                if (!(element instanceof HTMLElement)) return false;
                if (element.hasAttribute('disabled')) return false;
                if (element.getAttribute('aria-hidden') === 'true') return false;
                if (!overlay.contains(element)) return false;
                const rect = element.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (!focusable.length) {
                event.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

            if (event.shiftKey) {
                if (!active || active === first || !overlay.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (!active || active === last || !overlay.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', this.allAppsFocusTrapHandler, true);
    }

    deactivateAllAppsFocusTrap = () => {
        if (this.allAppsFocusTrapHandler && typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.allAppsFocusTrapHandler, true);
            this.allAppsFocusTrapHandler = null;
        }
    }

    getFocusedWindowId = () => {
        for (const key in this.state.focused_windows) {
            if (this.state.focused_windows[key]) {
                return key;
            }
        }
        return null;
    }

    cycleApps = (direction) => {
        const stack = this.getActiveStack();
        if (!stack.length) return;
        const currentId = this.getFocusedWindowId();
        let index = stack.indexOf(currentId);
        if (index === -1) index = 0;
        let next = (index + direction + stack.length) % stack.length;
        // Skip minimized windows
        for (let i = 0; i < stack.length; i++) {
            const id = stack[next];
            if (!this.state.minimized_windows[id]) {
                this.focus(id);
                break;
            }
            next = (next + direction + stack.length) % stack.length;
        }
    }

    cycleAppWindows = (direction) => {
        const currentId = this.getFocusedWindowId();
        if (!currentId) return;
        const base = currentId.split('#')[0];
        const windows = this.getActiveStack().filter(id => id.startsWith(base));
        if (windows.length <= 1) return;
        let index = windows.indexOf(currentId);
        let next = (index + direction + windows.length) % windows.length;
        this.focus(windows[next]);
    }

    resolvePreviewIconUrl = (icon) => {
        if (typeof window === 'undefined') return null;
        if (typeof icon !== 'string' || !icon) return null;
        try {
            return new URL(icon, window.location.href).toString();
        } catch (e) {
            return null;
        }
    };

    buildFallbackPreview = (id) => {
        const app = this.getAppById(id) || {};
        const title = app.title || app.name || id;
        return buildWindowPreviewFallbackDataUrl({
            title,
            iconUrl: this.resolvePreviewIconUrl(app.icon),
            subtitle: null,
        });
    };

    captureWindowPreview = async (id, mode = 'normal') => {
        if (typeof document === 'undefined') return null;
        const node = document.getElementById(id);
        if (!node) return null;
        try {
            return await toPng(node, {
                cacheBust: true,
                pixelRatio: 1,
                skipFonts: true,
                style: {
                    opacity: '1',
                    visibility: 'visible',
                },
                filter: createWindowPreviewFilter(mode),
            });
        } catch (error) {
            return null;
        }
    };

    getWindowPreview = async (id) => {
        if (this.windowPreviewCache.has(id)) {
            const cached = this.windowPreviewCache.get(id);
            if (typeof cached === 'string' && cached.length) {
                return cached;
            }
            // Previously we could cache null when snapshotting failed; treat that as a miss
            // so the taskbar preview can recover automatically.
            this.windowPreviewCache.delete(id);
        }

        let preview = await this.captureWindowPreview(id, 'normal');
        if (!preview) {
            preview = await this.captureWindowPreview(id, 'aggressive');
        }
        // If we managed to capture a PNG, persist it as the "last known good" snapshot.
        if (typeof preview === 'string' && preview.startsWith('data:image/png')) {
            this.windowPreviewLastGoodCache.set(id, preview);
        }

        // If capture fails (cross-origin iframes, tainted canvases, etc.), fall back to the
        // last good snapshot instead of showing "unavailable".
        if (!preview && this.windowPreviewLastGoodCache?.has(id)) {
            preview = this.windowPreviewLastGoodCache.get(id);
        }

        if (!preview) {
            preview = this.buildFallbackPreview(id);
        }

        this.windowPreviewCache.set(id, preview);
        return preview;
    };

    handleTaskbarPreviewRequest = (event) => {
        const detail = event?.detail || {};
        const appId = detail.appId;
        const requestId = detail.requestId;
        if (!appId || requestId === undefined || requestId === null) {
            return;
        }

        if (detail.bustCache && this.windowPreviewCache?.has(appId)) {
            this.windowPreviewCache.delete(appId);
        }

        Promise.resolve(this.getWindowPreview(appId))
            .then((preview) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-preview-response', {
                    detail: { appId, requestId, preview },
                }));
            })
            .catch(() => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-preview-response', {
                    detail: { appId, requestId, preview: null },
                }));
            });
    };

    buildWindowSwitcherEntries = async (ids) => {
        const entries = [];
        for (const id of ids) {
            const app = this.getAppById(id) || {};
            const preview = await this.getWindowPreview(id);
            entries.push({
                id,
                title: app.title || app.name || id,
                icon: app.icon,
                preview,
            });
        }
        return entries;
    };

    openWindowSwitcher = () => {
        const stack = this.getActiveStack();
        const availableIds = stack.filter((id) => (
            this.state.closed_windows[id] === false && !this.state.minimized_windows[id]
        ));

        if (!availableIds.length) {
            return;
        }

        const requestId = ++this.windowSwitcherRequestId;
        this.openOverlay(SWITCHER_OVERLAY_ID);

        Promise.resolve(this.buildWindowSwitcherEntries(availableIds))
            .then((windows) => {
                if (this.windowSwitcherRequestId !== requestId) {
                    return;
                }

                if (!windows.length) {
                    this.setState({ switcherWindows: [] });
                    this.closeOverlay(SWITCHER_OVERLAY_ID);
                    return;
                }

                this.setState({ switcherWindows: windows });
            })
            .catch(() => {
                if (this.windowSwitcherRequestId === requestId) {
                    this.setState({ switcherWindows: [] });
                    this.closeOverlay(SWITCHER_OVERLAY_ID);
                }
            });
    }

    closeWindowSwitcher = () => {
        this.setState({ switcherWindows: [] });
        this.closeOverlay(SWITCHER_OVERLAY_ID);
    }

    selectWindow = (id) => {
        this.setState({ switcherWindows: [] }, () => {
            this.closeOverlay(SWITCHER_OVERLAY_ID);
            this.openApp(id);
        });
    }

    checkContextMenu = (e) => {
        e.preventDefault();
        this.openContextMenuFromTarget(e.target, e);
    }

    handleContextKey = (e) => {
        if (!(e.shiftKey && e.key === 'F10')) return;
        e.preventDefault();
        const resolved = this.resolveContextTarget(e.target);
        const rect = resolved.contextNode ? resolved.contextNode.getBoundingClientRect() : { left: 0, top: 0, height: 0 };
        const fakeEvent = { pageX: rect.left, pageY: rect.top + rect.height };
        this.openContextMenuFromContext(resolved.context, resolved.appId, fakeEvent);
    }

    showContextMenu = (e, menuName /* context menu name */) => {
        let { posx, posy } = this.getMenuPosition(e);
        let contextMenu = document.getElementById(`${menuName}-menu`);

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        if (posx + menuWidth > window.innerWidth) posx -= menuWidth;
        if (posy + menuHeight > window.innerHeight) posy -= menuHeight;

        posx = posx.toString() + "px";
        posy = posy.toString() + "px";

        contextMenu.style.left = posx;
        contextMenu.style.top = posy;

        this.setState({ context_menus: { ...this.state.context_menus, [menuName]: true } });
    }

    hideAllContextMenu = () => {
        const menus = { ...this.state.context_menus };
        Object.keys(menus).forEach(key => {
            menus[key] = false;
        });
        this.setState({ context_menus: menus, context_app: null });
    }

    getMenuPosition = (e) => {
        var posx = 0;
        var posy = 0;

        if (!e) e = window.event;

        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft +
                document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop +
                document.documentElement.scrollTop;
        }
        return {
            posx, posy
        }
    }

    fetchAppsData = (callback) => {
        this.refreshAppRegistry();

        const currentPinned = this.getPinnedAppIds();
        const pinnedAppIds = this.setPinnedAppIds(currentPinned, {
            persist: true,
            broadcast: false,
            force: true,
            syncFavourite: false,
        });
        const pinnedSet = new Set(pinnedAppIds);

        const baseFocused = { ...createOverlayFlagMap(false), ...(this.state.focused_windows || {}) };
        const baseClosed = { ...createOverlayFlagMap(true), ...(this.state.closed_windows || {}) };
        const baseMinimized = { ...createOverlayFlagMap(false), ...(this.state.minimized_windows || {}) };

        const focused_windows = { ...baseFocused };
        const closed_windows = { ...baseClosed };
        const disabled_apps = {};
        const favourite_apps = {};
        const minimized_windows = { ...baseMinimized };
        const desktop_apps = [];
        const hiddenIconIds = this.getAllFolderItemIds();

        apps.forEach((app) => {
            const fallbackClosed = baseClosed[app.id];
            const fallbackFocused = baseFocused[app.id];
            const fallbackMinimized = baseMinimized[app.id];
            focused_windows[app.id] = typeof fallbackFocused === 'boolean' ? fallbackFocused : false;
            closed_windows[app.id] = typeof fallbackClosed === 'boolean' ? fallbackClosed : true;
            minimized_windows[app.id] = typeof fallbackMinimized === 'boolean' ? fallbackMinimized : false;
            disabled_apps[app.id] = app.disabled;
            favourite_apps[app.id] = pinnedSet.has(app.id);
            if (app.desktop_shortcut && !hiddenIconIds.has(app.id)) desktop_apps.push(app.id);
        });

        const workspaceState = {
            focused_windows,
            closed_windows,
            minimized_windows,
            window_positions: this.state.window_positions || {},
            window_sizes: this.state.window_sizes || {},
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps,
        }, () => {
            this.ensureIconPositions(desktop_apps);
            if (typeof callback === 'function') callback();
            this.broadcastWorkspaceState();
        });
        this.initFavourite = { ...favourite_apps };
    }

    updateAppsData = () => {
        this.refreshAppRegistry();

        const currentPinned = this.getPinnedAppIds();
        const pinnedAppIds = this.setPinnedAppIds(currentPinned, {
            persist: true,
            broadcast: false,
            force: true,
            syncFavourite: false,
        });
        const pinnedSet = new Set(pinnedAppIds);

        const baseFocused = { ...createOverlayFlagMap(false), ...(this.state.focused_windows || {}) };
        const baseClosed = { ...createOverlayFlagMap(true), ...(this.state.closed_windows || {}) };
        const baseMinimized = { ...createOverlayFlagMap(false), ...(this.state.minimized_windows || {}) };

        const focused_windows = { ...baseFocused };
        const closed_windows = { ...baseClosed };
        const favourite_apps = {};
        const minimized_windows = { ...baseMinimized };
        const disabled_apps = {};
        const desktop_apps = [];
        const hiddenIconIds = this.getAllFolderItemIds();

        apps.forEach((app) => {
            const fallbackFocused = baseFocused[app.id];
            const fallbackMinimized = baseMinimized[app.id];
            const fallbackClosed = baseClosed[app.id];
            focused_windows[app.id] = typeof fallbackFocused === 'boolean' ? fallbackFocused : false;
            minimized_windows[app.id] = typeof fallbackMinimized === 'boolean' ? fallbackMinimized : false;
            disabled_apps[app.id] = app.disabled;
            closed_windows[app.id] = typeof fallbackClosed === 'boolean' ? fallbackClosed : true;
            favourite_apps[app.id] = pinnedSet.has(app.id);
            if (app.desktop_shortcut && !hiddenIconIds.has(app.id)) desktop_apps.push(app.id);
        });

        const workspaceState = {
            focused_windows,
            closed_windows,
            minimized_windows,
            window_positions: this.state.window_positions || {},
            window_sizes: this.state.window_sizes || {},
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps,
        }, () => {
            this.ensureIconPositions(desktop_apps);
            this.broadcastWorkspaceState();
        });
        this.initFavourite = { ...favourite_apps };
    }

    hasVisibleWindows = () => {
        const closed = this.state.closed_windows || {};
        const minimized = this.state.minimized_windows || {};
        return Object.keys(closed).some(
            (id) => this.validAppIds.has(id) && closed[id] === false && !minimized[id],
        );
    };

    renderDesktopApps = () => {
        const {
            desktop_apps: desktopApps,
            desktop_icon_positions: positions = {},
            draggingIconId,
            keyboardMoveState,
        } = this.state;
        if (!desktopApps || desktopApps.length === 0) return null;

        const hasOpenWindows = this.hasVisibleWindows();
        const blockIcons = hasOpenWindows && !draggingIconId;
        const iconBaseZIndex = 15;
        const containerZIndex = blockIcons ? 5 : 15;
        const selectionSet = this.state.selectedIcons instanceof Set ? this.state.selectedIcons : new Set();
        const hoveredIconId = this.state.hoveredIconId;
        const marqueeSelection = this.state.marqueeSelection;

        const icons = desktopApps.map((appId, index) => {
            const app = this.getAppById(appId);
            if (!app) return null;

            const props = {
                name: app.title,
                id: app.id,
                icon: app.icon,
                openApp: this.openApp,
                disabled: this.state.disabled_apps[app.id],
                prefetch: app.screen?.prefetch,
                style: this.desktopIconVariables,
                accentVariables: this.desktopAccentVariables,
            };

            const position = (keyboardMoveState && keyboardMoveState.id === appId && keyboardMoveState.position)
                ? keyboardMoveState.position
                : (positions[appId] || this.computeGridPosition(index));
            const isKeyboardMoving = Boolean(keyboardMoveState && keyboardMoveState.id === appId);
            const isDragging = draggingIconId === appId || isKeyboardMoving;
            const isSelected = selectionSet.has(appId);
            const isHovered = hoveredIconId === appId;
            const assistiveHint = this.buildKeyboardMoveHint(app, isKeyboardMoving, position);
            const wrapperStyle = {
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'pointer',
                zIndex: isDragging ? 60 : iconBaseZIndex,
            };

            return (
                <div
                    key={app.id}
                    style={wrapperStyle}
                    onPointerDown={(event) => this.handleIconPointerDown(event, app.id)}
                    onPointerMove={this.handleIconPointerMove}
                    onPointerUp={this.handleIconPointerUp}
                    onPointerCancel={this.handleIconPointerCancel}
                    onClickCapture={this.handleIconClickCapture}
                    onPointerEnter={() => this.handleIconPointerEnter(app.id)}
                    onPointerLeave={() => this.handleIconPointerLeave(app.id)}
                >
                    <UbuntuApp
                        {...props}
                        draggable={false}
                        isBeingDragged={isDragging}
                        onKeyDown={(event) => this.handleIconKeyDown(event, app)}
                        onBlur={(event) => this.handleIconBlur(event, app.id)}
                        onPointerUp={(event) => {
                            if (this.isLongPressTriggered(event)) {
                                event.preventDefault();
                            }
                        }}
                        assistiveHint={assistiveHint}
                        isSelected={isSelected}
                        isHovered={isHovered}
                    />
                </div>
            );
        }).filter(Boolean);

        if (!icons.length) return null;

        return (
            <div
                className="absolute inset-0"
                aria-hidden={blockIcons ? 'true' : 'false'}
                style={{
                    pointerEvents: 'auto',
                    zIndex: containerZIndex,
                }}
                onPointerDown={this.handleDesktopPointerDown}
                onPointerMove={this.handleDesktopPointerMove}
                onPointerUp={this.handleDesktopPointerUp}
                onPointerCancel={this.handleDesktopPointerCancel}
            >
                {icons}
                {marqueeSelection ? (
                    <div
                        className="absolute pointer-events-none rounded-sm border border-sky-300/80 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                        style={{
                            left: `${marqueeSelection.left}px`,
                            top: `${marqueeSelection.top}px`,
                            width: `${marqueeSelection.width}px`,
                            height: `${marqueeSelection.height}px`,
                        }}
                    />
                ) : null}
            </div>
        );
    }

    renderWindows = () => {
        const { closed_windows = {}, minimized_windows = {}, focused_windows = {} } = this.state;
        const safeTopOffset = measureWindowTopOffset();
        const stack = this.getActiveStack();
        const orderedIds = [];
        const seen = new Set();

        stack.slice().reverse().forEach((id) => {
            if (closed_windows[id] === false && !seen.has(id)) {
                orderedIds.push(id);
                seen.add(id);
            }
        });

        apps.forEach((app) => {
            if (closed_windows[app.id] === false && !seen.has(app.id)) {
                orderedIds.push(app.id);
                seen.add(app.id);
            }
        });

        if (!orderedIds.length) return null;

        const appMap = new Map(apps.map((app) => [app.id, app]));
        const snapGrid = this.getSnapGrid();

        return orderedIds.map((id, index) => {
            const app = appMap.get(id);
            if (!app) return null;
            const pos = this.state.window_positions[id];
            const persistedSizes = this.state.window_sizes?.[id] || this.loadWindowSizes()?.[id];
            const size = persistedSizes;
            const defaultWidth = size && typeof size.width === 'number' ? size.width : app.defaultWidth;
            const defaultHeight = size && typeof size.height === 'number' ? size.height : app.defaultHeight;
            const props = {
                title: app.title,
                id: app.id,
                screen: app.screen,
                addFolder: this.addToDesktop,
                closed: this.closeApp,
                openApp: this.openApp,
                focus: this.focus,
                isFocused: focused_windows[id],
                hasMinimised: this.hasMinimised,
                minimized: minimized_windows[id],
                resizable: app.resizable,
                allowMaximize: app.allowMaximize,
                defaultWidth,
                defaultHeight,
                responsiveWidth: app.responsiveWidth,
                responsiveHeight: app.responsiveHeight,
                initialX: pos ? pos.x : undefined,
                initialY: pos ? clampWindowTopPosition(pos.y, safeTopOffset) : safeTopOffset,
                onPositionChange: (x, y) => this.updateWindowPosition(id, x, y),
                onSizeChange: (width, height) => this.updateWindowSize(id, width, height),
                snapEnabled: this.props.snapEnabled,
                snapGrid,
                context: this.state.window_context[id],
            };

            return <Window key={id} {...props} />;
        }).filter(Boolean);
    }

    renderOverlayWindows = () => {
        const elements = [];
        const overlays = this.state.overlayWindows || {};

        const launcherState = overlays[LAUNCHER_OVERLAY_ID];
        if (launcherState) {
            const transitionState = launcherState.transitionState || (launcherState.open ? 'entered' : 'exited');
            const shouldRender = launcherState.open || ['entering', 'exiting'].includes(transitionState);
            const overlayActive = launcherState.open && !launcherState.minimized;
            const overlayVisibleClass = overlayActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';
            const frameMotionClass = overlayActive ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-2';
            const frameMaximizedClass = launcherState.maximized
                ? 'max-w-6xl lg:max-w-7xl xl:max-w-[90vw] h-[calc(100vh-5rem)]'
                : 'max-w-6xl';
            if (shouldRender) {
                elements.push(
                    <SystemOverlayWindow
                        key={LAUNCHER_OVERLAY_ID}
                        id={LAUNCHER_OVERLAY_ID}
                        title="All Applications"
                        open={shouldRender}
                        minimized={Boolean(launcherState.minimized || !launcherState.open)}
                        maximized={Boolean(launcherState.maximized)}
                        overlayRef={this.allAppsOverlayRef}
                        overlayClassName={`z-[600] overflow-y-auto bg-slate-950/70 backdrop-blur-xl transition-opacity duration-200 ease-out ${overlayVisibleClass}`}
                        frameClassName={`w-full transform transition-all duration-200 ease-out focus:outline-none ${frameMotionClass} ${frameMaximizedClass}`}
                        bodyClassName="bg-transparent p-0"
                        ariaLabelledBy="all-apps-overlay-title"
                        onMinimize={() => this.toggleOverlayMinimize(LAUNCHER_OVERLAY_ID)}
                        onMaximize={() => this.toggleOverlayMaximize(LAUNCHER_OVERLAY_ID)}
                        onClose={this.closeAllAppsOverlay}
                    >
                        <AllApplications
                            apps={apps}
                            games={games}
                            recentApps={this.getActiveStack()}
                            openApp={this.openApp}
                            searchInputRef={this.allAppsSearchRef}
                            headingId="all-apps-overlay-title"
                        />
                    </SystemOverlayWindow>
                );
            }
        }

        const shortcutState = overlays[SHORTCUT_OVERLAY_ID];
        if (shortcutState) {
            const shortcutActive = shortcutState.open && !shortcutState.minimized;
            const shortcutClasses = shortcutActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';
            const shortcutFrame = shortcutActive ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-2';
            if (shortcutState.open || shortcutState.minimized) {
                elements.push(
                    <SystemOverlayWindow
                        key={SHORTCUT_OVERLAY_ID}
                        id={SHORTCUT_OVERLAY_ID}
                        title="Add to Desktop"
                        open={Boolean(shortcutState.open)}
                        minimized={Boolean(shortcutState.minimized)}
                        maximized={Boolean(shortcutState.maximized)}
                        overlayClassName={`z-[550] bg-slate-950/70 backdrop-blur-xl transition-opacity duration-200 ease-out ${shortcutClasses}`}
                        frameClassName={`w-full max-w-4xl transform transition-all duration-200 ease-out ${shortcutFrame}`}
                        bodyClassName="bg-transparent p-0"
                        allowMaximize={false}
                        onMinimize={() => this.toggleOverlayMinimize(SHORTCUT_OVERLAY_ID)}
                        onClose={() => this.closeOverlay(SHORTCUT_OVERLAY_ID)}
                    >
                        <ShortcutSelector
                            apps={apps}
                            games={games}
                            onSelect={this.addShortcutToDesktop}
                            onClose={() => this.closeOverlay(SHORTCUT_OVERLAY_ID)}
                        />
                    </SystemOverlayWindow>
                );
            }
        }

        const switcherState = overlays[SWITCHER_OVERLAY_ID];
        if (switcherState) {
            const switcherActive = switcherState.open && !switcherState.minimized;
            const switcherOverlayClasses = switcherActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none';
            const switcherFrameClasses = switcherActive ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-2';
            if (switcherState.open || switcherState.minimized) {
                elements.push(
                    <SystemOverlayWindow
                        key={SWITCHER_OVERLAY_ID}
                        id={SWITCHER_OVERLAY_ID}
                        title="Window Switcher"
                        open={Boolean(switcherState.open)}
                        minimized={Boolean(switcherState.minimized || !switcherState.open)}
                        maximized={Boolean(switcherState.maximized)}
                        overlayClassName={`z-[520] bg-slate-950/65 backdrop-blur-xl transition-opacity duration-150 ease-out ${switcherOverlayClasses}`}
                        frameClassName={`w-full max-w-5xl transform transition-all duration-150 ease-out ${switcherFrameClasses}`}
                        bodyClassName="bg-transparent p-0"
                        allowMaximize={false}
                        onMinimize={() => this.toggleOverlayMinimize(SWITCHER_OVERLAY_ID)}
                        onClose={this.closeWindowSwitcher}
                    >
                        <WindowSwitcher
                            windows={this.state.switcherWindows}
                            onSelect={this.selectWindow}
                            onClose={this.closeWindowSwitcher}
                        />
                    </SystemOverlayWindow>
                );
            }
        }

        const commandPaletteState = overlays[COMMAND_PALETTE_OVERLAY_ID];
        if (commandPaletteState && (commandPaletteState.open || commandPaletteState.minimized)) {
            const paletteActive = commandPaletteState.open && !commandPaletteState.minimized;
            elements.push(
                <SystemOverlayWindow
                    key={COMMAND_PALETTE_OVERLAY_ID}
                    id={COMMAND_PALETTE_OVERLAY_ID}
                    title="Command Palette"
                    open={Boolean(commandPaletteState.open)}
                    minimized={Boolean(commandPaletteState.minimized)}
                    maximized={Boolean(commandPaletteState.maximized)}
                    onMinimize={() => this.toggleOverlayMinimize(COMMAND_PALETTE_OVERLAY_ID)}
                    onClose={this.closeCommandPalette}
                    allowMaximize={false}
                    overlayClassName="bg-slate-950/70 backdrop-blur-xl transition-opacity duration-200 ease-out"
                    frameClassName="w-full max-w-3xl"
                    bodyClassName="bg-transparent p-0"
                >
                    <CommandPalette
                        open={paletteActive}
                        apps={this.getCommandPaletteAppItems()}
                        recentWindows={this.getCommandPaletteRecentWindows()}
                        settingsActions={this.getCommandPaletteSettingsActions()}
                        onSelect={this.handleCommandPaletteSelect}
                        onClose={this.closeCommandPalette}
                    />
                </SystemOverlayWindow>
            );
        }

        return elements;
    }

    updateWindowPosition = (id, x, y) => {
        const [gridX, gridY] = this.getSnapGrid();
        const snapValue = (value, size) => {
            if (!this.props.snapEnabled) return value;
            if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return value;
            return Math.round(value / size) * size;
        };
        const safeTopOffset = measureWindowTopOffset();
        const nextX = snapValue(x, gridX);
        const nextY = clampWindowTopPosition(snapValue(y, gridY), safeTopOffset);
        this.setWorkspaceState(prev => ({
            window_positions: { ...prev.window_positions, [id]: { x: nextX, y: nextY } }
        }), () => {
            this.persistWindowSizes(this.state.window_sizes || {});
            this.saveSession();
        });
    }

    updateWindowSize = (id, width, height) => {
        if (!id) return;
        const normalizedWidth = Number(width);
        const normalizedHeight = Number(height);
        if (!Number.isFinite(normalizedWidth) || !Number.isFinite(normalizedHeight)) {
            return;
        }
        const safeWidth = Math.max(0, Math.round(normalizedWidth));
        const safeHeight = Math.max(0, Math.round(normalizedHeight));
        this.setWorkspaceState((prev) => {
            const nextSizes = { ...(prev.window_sizes || {}) };
            nextSizes[id] = { width: safeWidth, height: safeHeight };
            return { window_sizes: nextSizes };
        }, () => {
            this.persistWindowSizes(this.state.window_sizes || {});
        });
    }

    getSnapGrid = () => {
        const fallback = [8, 8];
        if (!Array.isArray(this.props.snapGrid)) {
            return [...fallback];
        }
        const [gridX, gridY] = this.props.snapGrid;
        const normalize = (size, fallbackSize) => {
            if (typeof size !== 'number') return fallbackSize;
            if (!Number.isFinite(size)) return fallbackSize;
            if (size <= 0) return fallbackSize;
            return size;
        };
        return [normalize(gridX, fallback[0]), normalize(gridY, fallback[1])];
    }

    saveSession = () => {
        if (!this.props.setSession) return;
        const openWindows = Object.keys(this.state.closed_windows).filter((id) => (
            this.state.closed_windows[id] === false && !this.isOverlayId(id)
        ));
        const safeTopOffset = measureWindowTopOffset();
        const windows = openWindows.map(id => {
            const position = this.state.window_positions[id] || {};
            const nextX = typeof position.x === 'number' ? position.x : 60;
            const nextY = clampWindowTopPosition(position.y, safeTopOffset);
            return { id, x: nextX, y: nextY };
        });

        const nextSession = { ...this.props.session, windows };
        if ('dock' in nextSession) {
            delete nextSession.dock;
        }
        this.props.setSession(nextSession);
    }

    hasMinimised = (objId) => {
        if (this.isOverlayId(objId)) {
            this.minimizeOverlay(objId);
            return;
        }
        this.setState((prev) => {
            const minimized_windows = { ...prev.minimized_windows, [objId]: true };
            const focused_windows = { ...prev.focused_windows, [objId]: false };
            this.commitWorkspacePartial({ minimized_windows, focused_windows }, prev.activeWorkspace);
            return {
                minimized_windows,
                focused_windows,
            };
        }, () => {
            this.giveFocusToLastApp();
        });
    }

    giveFocusToLastApp = () => {
        // if there is atleast one app opened, give it focus
        if (!this.checkAllMinimised()) {
            const stack = this.getActiveStack();
            for (let index = 0; index < stack.length; index++) {
                if (!this.state.minimized_windows[stack[index]]) {
                    this.focus(stack[index]);
                    break;
                }
            }
        }
    }

    toggleMinimizedShelf = () => {
        this.setState((prev) => ({ minimizedShelfOpen: !prev.minimizedShelfOpen }));
    };

    toggleClosedShelf = () => {
        this.setState((prev) => ({ closedShelfOpen: !prev.closedShelfOpen }));
    };

    handleMinimizedWindowActivate = (id) => {
        if (!id) return;
        if (this.isOverlayId(id)) {
            this.openOverlay(id, { transitionState: 'entered' });
        } else {
            this.openApp(id);
        }
        this.setState({ minimizedShelfOpen: false });
    };

    handleClosedWindowActivate = (id) => {
        if (!id) return;
        if (this.isOverlayId(id)) {
            this.openOverlay(id, { transitionState: 'entered' });
        } else {
            this.openApp(id);
        }
        this.setState({ closedShelfOpen: false });
    };

    dismissClosedWindowEntry = (id) => {
        if (!id) return;
        this.setState((prev) => {
            const current = prev.closed_windows || {};
            if (!Object.prototype.hasOwnProperty.call(current, id)) {
                return null;
            }
            const closed_windows = { ...current };
            delete closed_windows[id];
            this.commitWorkspacePartial({ closed_windows }, prev.activeWorkspace);
            return { closed_windows };
        }, () => {
            if (this.isOverlayId(id)) {
                this.recentlyClosedOverlays.delete(id);
            }
            this.saveSession();
        });
    };

    checkAllMinimised = () => {
        let result = true;
        for (const key in this.state.minimized_windows) {
            if (!this.state.closed_windows[key]) { // if app is opened
                result = result & this.state.minimized_windows[key];
            }
        }
        return result;
    }

    handleOpenAppEvent = (e) => {
        const detail = e.detail;
        if (!detail) return;
        if (typeof detail === 'string') {
            this.openApp(detail);
            return;
        }
        if (typeof detail === 'object' && detail.id) {
            const { id, ...context } = detail;
            this.openApp(id, context);
        }
    }

    openApp = (objId, params) => {
        if (!this.validAppIds.has(objId)) {
            console.warn(`Attempted to open unknown app: ${objId}`);
            return;
        }
        if (this.isOverlayId(objId)) {
            this.openOverlay(objId);
            return;
        }
        const baseContext = params && typeof params === 'object'
            ? {
                ...params,
                ...(params.path && !params.initialPath ? { initialPath: params.path } : {}),
            }
            : undefined;
        const folderContext = this.isFolderApp(objId) ? this.getFolderContext(objId) : null;
        const context = folderContext || baseContext
            ? { ...(folderContext || {}), ...(baseContext || {}) }
            : undefined;
        const contextState = context
            ? { ...this.state.window_context, [objId]: context }
            : this.state.window_context;


        // google analytics
        ReactGA.event({
            category: `Open App`,
            action: `Opened ${objId} window`
        });

        // if the app is disabled
        if (this.state.disabled_apps[objId]) return;

        if (!this.isOverlayId(objId) && this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) {
            this.closeAllAppsOverlay();
        }

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
            // if it's minimised, restore its last position
            if (this.state.minimized_windows[objId]) {
                this.focus(objId);
                var r = document.querySelector("#" + objId);
                r.style.transform = `translate(${r.style.getPropertyValue("--window-transform-x")},${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;
                let minimized_windows = this.state.minimized_windows;
                minimized_windows[objId] = false;
                this.setWorkspaceState({ minimized_windows }, this.saveSession);

            }

            const reopen = () => {
                // if it's minimised, restore its last position
                if (this.state.minimized_windows[objId]) {
                    this.focus(objId);
                    var r = document.querySelector("#" + objId);
                    r.style.transform = `translate(${r.style.getPropertyValue("--window-transform-x")},${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;
                    let minimized_windows = this.state.minimized_windows;
                    minimized_windows[objId] = false;
                    this.setState({ minimized_windows: minimized_windows }, this.saveSession);
                } else {
                    this.focus(objId);
                    this.saveSession();
                }
                this.autoMaximizeWindow(objId);
            };
            if (context) {
                this.setState({ window_context: contextState }, reopen);
            } else {
                reopen();
            }
            return;
        } else {
            let frequentApps = [];
            try { frequentApps = JSON.parse(safeLocalStorage?.getItem('frequentApps') || '[]'); } catch (e) { frequentApps = []; }
            var currentApp = frequentApps.find(app => app.id === objId);
            if (currentApp) {
                frequentApps.forEach((app) => {
                    if (app.id === currentApp.id) {
                        app.frequency += 1; // increase the frequency if app is found 
                    }
                });
            } else {
                frequentApps.push({ id: objId, frequency: 1 }); // new app opened
            }

            frequentApps.sort((a, b) => {
                if (a.frequency < b.frequency) {
                    return 1;
                }
                if (a.frequency > b.frequency) {
                    return -1;
                }
                return 0; // sort according to decreasing frequencies
            });

            safeLocalStorage?.setItem('frequentApps', JSON.stringify(frequentApps));

            addRecentApp(objId);

            this.closeAllAppsOverlay();

            const reopenWindow = () => {
                const closed_windows = { ...this.state.closed_windows, [objId]: false }; // openes app's window
                const favourite_apps = { ...this.state.favourite_apps, [objId]: true }; // adds opened app to sideBar
                const minimized_windows = { ...this.state.minimized_windows, [objId]: false };
                this.setWorkspaceState({ closed_windows, minimized_windows }, () => {
                    const nextState = { closed_windows, favourite_apps, minimized_windows };
                    if (context) {
                        nextState.window_context = { ...this.state.window_context, [objId]: context };
                    }
                    this.setState(nextState, () => {
                        this.focus(objId);
                        this.saveSession();
                        this.autoMaximizeWindow(objId);
                    });
                });
            };

            if (process.env.NODE_ENV === 'test') {
                reopenWindow();
            } else {
                setTimeout(reopenWindow, 200);
            }
        }
    }

    closeApp = async (objId) => {
        if (this.isOverlayId(objId)) {
            this.closeOverlay(objId);
            return;
        }

        if (process.env.NODE_ENV === 'test') {
            this.setWorkspaceState((prevState) => {
                const closed_windows = { ...prevState.closed_windows, [objId]: true };
                const minimized_windows = { ...prevState.minimized_windows, [objId]: false };
                const partial = { closed_windows, minimized_windows };
                if (prevState.focused_windows?.[objId]) {
                    partial.focused_windows = { ...prevState.focused_windows, [objId]: false };
                }
                return partial;
            }, this.saveSession);

            this.setState((prevState) => {
                const closed_windows = { ...prevState.closed_windows, [objId]: true };
                const favourite_apps = { ...prevState.favourite_apps };
                if (this.initFavourite[objId] === false) {
                    favourite_apps[objId] = false;
                }
                const minimized_windows = { ...prevState.minimized_windows, [objId]: false };
                const window_context = { ...prevState.window_context };
                delete window_context[objId];
                const nextState = {
                    closed_windows,
                    favourite_apps,
                    minimized_windows,
                    window_context,
                };
                if (prevState.focused_windows?.[objId]) {
                    nextState.focused_windows = { ...prevState.focused_windows, [objId]: false };
                }
                return nextState;
            }, this.saveSession);

            this.clearAppBadge(objId, { force: true });
            return;
        }

        // capture window snapshot
        let image = await this.captureWindowPreview(objId, 'normal');
        if (!image) {
            image = await this.captureWindowPreview(objId, 'aggressive');
        }
        if (!image && this.windowPreviewLastGoodCache?.has(objId)) {
            image = this.windowPreviewLastGoodCache.get(objId);
        }
        if (!image) {
            image = this.buildFallbackPreview(objId);
        }

        // persist in trash with autopurge
        const appMeta = apps.find(a => a.id === objId) || {};
        const purgeDays = parseInt(safeLocalStorage?.getItem('trash-purge-days') || '30', 10);
        const ms = purgeDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let trash = [];
        try { trash = JSON.parse(safeLocalStorage?.getItem('window-trash') || '[]'); } catch (e) { trash = []; }
        trash = trash.filter(item => now - item.closedAt <= ms);
        trash.push({
            id: objId,
            title: appMeta.title || objId,
            icon: appMeta.icon,
            image,
            closedAt: now,
        });
        safeLocalStorage?.setItem('window-trash', JSON.stringify(trash));
        this.updateTrashIcon();

        // remove app from the app stack
        const stack = this.getActiveStack();
        const index = stack.indexOf(objId);
        if (index !== -1) {
            stack.splice(index, 1);
        }

        if (this.windowPreviewCache?.has(objId)) {
            this.windowPreviewCache.delete(objId);
        }

        this.giveFocusToLastApp();

        // close window and wait for state updates to complete so callers can rely on the latest values
        await new Promise((resolve) => {
            this.setWorkspaceState((prevState) => {
                const closed_windows = { ...prevState.closed_windows, [objId]: true };
                const minimized_windows = { ...prevState.minimized_windows, [objId]: false };
                const partial = { closed_windows, minimized_windows };
                if (prevState.focused_windows?.[objId]) {
                    partial.focused_windows = { ...prevState.focused_windows, [objId]: false };
                }
                return partial;
            }, () => {
                this.setState((prevState) => {
                    const closed_windows = { ...prevState.closed_windows, [objId]: true };
                    const favourite_apps = { ...prevState.favourite_apps };
                    if (this.initFavourite[objId] === false) {
                        favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
                    }
                    const minimized_windows = { ...prevState.minimized_windows, [objId]: false };
                    const window_context = { ...prevState.window_context };
                    delete window_context[objId];
                    const nextState = {
                        closed_windows,
                        favourite_apps,
                        minimized_windows,
                        window_context,
                    };
                    if (prevState.focused_windows?.[objId]) {
                        nextState.focused_windows = { ...prevState.focused_windows, [objId]: false };
                    }
                    return nextState;
                }, () => {
                    this.saveSession();
                    resolve();
                });
            });
        });

        this.clearAppBadge(objId, { force: true });
    }

    pinAppAtPosition = (id, targetId = null, insertAfter = false) => {
        if (!id) return;
        const app = this.getAppById(id);
        if (!app) return;
        const currentPinned = this.getPinnedAppIds();
        const alreadyPinned = currentPinned.includes(id);
        const base = alreadyPinned ? currentPinned : [...currentPinned, id];
        const nextOrder = this.insertPinnedAppId(base, id, targetId, insertAfter);
        this.setPinnedAppIds(nextOrder);
    };

    pinApp = (id) => {
        if (!id) return;
        this.pinAppAtPosition(id, null, true);
        this.hideAllContextMenu();
    }

    unpinApp = (id) => {
        if (!id) return;
        const current = this.getPinnedAppIds();
        if (!current.includes(id)) {
            this.hideAllContextMenu();
            return;
        }
        const next = current.filter((appId) => appId !== id);
        this.setPinnedAppIds(next);
        this.hideAllContextMenu();
    }

    focus = (objId) => {
        this.promoteWindowInStack(objId);
        this.setState((prev) => {
            const nextFocused = { ...prev.focused_windows };
            Object.keys(nextFocused).forEach((key) => {
                nextFocused[key] = key === objId;
            });
            if (!Object.prototype.hasOwnProperty.call(nextFocused, objId)) {
                nextFocused[objId] = true;
            }
            let overlayWindows = prev.overlayWindows;
            if (overlayWindows) {
                overlayWindows = Object.keys(overlayWindows).reduce((acc, key) => {
                    const current = overlayWindows[key];
                    acc[key] = {
                        ...current,
                        focused: key === objId,
                        minimized: key === objId ? false : current.minimized,
                    };
                    return acc;
                }, {});
            }
            this.commitWorkspacePartial({ focused_windows: nextFocused }, prev.activeWorkspace);
            return {
                focused_windows: nextFocused,
                overlayWindows,
            };
        }, () => {
            this.clearAppBadge(objId);
        });
    }

    addNewFolder = () => {
        this.setState({ showNameBar: true });
    }

    openShortcutSelector = () => {
        this.openOverlay(SHORTCUT_OVERLAY_ID);
    }

    addShortcutToDesktop = (app_id) => {
        const appIndex = apps.findIndex(app => app.id === app_id);
        if (appIndex === -1) return;
        apps[appIndex].desktop_shortcut = true;
        let shortcuts = [];
        try { shortcuts = JSON.parse(safeLocalStorage?.getItem('app_shortcuts') || '[]'); } catch (e) { shortcuts = []; }
        if (!shortcuts.includes(app_id)) {
            shortcuts.push(app_id);
            safeLocalStorage?.setItem('app_shortcuts', JSON.stringify(shortcuts));
        }
        this.closeOverlay(SHORTCUT_OVERLAY_ID);
        this.updateAppsData();
    }

    checkForAppShortcuts = () => {
        const shortcuts = safeLocalStorage?.getItem('app_shortcuts');
        if (!shortcuts) {
            safeLocalStorage?.setItem('app_shortcuts', JSON.stringify([]));
        } else {
            try {
                JSON.parse(shortcuts).forEach(id => {
                    const appIndex = apps.findIndex(app => app.id === id);
                    if (appIndex !== -1) {
                        apps[appIndex].desktop_shortcut = true;
                    }
                });
            } catch (e) {
                safeLocalStorage?.setItem('app_shortcuts', JSON.stringify([]));
            }
            this.updateAppsData();
        }
    }

    updateTrashIcon = () => {
        let trash = [];
        try { trash = JSON.parse(safeLocalStorage?.getItem('window-trash') || '[]'); } catch (e) { trash = []; }
        const appIndex = apps.findIndex(app => app.id === 'trash');
        if (appIndex !== -1) {
            const icon = trash.length
                ? '/themes/Yaru/status/user-trash-full-symbolic.svg'
                : '/themes/Yaru/status/user-trash-symbolic.svg';
            if (apps[appIndex].icon !== icon) {
                apps[appIndex].icon = icon;
                this.forceUpdate();
            }
        }
    }

    addToDesktop = (folder_name) => {
        folder_name = folder_name.trim();
        let folder_id = folder_name.replace(/\s+/g, '-').toLowerCase();
        const folderAppId = `new-folder-${folder_id}`;
        apps.push({
            id: folderAppId,
            title: folder_name,
            icon: '/themes/Yaru/system/folder.png',
            disabled: false,
            favourite: false,
            desktop_shortcut: true,
            isFolder: true,
            screen: displayDesktopFolder,
        });
        this.ensureFolderEntry(folderAppId);
        // store in local storage
        let new_folders = [];
        try { new_folders = JSON.parse(safeLocalStorage?.getItem('new_folders') || '[]'); } catch (e) { new_folders = []; }
        new_folders.push({ id: folderAppId, name: folder_name });
        safeLocalStorage?.setItem('new_folders', JSON.stringify(new_folders));

        this.setState({ showNameBar: false }, this.updateAppsData);
    };

    showAllApps = () => {
        if (this.isOverlayOpen(LAUNCHER_OVERLAY_ID)) {
            this.closeAllAppsOverlay();
        } else {
            this.openAllAppsOverlay();
        }
    };

    renderNameBar = () => {
        const handleSubmit = (event) => {
            event.preventDefault();
            const input = this.folderNameInputRef.current;
            const folder_name = input?.value ?? "";
            if (!folder_name.trim()) {
                input?.focus();
                return;
            }
            this.addToDesktop(folder_name);
        };

        const removeCard = () => {
            this.setState({ showNameBar: false });
        };

        return (
            <div className="absolute rounded-md top-1/2 left-1/2 text-center text-white font-light text-sm bg-ub-cool-grey transform -translate-y-1/2 -translate-x-1/2 sm:w-96 w-3/4 z-50">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="w-full flex flex-col justify-around items-start pl-6 pb-8 pt-6">
                        <label htmlFor="folder-name-input">New folder name</label>
                        <input
                            className="outline-none mt-5 px-1 w-10/12 context-menu-bg border-2 border-blue-700 rounded py-0.5"
                            id="folder-name-input"
                            type="text"
                            autoComplete="off"
                            spellCheck="false"
                            autoFocus={true}
                            aria-label="Folder name"
                            ref={this.folderNameInputRef}
                        />
                    </div>
                    <div className="flex">
                        <button
                            type="submit"
                            aria-label="Create folder"
                            className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 border-r-0 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={removeCard}
                            aria-label="Cancel folder creation"
                            className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    render() {
        const theme = this.state.currentTheme || this.normalizeTheme(this.props.desktopTheme);
        const accentColor = theme && theme.accent ? theme.accent : '#1793d1';
        const wallpaperSource = (theme && (theme.wallpaperUrl || theme.fallbackWallpaperUrl)) || '';
        const wallpaperCss = wallpaperSource ? `url("${wallpaperSource}")` : 'none';
        const overlayValue = theme && theme.overlay ? theme.overlay : 'none';
        const baseNavbarHeight = DESKTOP_TOP_PADDING - (WINDOW_TOP_MARGIN + WINDOW_TOP_INSET);
        const windowTopSpacing = WINDOW_TOP_MARGIN + WINDOW_TOP_INSET;
        const desktopStyle = {
            paddingTop: `calc(var(--desktop-navbar-height, ${baseNavbarHeight}px) + ${windowTopSpacing}px)`,
            minHeight: '100dvh',
            '--desktop-accent': accentColor,
            '--desktop-wallpaper': wallpaperCss,
            '--desktop-overlay': overlayValue,
        };
        const overlayWindows = this.state.overlayWindows || {};
        const launcherOverlay = overlayWindows.launcher || { open: false, minimized: false, maximized: false, transitionState: 'exited' };
        const shortcutOverlay = overlayWindows.shortcutSelector || { open: false, minimized: false, maximized: false };
        const windowSwitcherOverlay = overlayWindows.windowSwitcher || { open: false, minimized: false, maximized: false };
        const minimizedEntries = this.getMinimizedWindowEntries();
        const closedEntries = this.getClosedWindowEntries();
        const showMinimizedShelf = this.state.mounted && (this.state.minimizedShelfOpen || minimizedEntries.length > 0);
        const showClosedShelf = this.state.mounted && (this.state.closedShelfOpen || closedEntries.length > 0);
        const showMobileLauncherButton = this.state.mounted && this.state.iconSizeBucket === 'lt-640';
        return (
            <main
                id="desktop"
                role="main"
                ref={this.desktopRef}
                className={" min-h-screen h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse bg-transparent relative overflow-hidden overscroll-none window-parent"}
                style={desktopStyle}
            >

                {/* Window Area */}
                <div
                    id="window-area"
                    className="absolute h-full w-full bg-transparent"
                    data-context="desktop-area"
                >
                    {this.renderWindows()}
                </div>

                {/* Background Image */}
                <BackgroundImage theme={theme} />

                {/* Desktop Apps */}
                {this.renderDesktopApps()}

                {/* Context Menus */}
                <DesktopMenu
                    active={this.state.context_menus.desktop}
                    openApp={this.openApp}
                    addNewFolder={this.addNewFolder}
                    openShortcutSelector={this.openShortcutSelector}
                    iconSizePreset={this.state.iconSizePreset}
                    iconSizeBucket={this.state.iconSizeBucket}
                    iconSizeBucketLabel={this.getViewportBucketLabel(this.state.iconSizeBucket)}
                    setIconSizePreset={this.setIconSizePreset}
                    clearSession={() => { this.props.clearSession(); window.location.reload(); }}
                />
                <DefaultMenu active={this.state.context_menus.default} onClose={this.hideAllContextMenu} />
                <AppMenu
                    active={this.state.context_menus.app}
                    pinned={this.initFavourite[this.state.context_app]}
                    pinApp={() => this.pinApp(this.state.context_app)}
                    unpinApp={() => this.unpinApp(this.state.context_app)}
                    onClose={this.hideAllContextMenu}
                />
                <TaskbarMenu
                    active={this.state.context_menus.taskbar}
                    minimized={this.state.context_app ? this.state.minimized_windows[this.state.context_app] : false}
                    onMinimize={() => {
                        const id = this.state.context_app;
                        if (!id) return;
                        const isOverlay = this.isOverlayId(id);
                        if (this.state.minimized_windows[id]) {
                            if (isOverlay) {
                                this.openOverlay(id, { transitionState: 'entered' });
                            } else {
                                this.openApp(id);
                            }
                        } else {
                            if (isOverlay) {
                                this.minimizeOverlay(id);
                            } else {
                                this.hasMinimised(id);
                            }
                        }
                    }}
                    onClose={() => {
                        const id = this.state.context_app;
                        if (!id) return;
                        if (this.isOverlayId(id)) {
                            this.closeOverlay(id);
                        } else {
                            this.closeApp(id);
                        }
                    }}
                    onCloseMenu={this.hideAllContextMenu}
                />

                {/* Folder Input Name Bar */}
                {
                    (this.state.showNameBar
                        ? this.renderNameBar()
                        : null
                    )
                }

                {showMinimizedShelf ? (
                    <MinimizedWindowShelf
                        label="Minimized windows"
                        entries={minimizedEntries}
                        open={this.state.minimizedShelfOpen}
                        onToggle={this.toggleMinimizedShelf}
                        onActivate={this.handleMinimizedWindowActivate}
                        emptyLabel="No windows are minimized"
                    />
                ) : null}

                {showClosedShelf ? (
                    <ClosedWindowShelf
                        label="Closed windows"
                        entries={closedEntries}
                        open={this.state.closedShelfOpen}
                        onToggle={this.toggleClosedShelf}
                        onActivate={this.handleClosedWindowActivate}
                        onRemove={this.dismissClosedWindowEntry}
                        emptyLabel="No recently closed windows"
                    />
                ) : null}

                {this.renderOverlayWindows()}

                {showMobileLauncherButton ? (
                    <button
                        type="button"
                        onClick={this.showAllApps}
                        aria-label="Open app launcher"
                        className="fixed z-[620] flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-1 ring-white/20 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70 sm:hidden"
                        style={{
                            bottom: 'calc(1.25rem + var(--safe-area-bottom, 0px))',
                            right: 'calc(1rem + var(--safe-area-right, 0px))',
                        }}
                    >
                        <span className="text-2xl leading-none" aria-hidden="true">+</span>
                    </button>
                ) : null}

                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                    {this.state.liveRegionMessage}
                </div>

            </main>
        );
    }
}

export default function DesktopWithSnap(props) {
    const [snapEnabled] = useSnapSetting();
    const [snapGrid] = useSnapGridSetting();
    const { density, fontScale, largeHitAreas, desktopTheme } = useSettings();
    return (
        <Desktop
            {...props}
            snapEnabled={snapEnabled}
            snapGrid={snapGrid}
            density={density}
            fontScale={fontScale}
            largeHitAreas={largeHitAreas}
            desktopTheme={desktopTheme}
        />
    );
}
