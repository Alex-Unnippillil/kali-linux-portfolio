import type { PersistedLayoutMap } from "../utils/windowLayoutStorage";

const loadShellWindowLayouts = jest.fn<() => PersistedLayoutMap, []>();
const saveShellWindowLayouts = jest.fn<(layouts: PersistedLayoutMap) => void, [PersistedLayoutMap]>();

jest.mock("../utils/windowLayoutStorage", () => ({
  loadShellWindowLayouts: () => loadShellWindowLayouts(),
  saveShellWindowLayouts: (layouts: PersistedLayoutMap) => saveShellWindowLayouts(layouts),
}));

describe("useShellStore", () => {
  beforeEach(() => {
    jest.resetModules();
    loadShellWindowLayouts.mockReset();
    saveShellWindowLayouts.mockReset();
  });

  it("applies persisted workspace when registering a window", async () => {
    loadShellWindowLayouts.mockReturnValue({
      "win-1": {
        workspaceId: "workspace-2",
        position: { x: 20, y: 30 },
      },
    });

    const { shellActions, shellStore } = await import("../hooks/useShellStore");

    expect(shellStore.getState().workspaces[1]?.id).toBe("workspace-2");

    shellActions.registerWindow({ id: "win-1", title: "Terminal" });

    const state = shellStore.getState();
    expect(state.windows["win-1"].workspaceId).toBe("workspace-2");
    expect(state.workspaceWindows["workspace-2"]).toContain("win-1");
    expect(saveShellWindowLayouts).toHaveBeenCalled();
    const payload = saveShellWindowLayouts.mock.calls.at(-1)?.[0];
    expect(payload?.["win-1"].workspaceId).toBe("workspace-2");
  });

  it("moves a window between workspaces and persists the layout", async () => {
    loadShellWindowLayouts.mockReturnValue({});
    const { shellActions, shellStore } = await import("../hooks/useShellStore");

    const initialWorkspaceId = shellStore.getState().activeWorkspaceId;
    const targetWorkspaceId = shellStore.getState().workspaces[1]?.id ?? initialWorkspaceId;

    shellActions.registerWindow({ id: "win-2", title: "Notes" });
    saveShellWindowLayouts.mockClear();

    shellActions.moveWindowToWorkspace("win-2", targetWorkspaceId);

    const state = shellStore.getState();
    expect(state.windows["win-2"].workspaceId).toBe(targetWorkspaceId);
    expect(state.workspaceWindows[targetWorkspaceId]).toContain("win-2");
    expect(state.workspaceWindows[initialWorkspaceId] ?? []).not.toContain("win-2");
    expect(saveShellWindowLayouts).toHaveBeenCalled();
    const payload = saveShellWindowLayouts.mock.calls.at(-1)?.[0];
    expect(payload?.["win-2"].workspaceId).toBe(targetWorkspaceId);
  });

  it("cycles focus across workspaces when the overview is open", async () => {
    loadShellWindowLayouts.mockReturnValue({});
    const { shellActions, shellStore } = await import("../hooks/useShellStore");

    shellActions.openWorkspaceOverview();
    const initialFocus = shellStore.getState().overview.focusedWorkspaceId;

    shellActions.focusNextWorkspace();
    const afterNext = shellStore.getState().overview.focusedWorkspaceId;

    expect(afterNext).not.toBeNull();
    expect(afterNext).not.toBe(initialFocus);

    shellActions.focusPreviousWorkspace();
    const afterPrevious = shellStore.getState().overview.focusedWorkspaceId;

    expect(afterPrevious).toBe(initialFocus);
  });
});
