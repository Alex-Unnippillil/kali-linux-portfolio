'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * @typedef {Object} WindowBounds
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {Object} WindowSize
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} WindowState
 * @property {string} id
 * @property {boolean} open
 * @property {boolean} minimized
 * @property {boolean} maximized
 * @property {number} zIndex
 * @property {WindowBounds | null} bounds
 * @property {WindowSize | null} savedSize
 */

const WindowManagerContext = createContext(undefined);

const getMaxZIndex = (windows) => {
    let max = 0;
    windows.forEach((state) => {
        if (typeof state?.zIndex === 'number' && state.zIndex > max) {
            max = state.zIndex;
        }
    });
    return max;
};

const findTopWindowId = (windows, excludeId) => {
    let candidateId = null;
    let candidateZ = -Infinity;
    windows.forEach((state, id) => {
        if (id === excludeId) {
            return;
        }
        if (!state || !state.open || state.minimized) {
            return;
        }
        if (typeof state.zIndex === 'number' && state.zIndex >= candidateZ) {
            candidateId = id;
            candidateZ = state.zIndex;
        }
    });
    return candidateId;
};

export const WindowManagerProvider = ({ children }) => {
    const [managerState, setManagerState] = useState(() => ({
        windows: new Map(),
        focusedWindowId: null,
    }));

    const updateState = useCallback((recipe) => {
        setManagerState((previous) => {
            const next = recipe(previous);
            if (!next) {
                return previous;
            }
            return next;
        });
    }, []);

    const open = useCallback((id, initialState = {}) => {
        updateState((previous) => {
            const existing = previous.windows.get(id);
            const nextWindows = new Map(previous.windows);
            const zIndex = getMaxZIndex(previous.windows) + 1;
            const mergedState = {
                id,
                open: true,
                minimized: false,
                maximized: false,
                bounds: existing?.bounds ?? null,
                savedSize: existing?.savedSize ?? null,
                ...existing,
                ...initialState,
                open: true,
                minimized: Boolean(initialState.minimized ?? existing?.minimized ?? false),
                maximized: Boolean(initialState.maximized ?? existing?.maximized ?? false),
                zIndex,
            };

            if (initialState.bounds) {
                mergedState.bounds = { ...initialState.bounds };
            }
            if (initialState.savedSize) {
                mergedState.savedSize = { ...initialState.savedSize };
            }

            nextWindows.set(id, mergedState);

            const focusedWindowId = mergedState.minimized
                ? previous.focusedWindowId
                : id;

            return {
                windows: nextWindows,
                focusedWindowId,
            };
        });
    }, [updateState]);

    const focus = useCallback((id) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current || !current.open) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            const zIndex = getMaxZIndex(previous.windows) + 1;
            nextWindows.set(id, {
                ...current,
                minimized: false,
                zIndex,
            });

            return {
                windows: nextWindows,
                focusedWindowId: id,
            };
        });
    }, [updateState]);

    const close = useCallback((id) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            nextWindows.set(id, {
                ...current,
                open: false,
                minimized: false,
                maximized: false,
            });
            const nextFocusedId = previous.focusedWindowId === id
                ? findTopWindowId(nextWindows, id)
                : previous.focusedWindowId;

            return {
                windows: nextWindows,
                focusedWindowId: nextFocusedId,
            };
        });
    }, [updateState]);

    const minimize = useCallback((id) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current || !current.open) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            nextWindows.set(id, {
                ...current,
                minimized: true,
            });
            const nextFocusedId = previous.focusedWindowId === id
                ? findTopWindowId(nextWindows, id)
                : previous.focusedWindowId;

            return {
                windows: nextWindows,
                focusedWindowId: nextFocusedId,
            };
        });
    }, [updateState]);

    const maximize = useCallback((id) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current || !current.open) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            const zIndex = getMaxZIndex(previous.windows) + 1;
            nextWindows.set(id, {
                ...current,
                minimized: false,
                maximized: true,
                zIndex,
            });

            return {
                windows: nextWindows,
                focusedWindowId: id,
            };
        });
    }, [updateState]);

    const restore = useCallback((id) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current || !current.open) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            const zIndex = getMaxZIndex(previous.windows) + 1;
            nextWindows.set(id, {
                ...current,
                minimized: false,
                maximized: false,
                zIndex,
            });

            return {
                windows: nextWindows,
                focusedWindowId: id,
            };
        });
    }, [updateState]);

    const setBounds = useCallback((id, bounds) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            nextWindows.set(id, {
                ...current,
                bounds: bounds ? { ...bounds } : null,
            });

            return {
                windows: nextWindows,
                focusedWindowId: previous.focusedWindowId,
            };
        });
    }, [updateState]);

    const saveSize = useCallback((id, size) => {
        updateState((previous) => {
            const current = previous.windows.get(id);
            if (!current) {
                return null;
            }
            const nextWindows = new Map(previous.windows);
            nextWindows.set(id, {
                ...current,
                savedSize: size ? { ...size } : null,
            });

            return {
                windows: nextWindows,
                focusedWindowId: previous.focusedWindowId,
            };
        });
    }, [updateState]);

    const contextValue = useMemo(() => ({
        windows: managerState.windows,
        focusedWindowId: managerState.focusedWindowId,
        open,
        close,
        minimize,
        maximize,
        restore,
        focus,
        setBounds,
        saveSize,
    }), [managerState.windows, managerState.focusedWindowId, open, close, minimize, maximize, restore, focus, setBounds, saveSize]);

    return (
        <WindowManagerContext.Provider value={contextValue}>
            {children}
        </WindowManagerContext.Provider>
    );
};

export const useWindowManager = () => {
    const context = useContext(WindowManagerContext);
    if (!context) {
        throw new Error('useWindowManager must be used within a WindowManagerProvider');
    }
    return context;
};

export default WindowManagerContext;
