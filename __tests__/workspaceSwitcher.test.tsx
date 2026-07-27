import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { PersistedLayoutMap } from "../utils/windowLayoutStorage";

const loadShellWindowLayouts = jest.fn<() => PersistedLayoutMap, []>();
const saveShellWindowLayouts = jest.fn<(layouts: PersistedLayoutMap) => void, [PersistedLayoutMap]>();

jest.mock("../utils/windowLayoutStorage", () => ({
  loadShellWindowLayouts: () => loadShellWindowLayouts(),
  saveShellWindowLayouts: (layouts: PersistedLayoutMap) => saveShellWindowLayouts(layouts),
}));

const WINDOW_DRAG_MIME = "application/x-shell-window-id";

const createDataTransfer = (payload: Record<string, string>): DataTransfer => {
  const store: Record<string, string> = { ...payload };
  const types = Object.keys(store);
  return {
    dropEffect: "none",
    effectAllowed: "all",
    files: [],
    items: [],
    types,
    getData: (type: string) => store[type] ?? "",
    setData: (type: string, value: string) => {
      store[type] = value;
      if (!types.includes(type)) {
        types.push(type);
      }
    },
    clearData: () => {
      types.splice(0, types.length);
      Object.keys(store).forEach((key) => delete store[key]);
    },
    setDragImage: () => {},
  } as unknown as DataTransfer;
};

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    jest.resetModules();
    loadShellWindowLayouts.mockReset();
    saveShellWindowLayouts.mockReset();
  });

  it("renders the overview and supports keyboard and drag interactions", async () => {
    loadShellWindowLayouts.mockReturnValue({});
    const { shellActions, shellStore } = await import("../hooks/useShellStore");
    const WorkspaceSwitcher = (await import("../components/base/workspace-switcher")).default;

    const { queryByRole } = render(<WorkspaceSwitcher />);

    expect(queryByRole("dialog")).toBeNull();

    act(() => {
      shellActions.registerWindow({ id: "win-1", title: "Terminal" });
      shellActions.openWorkspaceOverview();
    });

    const dialog = await screen.findByRole("dialog", { name: /workspace overview/i });
    expect(dialog).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options.length).toBe(shellStore.getState().workspaces.length);

    act(() => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });

    const focusedWorkspace = shellStore.getState().overview.focusedWorkspaceId;
    expect(focusedWorkspace).toBe(shellStore.getState().workspaces[1]?.id);

    const targetButton = options[1];
    const dataTransfer = createDataTransfer({ [WINDOW_DRAG_MIME]: "win-1" });

    act(() => {
      fireEvent.dragOver(targetButton, { dataTransfer });
    });

    act(() => {
      fireEvent.drop(targetButton, { dataTransfer });
    });

    expect(shellStore.getState().windows["win-1"].workspaceId).toBe(focusedWorkspace);
    expect(saveShellWindowLayouts).toHaveBeenCalled();
  });
});
