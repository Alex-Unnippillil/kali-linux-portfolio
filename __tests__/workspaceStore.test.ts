import {
  configureWorkspaceStore,
  addWindowToWorkspace,
  moveWindowToWorkspace,
  getWorkspaceSnapshot,
  setActiveWorkspace,
  focusWorkspaceWindow,
  removeWindowFromWorkspace,
  resetWorkspaceStore,
} from "../hooks/useWorkspaceStore";

describe("workspace store", () => {
  beforeEach(() => {
    configureWorkspaceStore([
      { id: 0, label: "Workspace 1" },
      { id: 1, label: "Workspace 2" },
      { id: 2, label: "Workspace 3" },
    ]);
  });

  afterEach(() => {
    resetWorkspaceStore();
  });

  it("tracks windows per workspace", () => {
    addWindowToWorkspace("terminal");
    let snapshot = getWorkspaceSnapshot();
    expect(snapshot.activeWorkspaceId).toBe(0);
    expect(snapshot.workspaces[0].windows).toContain("terminal");
    expect(snapshot.workspaces[0].focusedWindowId).toBe("terminal");

    addWindowToWorkspace("notes", 1);
    snapshot = getWorkspaceSnapshot();
    expect(snapshot.workspaces[0].windows).toContain("terminal");
    expect(snapshot.workspaces[1].windows).toContain("notes");
    expect(snapshot.workspaces[1].focusedWindowId).toBe("notes");
  });

  it("moves a window between workspaces without changing the active workspace", () => {
    addWindowToWorkspace("terminal");
    moveWindowToWorkspace("terminal", 1);
    const snapshot = getWorkspaceSnapshot();
    expect(snapshot.activeWorkspaceId).toBe(0);
    expect(snapshot.workspaces[0].windows).not.toContain("terminal");
    expect(snapshot.workspaces[1].windows).toContain("terminal");
    expect(snapshot.workspaces[1].focusedWindowId).toBe("terminal");
  });

  it("updates previous workspace when switching", () => {
    setActiveWorkspace(1);
    const snapshot = getWorkspaceSnapshot();
    expect(snapshot.activeWorkspaceId).toBe(1);
    expect(snapshot.previousWorkspaceId).toBe(0);
  });

  it("clears a window when it is removed", () => {
    addWindowToWorkspace("terminal");
    removeWindowFromWorkspace("terminal");
    const snapshot = getWorkspaceSnapshot();
    expect(snapshot.workspaces[0].windows).toHaveLength(0);
    expect(snapshot.workspaces[0].focusedWindowId).toBeNull();
  });

  it("tracks focus updates explicitly", () => {
    addWindowToWorkspace("terminal");
    addWindowToWorkspace("notes");
    focusWorkspaceWindow("notes");
    const snapshot = getWorkspaceSnapshot();
    expect(snapshot.workspaces[0].focusedWindowId).toBe("notes");
  });
});
