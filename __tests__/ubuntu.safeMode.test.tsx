import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../components/ubuntu", () => {
  return function BrokenUbuntu() {
    throw new Error("boot failure");
  };
});

import Ubuntu from "../components/screen/ubuntu";

describe("Ubuntu safe mode", () => {
  it("displays safe mode and clears customizations", async () => {
    window.localStorage.setItem("app:theme", "dark");
    window.localStorage.setItem(
      "panel:profiles",
      JSON.stringify({ foo: "bar" }),
    );
    window.localStorage.setItem("panelLayout", "value");
    window.localStorage.setItem("pluginStates", "value");

    render(<Ubuntu />);
    expect(screen.getByText("Safe Mode")).toBeInTheDocument();

    expect(window.localStorage.getItem("app:theme")).toBe('"default"');
    expect(window.localStorage.getItem("panel:profiles")).toBe("{}");

    await userEvent.click(
      screen.getByRole("button", { name: /return to desktop/i }),
    );
  });
});
