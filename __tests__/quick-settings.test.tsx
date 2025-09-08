import { render, fireEvent } from "@testing-library/react";
import React from "react";
import QuickSettings from "../components/panel/QuickSettings";

describe("quick settings toggles", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("toggles and persists Wi-Fi setting", () => {
    const { getByLabelText, unmount, rerender } = render(<QuickSettings />);
    const openBtn = getByLabelText("Quick settings");
    fireEvent.click(openBtn);
    const wifi = getByLabelText("Wi-Fi");
    expect(wifi).toHaveAttribute("aria-checked", "true");
    fireEvent.click(wifi);
    expect(wifi).toHaveAttribute("aria-checked", "false");
    unmount();
    const { getByLabelText: getByLabelText2 } = render(<QuickSettings />);
    const openBtn2 = getByLabelText2("Quick settings");
    fireEvent.click(openBtn2);
    const wifi2 = getByLabelText2("Wi-Fi");
    expect(wifi2).toHaveAttribute("aria-checked", "false");
  });
});

