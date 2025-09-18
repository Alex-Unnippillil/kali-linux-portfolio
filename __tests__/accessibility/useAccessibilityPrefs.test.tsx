import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import {
  AccessibilityPrefsProvider,
  useAccessibilityPrefs,
  ACCESSIBILITY_PREFS_STORAGE_KEY,
} from "../../hooks/useAccessibilityPrefs";

describe("useAccessibilityPrefs", () => {
  const Harness = () => {
    const {
      hoverLensEnabled,
      fullScreenMagnifierEnabled,
      activeFilters,
    } = useAccessibilityPrefs();
    return (
      <div>
        <span data-testid="hover">{hoverLensEnabled ? "on" : "off"}</span>
        <span data-testid="full">
          {fullScreenMagnifierEnabled ? "on" : "off"}
        </span>
        <span data-testid="filters">
          {activeFilters.length ? activeFilters.join(",") : "none"}
        </span>
      </div>
    );
  };

  const renderHarness = () =>
    render(
      <AccessibilityPrefsProvider>
        <Harness />
      </AccessibilityPrefsProvider>,
    );

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("toggles modes via keyboard shortcuts", async () => {
    renderHarness();

    fireEvent.keyDown(window, { key: "L", altKey: true, shiftKey: true });
    await waitFor(() => expect(screen.getByTestId("hover")).toHaveTextContent("on"));

    fireEvent.keyDown(window, { key: "M", altKey: true, shiftKey: true });
    await waitFor(() => expect(screen.getByTestId("full")).toHaveTextContent("on"));

    fireEvent.keyDown(window, { key: "G", altKey: true, shiftKey: true });
    await waitFor(() =>
      expect(screen.getByTestId("filters")).toHaveTextContent("grayscale"),
    );

    fireEvent.keyDown(window, { key: "G", altKey: true, shiftKey: true });
    await waitFor(() =>
      expect(screen.getByTestId("filters")).toHaveTextContent("none"),
    );
  });

  it("persists preferences to localStorage and rehydrates", async () => {
    const { unmount } = renderHarness();

    fireEvent.keyDown(window, { key: "L", altKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "M", altKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: "1", altKey: true, shiftKey: true });

    await waitFor(() =>
      expect(screen.getByTestId("filters")).toHaveTextContent("protanopia"),
    );

    const stored = window.localStorage.getItem(ACCESSIBILITY_PREFS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(stored).toContain("\"hoverLensEnabled\":true");

    unmount();

    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("hover")).toHaveTextContent("on"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("full")).toHaveTextContent("on"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("filters")).toHaveTextContent("protanopia"),
    );
  });
});
