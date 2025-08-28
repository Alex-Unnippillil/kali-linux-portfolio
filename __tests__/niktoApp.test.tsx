import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NiktoApp from "../components/apps/nikto";

describe("NiktoApp", () => {
  it("updates command with tuning flags and shows risk info", async () => {
    const user = userEvent.setup();
    render(<NiktoApp />);
    expect(
      screen.getByText(/Nikto scans for known web vulnerabilities/i),
    ).toBeInTheDocument();
    const tuning = screen.getByLabelText(/Tuning Flags/i);
    await user.type(tuning, "5");
    expect(
      screen.getByText(/nikto -h example.com -Tuning 5/i),
    ).toBeInTheDocument();
  });
});
