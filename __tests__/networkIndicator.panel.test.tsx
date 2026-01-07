import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import NetworkIndicator from "../components/ui/NetworkIndicator";

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mock"),
}));

describe("NetworkIndicator panel layout", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const openPanel = async () => {
    render(<NetworkIndicator allowNetwork online />);
    const toggle = screen.getByRole("button", { name: /wired connection connected/i });
    fireEvent.click(toggle);
    return screen.findByRole("dialog", { name: /network settings/i });
  };

  it("opens and closes the panel while restoring focus", async () => {
    render(<NetworkIndicator allowNetwork online />);
    const toggle = screen.getByRole("button", { name: /wired connection connected/i });
    toggle.focus();

    fireEvent.click(toggle);
    expect(await screen.findByRole("dialog", { name: /network settings/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /network settings/i })).not.toBeInTheDocument();
    });
    expect(toggle).toHaveFocus();
  });

  it("allows connecting to a different network", async () => {
    await openPanel();
    const connectButton = screen.getByRole("button", { name: /connect to homelab 5g/i });
    fireEvent.click(connectButton);

    expect(screen.getByText(/Current network: HomeLab 5G/)).toBeInTheDocument();
    expect(connectButton).toHaveAttribute("aria-pressed", "true");
  });

  it("disables Wi-Fi networks when the radio is turned off", async () => {
    await openPanel();
    const wifiToggle = screen.getByLabelText(/Disable Wi-Fi/i);
    fireEvent.click(wifiToggle);

    expect(screen.getByText(/Wi-Fi is off/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect to homelab 5g/i })).toBeDisabled();
  });

  it("opens a share dialog for Wi-Fi networks", async () => {
    await openPanel();
    fireEvent.click(screen.getByLabelText(/Share HomeLab 5G/i));

    expect(await screen.findByRole("dialog", { name: /share homelab 5g/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Close share dialog/i));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /share homelab 5g/i })).not.toBeInTheDocument();
    });
  });
});
