import React from "react";
import { act, render, screen, fireEvent, within } from "@testing-library/react";
import Dock, { DockApp } from "../components/shell/Dock";
import { windowManagerStore } from "../modules/window-manager/store";

const apps: DockApp[] = [
  {
    id: "terminal",
    title: "Terminal",
    icon: "/icons/terminal.svg",
  },
];

describe("Dock indicators", () => {
  beforeEach(() => {
    windowManagerStore.reset();
  });

  it("shows and hides running indicator based on window state", () => {
    render(<Dock apps={apps} onLaunch={() => {}} />);

    expect(screen.queryByTestId("dock-indicator-terminal")).toBeNull();

    act(() => {
      windowManagerStore.openWindow({
        id: "terminal-1",
        appId: "terminal",
        title: "Terminal 1",
      });
    });

    expect(screen.getByTestId("dock-indicator-terminal")).toBeInTheDocument();

    act(() => {
      windowManagerStore.closeWindow("terminal-1");
    });

    expect(screen.queryByTestId("dock-indicator-terminal")).toBeNull();
  });

  it("lists open windows in a hover popover", () => {
    render(<Dock apps={apps} onLaunch={() => {}} />);

    act(() => {
      windowManagerStore.openWindow({
        id: "terminal-1",
        appId: "terminal",
        title: "Shell",
      });
      windowManagerStore.openWindow({
        id: "terminal-2",
        appId: "terminal",
        title: "Logs",
      });
      windowManagerStore.focusWindow("terminal-2");
    });

    const dockButton = screen.getByRole("button", { name: "Terminal" });

    fireEvent.mouseEnter(dockButton);

    const listbox = screen.getByRole("listbox", { name: /open windows for terminal/i });
    expect(within(listbox).getByRole("option", { name: "Shell" })).toBeInTheDocument();
    expect(within(listbox).getByRole("option", { name: "Logs" })).toHaveAttribute("aria-selected", "true");

    fireEvent.mouseLeave(dockButton.parentElement!);
    expect(screen.queryByRole("listbox", { name: /open windows for terminal/i })).toBeNull();
  });
});
