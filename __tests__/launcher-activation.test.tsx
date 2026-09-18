import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AllApplications from "../components/screen/all-applications";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
jest.mock("../apps.config", () => ({
  APP_CATEGORIES: { media: { id: "media", title: "Media", defaultOpen: true } },
}));
const apps = [
  { id: "youtube", title: "YouTube", icon: "/youtube.svg", category: "media" },
];
beforeEach(() => localStorage.clear());
function setup() {
  const openApp = jest.fn();
  render(<AllApplications apps={apps} openApp={openApp} />);
  return {
    openApp,
    tile: screen.getByRole("button", { name: "YouTube", exact: true }),
  };
}
function pointer(node: Element, type: string, values = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.entries({
    pointerType: "touch",
    pointerId: 1,
    clientX: 20,
    clientY: 20,
    ...values,
  }).forEach(([key, value]) => Object.defineProperty(event, key, { value }));
  fireEvent(node, event);
}
test("a mouse click opens a launcher result once, without requiring a desktop double-click", () => {
  const { tile, openApp } = setup();
  fireEvent.click(tile);
  expect(openApp).toHaveBeenCalledTimes(1);
  expect(openApp).toHaveBeenCalledWith("youtube");
});
test("keyboard activation does not bubble into a second launch", () => {
  const { tile, openApp } = setup();
  fireEvent.focus(tile);
  fireEvent.keyDown(tile, { key: "Enter" });
  expect(openApp).toHaveBeenCalledTimes(1);
});
test("touch opens once and suppresses the subsequent compatibility mouse event", () => {
  const { tile, openApp } = setup();
  pointer(tile, "pointerdown");
  pointer(tile, "pointerup");
  fireEvent.click(tile);
  expect(openApp).toHaveBeenCalledTimes(1);
});
test("scrolling across a launcher result never starts the app", () => {
  const { tile, openApp } = setup();
  pointer(tile, "pointerdown");
  pointer(tile, "pointermove", { clientY: 80 });
  pointer(tile, "pointerup", { clientY: 80 });
  fireEvent.click(tile);
  expect(openApp).not.toHaveBeenCalled();
});
test("favoriting with the keyboard does not also launch the app", async () => {
  const { openApp } = setup();
  const user = userEvent.setup();
  act(() =>
    screen.getByRole("button", { name: "Add YouTube to favorites" }).focus(),
  );
  await user.keyboard("{Enter}");
  expect(openApp).not.toHaveBeenCalled();
  expect(
    screen.getAllByRole("button", { name: "Remove YouTube from favorites" })
      .length,
  ).toBeGreaterThan(0);
});
