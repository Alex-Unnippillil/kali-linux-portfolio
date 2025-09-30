import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ToggleSwitch from "../components/ToggleSwitch";

describe("ToggleSwitch", () => {
  it("renders provided label and caption for clarity", () => {
    render(
      <ToggleSwitch
        checked={false}
        onChange={() => {}}
        label="Sample Label"
        caption="Helpful caption"
      />
    );

    expect(screen.getByText("Sample Label")).toBeInTheDocument();
    expect(screen.getByText("Helpful caption")).toBeInTheDocument();
  });

  it("does not toggle when a vertical scroll gesture is detected", () => {
    const handleChange = jest.fn();
    render(
      <ToggleSwitch checked={false} onChange={handleChange} label="Scroll Guard" />
    );

    const switchButton = screen.getByRole("switch");

    fireEvent.pointerDown(switchButton, {
      clientX: 0,
      clientY: 0,
      pointerType: "touch",
      buttons: 1,
    });
    fireEvent.pointerMove(switchButton, {
      clientX: 0,
      clientY: 40,
      pointerType: "touch",
      buttons: 1,
    });
    fireEvent.wheel(switchButton, { deltaY: 40 });
    fireEvent.pointerUp(switchButton, {
      clientX: 0,
      clientY: 40,
      pointerType: "touch",
    });
    fireEvent.click(switchButton);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("toggles after an intentional tap interaction", () => {
    const handleChange = jest.fn();
    render(
      <ToggleSwitch checked={false} onChange={handleChange} label="Drag Toggle" />
    );

    const switchButton = screen.getByRole("switch");

    fireEvent.pointerDown(switchButton, {
      clientX: 0,
      clientY: 0,
      pointerType: "touch",
      buttons: 1,
    });
    fireEvent.pointerUp(switchButton, {
      clientX: 0,
      clientY: 0,
      pointerType: "touch",
      buttons: 0,
    });
    fireEvent.click(switchButton);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenNthCalledWith(1, true);

    fireEvent.click(switchButton);

    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(handleChange).toHaveBeenNthCalledWith(2, true);
  });
});
