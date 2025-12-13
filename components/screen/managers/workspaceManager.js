export class WorkspaceManager {
    constructor({ workspaceCount, overlayFlagFactory }) {
        this.workspaceCount = workspaceCount;
        this.overlayFlagFactory = overlayFlagFactory;
        this.workspaceKeys = new Set([
            'focused_windows',
            'closed_windows',
            'minimized_windows',
            'window_positions',
            'window_sizes',
        ]);
        this.workspaceSnapshots = Array.from({ length: this.workspaceCount }, () => this.createEmptyWorkspaceState());
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
    }

    createEmptyWorkspaceState = () => ({
        focused_windows: this.overlayFlagFactory(false),
        closed_windows: this.overlayFlagFactory(true),
        minimized_windows: this.overlayFlagFactory(false),
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

    commitWorkspacePartial = (partial, index, activeWorkspace) => {
        const targetIndex = typeof index === 'number' ? index : activeWorkspace;
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

    updateWorkspaceSnapshots = (baseState, activeWorkspace) => {
        const validKeys = new Set(Object.keys(baseState.closed_windows || {}));
        this.workspaceSnapshots = this.workspaceSnapshots.map((snapshot, index) => {
            const existing = snapshot || this.createEmptyWorkspaceState();
            if (index === activeWorkspace) {
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

    getWorkspaceSummaries = (workspaces) => {
        return workspaces.map((workspace) => {
            const snapshot = this.workspaceSnapshots[workspace.id] || this.createEmptyWorkspaceState();
            const openWindows = Object.values(snapshot.closed_windows || {}).filter((value) => value === false).length;
            return {
                id: workspace.id,
                label: workspace.label,
                openWindows,
            };
        });
    };

    getSnapshot = (workspaceId) => {
        return this.workspaceSnapshots[workspaceId] || this.createEmptyWorkspaceState();
    };

    resetWorkspaceStacks = () => {
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
    };

    getActiveStack = (activeWorkspace) => {
        if (!this.workspaceStacks[activeWorkspace]) {
            this.workspaceStacks[activeWorkspace] = [];
        }
        return this.workspaceStacks[activeWorkspace];
    };

    promoteWindowInStack = (id, activeWorkspace) => {
        if (!id) return;
        const stack = this.getActiveStack(activeWorkspace);
        const index = stack.indexOf(id);
        if (index !== -1) {
            stack.splice(index, 1);
        }
        stack.unshift(id);
    };
}
