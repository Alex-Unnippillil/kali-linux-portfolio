import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import QRCode from "qrcode";

import NetworkIndicator from "../components/ui/NetworkIndicator";

jest.mock("qrcode", () => {
  const toDataURL = jest.fn();
  return { __esModule: true, default: { toDataURL }, toDataURL };
});

const mockedToDataURL = QRCode.toDataURL as jest.Mock;

describe("NetworkIndicator share panel", () => {
  beforeEach(() => {
    mockedToDataURL.mockReset();
    window.localStorage.clear();
    delete (window as unknown as { nfcap?: unknown }).nfcap;
    delete (window as unknown as { kdeconnect?: unknown }).kdeconnect;
  });

  afterAll(() => {
    jest.clearAllTimers();
  });

  const openSharePanel = () => {
    render(<NetworkIndicator allowNetwork online />);
    fireEvent.click(screen.getByRole("button", { name: /wired connection connected/i }));
    fireEvent.click(screen.getByRole("button", { name: /share homelab 5g/i }));
  };

  it("records open, confirm, and QR generation actions", async () => {
    mockedToDataURL.mockResolvedValue("data:image/png;base64,qr");

    openSharePanel();
    fireEvent.click(screen.getByRole("button", { name: /reveal & generate qr/i }));

    await waitFor(() => expect(screen.getByText(/payload:/i)).toBeInTheDocument());

    const logList = screen.getByRole("listbox", { name: /share activity log/i });
    const latestEntries = within(logList).getAllByRole("option");

    expect(latestEntries[0].textContent).toMatch(/qr-generated/i);
    expect(logList.textContent).toMatch(/\[homelab\].*confirm/i);
    expect(logList.textContent).toMatch(/\[homelab\].*open/i);
  });

  it("shows NFC status updates without blocking QR readiness", async () => {
    mockedToDataURL.mockResolvedValue("data:image/png;base64,qr");
    const push = jest.fn().mockResolvedValue(undefined);
    (window as unknown as { nfcap?: { supported?: boolean; push?: typeof push } }).nfcap = {
      supported: true,
      push,
    };

    openSharePanel();
    fireEvent.click(screen.getByRole("button", { name: /reveal & generate qr/i }));

    await waitFor(() => expect(screen.getByText(/payload:/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/nfc push sent via nfcap/i)).toBeInTheDocument());

    const logList = screen.getByRole("listbox", { name: /share activity log/i });
    expect(logList.textContent).toMatch(/qr-generated/i);
    expect(logList.textContent).toMatch(/nfc-success/i);
  });

  it("handles QR generation errors and logs them", async () => {
    mockedToDataURL.mockRejectedValue(new Error("boom"));

    openSharePanel();
    fireEvent.click(screen.getByRole("button", { name: /reveal & generate qr/i }));

    await waitFor(() => expect(screen.getAllByText(/boom/i).length).toBeGreaterThan(0));

    const logList = screen.getByRole("listbox", { name: /share activity log/i });
    expect(logList.textContent).toMatch(/error/i);
  });

  it("supports keyboard navigation through activity log entries", async () => {
    mockedToDataURL.mockResolvedValue("data:image/png;base64,qr");

    openSharePanel();
    fireEvent.click(screen.getByRole("button", { name: /reveal & generate qr/i }));

    const logList = await screen.findByRole("listbox", { name: /share activity log/i });
    const options = within(logList).getAllByRole("option");

    fireEvent.focus(logList);
    await waitFor(() => expect(options[0]).toHaveFocus());

    fireEvent.keyDown(logList, { key: "ArrowDown" });
    await waitFor(() => expect(options[Math.min(1, options.length - 1)]).toHaveFocus());

    fireEvent.keyDown(logList, { key: "ArrowUp" });
    await waitFor(() => expect(options[0]).toHaveFocus());
  });
});
