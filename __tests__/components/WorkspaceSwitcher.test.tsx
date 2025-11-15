import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import WorkspaceSwitcher, {
  WorkspaceSummary,
} from "../../components/panel/WorkspaceSwitcher";

describe("WorkspaceSwitcher", () => {
  const workspaces: WorkspaceSummary[] = [
    { id: 1, label: "Workspace 1", openWindows: 0 },
    { id: 2, label: "Workspace 2", openWindows: 2 },
    { id: 3, label: "Workspace 3", openWindows: 1 },
  ];

  it("renders dot indicators that highlight the active workspace", () => {
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={2}
        onSelect={jest.fn()}
      />
    );

    const indicators = screen.getAllByTestId("workspace-indicator-dot");
    expect(indicators).toHaveLength(workspaces.length);
    expect(indicators[1]).toHaveClass("bg-[var(--kali-blue)]");
    expect(indicators[0]).toHaveClass("bg-white/25");
    expect(indicators[2]).toHaveClass("bg-white/25");
  });

  it("supports arrow key navigation across workspaces", () => {
    const handleSelect = jest.fn();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={1}
        onSelect={handleSelect}
      />
    );

    const buttons = screen.getAllByRole("button");

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: "ArrowRight" });
    expect(handleSelect).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(buttons[0], { key: "ArrowLeft" });
    expect(handleSelect).toHaveBeenLastCalledWith(3);

    fireEvent.keyDown(buttons[0], { key: "End" });
    expect(handleSelect).toHaveBeenLastCalledWith(3);
  });

  it("recognizes horizontal swipe gestures without blocking taps", () => {
    const handleSelect = jest.fn();
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspace={1}
        onSelect={handleSelect}
      />
    );

    const navigation = screen.getByRole("navigation", { name: /workspace switcher/i });

    fireEvent.touchStart(navigation, {
      touches: [{ clientX: 120, clientY: 0 }] as any,
    });
    fireEvent.touchMove(navigation, {
      touches: [{ clientX: 40, clientY: 4 }] as any,
    });
    fireEvent.touchEnd(navigation, {
      changedTouches: [{ clientX: 40, clientY: 4 }] as any,
    });

    expect(handleSelect).toHaveBeenLastCalledWith(2);

    const secondButton = screen.getAllByRole("button")[1];
    fireEvent.touchStart(navigation, {
      touches: [{ clientX: 80, clientY: 10 }] as any,
    });
    fireEvent.touchEnd(navigation, {
      changedTouches: [{ clientX: 75, clientY: 12 }] as any,
    });
    expect(handleSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(secondButton);

    expect(handleSelect).toHaveBeenLastCalledWith(2);
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });
});
