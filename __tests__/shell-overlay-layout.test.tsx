import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DesktopGuide from "../components/desktop/DesktopGuide";
import WhiskerMenu from "../components/menu/WhiskerMenu";

let initialWidth: number;
let initialHeight: number;
let initialViewport: VisualViewport | null;
beforeEach(() => {
  initialWidth = window.innerWidth;
  initialHeight = window.innerHeight;
  initialViewport = window.visualViewport;
});
function viewport(width: number, height: number, coarse = false) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  jest.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches:
      query === "(any-pointer: coarse)"
        ? coarse
        : query.includes("min-width") && width >= 640,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: initialWidth,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: initialHeight,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: initialViewport,
  });
});
test.each([
  [390, 844],
  [844, 390],
])("phone help belongs in reserved taskbar space at %sx%s", (width, height) => {
  viewport(width, height, true);
  render(<DesktopGuide />);
  const guide = screen
    .getByRole("button", { name: "Desktop tips" })
    .closest("[data-guide-compact]");
  expect(guide).toHaveAttribute("data-guide-compact", "true");
  expect(guide).toHaveStyle({
    bottom: "calc(7px + env(safe-area-inset-bottom, 0px))",
  });
  // A compact question button needs no overlapping first-visit pill/dismiss control.
  expect(
    screen.queryByRole("button", { name: "Dismiss desktop hint" }),
  ).not.toBeInTheDocument();
});
test("phone help follows the same visual viewport as the taskbar", () => {
  viewport(390, 844, true);
  const visual = Object.assign(new EventTarget(), {
    height: 500,
    offsetTop: 10,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: visual,
  });
  render(<DesktopGuide />);
  const guide = screen
    .getByRole("button", { name: "Desktop tips" })
    .closest("[data-guide-compact]");
  expect(guide).toHaveStyle({
    bottom: "calc(341px + env(safe-area-inset-bottom, 0px))",
  });
  visual.height = 844;
  visual.offsetTop = 0;
  fireEvent(visual, new Event("resize"));
  expect(guide).toHaveStyle({
    bottom: "calc(7px + env(safe-area-inset-bottom, 0px))",
  });
});
test("landscape launcher height excludes the phone taskbar", () => {
  viewport(844, 390, true);
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 12,
    bottom: 44,
    left: 12,
    right: 120,
    width: 108,
    height: 32,
    x: 12,
    y: 12,
    toJSON: () => ({}),
  });
  render(<WhiskerMenu />);
  fireEvent.keyDown(window, { key: "F1", altKey: true });
  const menu = screen.getByTestId("whisker-menu-dropdown");
  expect(menu).toHaveStyle({ maxHeight: "264px" });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 360,
  });
  fireEvent(window, new Event("resize"));
  expect(menu).toHaveStyle({ maxHeight: "234px" });
});
