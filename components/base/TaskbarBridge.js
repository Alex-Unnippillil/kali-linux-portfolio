"use client";

const TASKBAR_EVENT = "taskbar-command";
const WORKSPACE_EVENT = "workspace-state";

const ACTION_MAPPINGS = {
    open: {
        methods: ["open", "openWindow", "openApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    close: {
        methods: ["close", "closeWindow", "closeApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    toggle: {
        methods: ["toggle", "toggleWindow", "toggleApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    minimize: {
        methods: ["minimize", "minimizeWindow", "minimizeApp", "hasMinimised"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    maximize: {
        methods: ["maximize", "maximizeWindow", "maximizeApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    restore: {
        methods: ["restore", "restoreWindow", "restoreApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    focus: {
        methods: ["focus", "focusWindow", "focusApp"],
        buildArgs: ({ appId, payload }) => [appId, payload],
    },
    reorder: {
        methods: ["reorder", "reorderWindows", "setTaskbarOrder"],
        buildArgs: ({ order }) => [Array.isArray(order) ? [...order] : []],
    },
};

const PROPERTY_MAPPINGS = {
    workspaces: ["workspaces", "workspaceSummaries"],
    activeWorkspace: ["activeWorkspace", "currentWorkspace", "activeWorkspaceId"],
    runningApps: ["runningApps", "openWindows", "windows"],
    focusedWindow: ["focusedWindow", "focusedWindowId"],
    stacks: ["stacks", "workspaceStacks", "windowStacks"],
    savedSizes: ["savedSizes", "windowSizes", "savedWindowSizes"],
    iconSizePreset: ["iconSizePreset"],
    windowPositions: ["windowPositions", "savedPositions"],
    minimizedWindows: ["minimizedWindows"],
    focusedWindows: ["focusedWindows"],
};

const SNAPSHOT_METHODS = ["getSnapshot", "getStateSnapshot", "snapshot"];
const WORKSPACE_METHODS = ["getWorkspaceSummaries", "getWorkspaces"];
const ACTIVE_WORKSPACE_METHODS = ["getActiveWorkspace", "getActiveWorkspaceId"];
const RUNNING_APPS_METHODS = ["getRunningApps", "getOpenWindows", "getWindows"];
const FOCUSED_WINDOW_METHODS = ["getFocusedWindow", "getFocusedWindowId"];
const STACK_METHODS = ["getStacks", "getWorkspaceStacks", "getWindowStacks"];
const SAVED_SIZE_METHODS = ["getSavedSizes", "getWindowSizes", "getStoredWindowSizes"];
const ICON_PRESET_METHODS = ["getIconSizePreset"];
const WINDOW_POSITION_METHODS = ["getWindowPositions", "getSavedPositions"];
const MINIMIZED_METHODS = ["getMinimizedWindows"];
const FOCUSED_WINDOWS_METHODS = ["getFocusedWindows"];
const IS_OPEN_METHODS = ["isOpen", "isWindowOpen", "isAppOpen"];

function callManagerMethod(manager, candidates, args = []) {
    if (!manager) return undefined;
    for (const name of candidates) {
        const fn = manager?.[name];
        if (typeof fn === "function") {
            try {
                return fn.apply(manager, args);
            } catch (error) {
                reportBridgeError(error);
                return undefined;
            }
        }
    }
    return undefined;
}

function getManagerProperty(manager, candidates) {
    if (!manager) return undefined;
    for (const name of candidates) {
        if (Object.prototype.hasOwnProperty.call(manager, name)) {
            return manager[name];
        }
        const value = manager[name];
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}

function buildWorkspaceDetail(manager) {
    const snapshot = callManagerMethod(manager, SNAPSHOT_METHODS) || {};

    const workspaces = normalizeArray(
        snapshot.workspaces ?? callManagerMethod(manager, WORKSPACE_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.workspaces),
    );
    const activeWorkspace = normalizeNumber(
        snapshot.activeWorkspace ?? callManagerMethod(manager, ACTIVE_WORKSPACE_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.activeWorkspace),
    );
    const runningApps = normalizeArray(
        snapshot.runningApps ?? callManagerMethod(manager, RUNNING_APPS_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.runningApps),
    );
    const focusedWindow = normalizeId(
        snapshot.focusedWindow ?? snapshot.focusedWindowId ?? callManagerMethod(manager, FOCUSED_WINDOW_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.focusedWindow),
    );
    const stacks = normalizeRecord(
        snapshot.stacks ?? callManagerMethod(manager, STACK_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.stacks),
    );
    const savedSizes = normalizeRecord(
        snapshot.savedSizes ?? snapshot.windowSizes ?? callManagerMethod(manager, SAVED_SIZE_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.savedSizes),
    );

    const detail = {
        workspaces,
        activeWorkspace,
        runningApps,
        focusedWindow,
        stacks,
        savedSizes,
    };

    const iconPreset =
        snapshot.iconSizePreset ?? callManagerMethod(manager, ICON_PRESET_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.iconSizePreset);
    if (iconPreset !== undefined) {
        detail.iconSizePreset = iconPreset;
    }

    const windowPositions =
        snapshot.windowPositions ?? callManagerMethod(manager, WINDOW_POSITION_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.windowPositions);
    if (windowPositions && typeof windowPositions === "object") {
        detail.windowPositions = { ...windowPositions };
    }

    const minimizedWindows =
        snapshot.minimizedWindows ?? callManagerMethod(manager, MINIMIZED_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.minimizedWindows);
    if (minimizedWindows && typeof minimizedWindows === "object") {
        detail.minimizedWindows = { ...minimizedWindows };
    }

    const focusedWindows =
        snapshot.focusedWindows ?? callManagerMethod(manager, FOCUSED_WINDOWS_METHODS) ?? getManagerProperty(manager, PROPERTY_MAPPINGS.focusedWindows);
    if (focusedWindows && typeof focusedWindows === "object") {
        detail.focusedWindows = { ...focusedWindows };
    }

    return detail;
}

function normalizeArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => (entry && typeof entry === "object" ? { ...entry } : entry));
}

function normalizeNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return 0;
}

function normalizeId(value) {
    if (typeof value === "string" && value.length) return value;
    return value ?? null;
}

function normalizeRecord(value) {
    if (!value || typeof value !== "object") return {};
    return { ...value };
}

function reportBridgeError(error) {
    if (typeof console !== "undefined" && error) {
        if (process.env.NODE_ENV !== "production") {
            console.error("TaskbarBridge error", error);
        }
    }
}

function invokeAction(manager, action, detail) {
    const mapping = ACTION_MAPPINGS[action];
    if (!mapping) return undefined;

    const { methods, buildArgs } = mapping;
    const args = typeof buildArgs === "function" ? buildArgs(detail) : [];
    return callManagerMethod(manager, methods, args);
}

function handleToggle(manager, detail) {
    const explicit = invokeAction(manager, "toggle", detail);
    if (explicit !== undefined) return explicit;

    const { appId } = detail;
    if (!appId) return undefined;

    const openState = callManagerMethod(manager, IS_OPEN_METHODS, [appId, detail]);
    if (openState) {
        return invokeAction(manager, "close", detail);
    }
    return invokeAction(manager, "open", detail);
}

function executeAction(manager, action, detail) {
    if (!manager) return undefined;
    if (action === "toggle") {
        return handleToggle(manager, detail);
    }
    return invokeAction(manager, action, detail);
}

function toCommandDetail(rawDetail) {
    if (!rawDetail || typeof rawDetail !== "object") {
        return {};
    }
    const detail = { ...rawDetail };
    detail.appId = typeof detail.appId === "string" ? detail.appId : undefined;
    detail.payload = detail.payload ?? detail.context ?? undefined;
    if (!Array.isArray(detail.order) && Array.isArray(detail.payload?.order)) {
        detail.order = detail.payload.order;
    }
    return detail;
}

export default class TaskbarBridge {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.handleCommand = this.handleCommand.bind(this);
        if (typeof window !== "undefined") {
            window.addEventListener(TASKBAR_EVENT, this.handleCommand);
            this.emitWorkspaceState();
        }
    }

    dispose() {
        if (typeof window !== "undefined") {
            window.removeEventListener(TASKBAR_EVENT, this.handleCommand);
        }
    }

    handleCommand(event) {
        const detail = toCommandDetail(event?.detail);
        const actionKey = typeof detail.action === "string" ? detail.action.toLowerCase() : "toggle";
        const result = executeAction(this.windowManager, actionKey, detail);

        if (result && typeof result.then === "function") {
            result
                .then(() => {
                    this.emitWorkspaceState();
                })
                .catch((error) => {
                    reportBridgeError(error);
                    this.emitWorkspaceState();
                });
        } else {
            this.emitWorkspaceState();
        }
    }

    emitWorkspaceState() {
        if (typeof window === "undefined") return;
        const detail = buildWorkspaceDetail(this.windowManager);
        window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail }));
    }
}

export function registerTaskbarBridge(windowManager) {
    return new TaskbarBridge(windowManager);
}
