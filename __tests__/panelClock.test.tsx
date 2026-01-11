import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PanelClock from "../components/panel/PanelClock";

describe("PanelClock", () => {
  it("opens calendar popover and closes on escape", () => {
    render(<PanelClock />);
    const button = screen.getByRole("button", { name: /open calendar/i });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(<PanelClock />);
    const button = screen.getByRole("button", { name: /open calendar/i });
    fireEvent.click(button);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows current month", () => {
    render(<PanelClock />);
    const button = screen.getByRole("button", { name: /open calendar/i });
    fireEvent.click(button);
    const month = new Date().toLocaleString(undefined, {
      month: "long",
    });
    expect(screen.getByText(new RegExp(month, "i"))).toBeInTheDocument();
  });
});

