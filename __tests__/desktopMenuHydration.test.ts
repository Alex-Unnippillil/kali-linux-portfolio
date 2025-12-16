import React from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

import DesktopMenu from "../components/context-menus/desktop-menu";

const noop = (): void => {};

describe("DesktopMenu hydration", () => {
  it("does not warn when iconSizeBucketLabel differs between server and client", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    const ssrHtml = renderToString(
      React.createElement(DesktopMenu, {
        active: true,
        addNewFolder: noop,
        openShortcutSelector: noop,
        openApp: noop,
        clearSession: noop,
        iconSizePreset: "medium",
        iconSizeBucket: "desktop",
        iconSizeBucketLabel: "screens 1024px and above",
        setIconSizePreset: noop,
      })
    );

    const container = document.createElement("div");
    container.innerHTML = ssrHtml;

    hydrateRoot(
      container,
      React.createElement(DesktopMenu, {
        active: true,
        addNewFolder: noop,
        openShortcutSelector: noop,
        openApp: noop,
        clearSession: noop,
        iconSizePreset: "medium",
        iconSizeBucket: "desktop",
        iconSizeBucketLabel: "screens below 1024px",
        setIconSizePreset: noop,
      })
    );

    // Let effects run.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const hydrationErrors = spy.mock.calls
      .flat()
      .filter((arg) => typeof arg === "string")
      .filter((msg) => msg.includes("Hydration failed"));

    expect(hydrationErrors).toHaveLength(0);

    spy.mockRestore();
  });
});




