import React, { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import XProfileApp from "../apps/x";
import DesktopX from "../components/apps/x";
import { makeXPost, xFeedFixture } from "../tests/fixtures/x-profile";
let mockAllowNetwork = true;
const mockSetAllowNetwork = jest.fn();
jest.mock("../hooks/useSettings", () => ({
  useSettings: () => ({
    allowNetwork: mockAllowNetwork,
    setAllowNetwork: mockSetAllowNetwork,
  }),
}));
let fetchMock: jest.SpyInstance;
const json = (data: unknown, status = 200) =>
  ({ ok: status === 200, json: async () => data }) as Response;
beforeEach(() => {
  mockAllowNetwork = true;
  mockSetAllowNetwork.mockReset();
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
  fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(json(xFeedFixture));
});
afterEach(() => jest.restoreAllMocks());

it("uses the same app for desktop and direct routes, with real read-only post cards", async () => {
  expect(DesktopX).toBe(XProfileApp);
  const { container } = render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  expect(
    screen.queryByRole("textbox", { name: "Tweet text" }),
  ).not.toBeInTheDocument();
  expect(container.querySelector("iframe, script")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Posts", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("link", { name: "Open profile on X" }),
  ).toHaveAttribute("href", "https://x.com/AUnnippillil");
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
it("filters and searches loaded content without extra requests", async () => {
  render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  fireEvent.click(screen.getByRole("button", { name: "Replies", exact: true }));
  expect(screen.getByText(/Fixture: thanks/)).toBeVisible();
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "unmatched" },
  });
  expect(screen.getByText("No matching posts")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  fireEvent.click(screen.getByRole("button", { name: "Media", exact: true }));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("expands long text, opens external originals, and copies post links", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  fireEvent.click(screen.getByRole("button", { name: "Read full post" }));
  expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  fireEvent.click(screen.getAllByRole("button", { name: "Copy post link" })[0]);
  await screen.findByText("Link copied.");
  expect(writeText).toHaveBeenCalledWith(
    "https://x.com/AUnnippillil/status/1001",
  );
  expect(
    screen.getByRole("link", { name: "Watch video on X" }),
  ).toHaveAttribute("href", "https://x.com/AUnnippillil/status/1004");
});
it("paginates once at a time, deduplicates posts, and stops repeated cursors", async () => {
  fetchMock.mockResolvedValueOnce(json(xFeedFixture)).mockResolvedValueOnce(
    json({
      ...xFeedFixture,
      posts: [
        xFeedFixture.posts[0],
        makeXPost("1005", "Older fixture post"),
        makeXPost("1005", "Duplicate fixture"),
      ],
      nextCursor: xFeedFixture.nextCursor,
    }),
  );
  render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  fireEvent.click(screen.getByRole("button", { name: "Load older posts" }));
  await screen.findByText("Older fixture post");
  expect(screen.queryByText("Duplicate fixture")).not.toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(4);
  expect(
    screen.queryByRole("button", { name: "Load older posts" }),
  ).not.toBeInTheDocument();
  expect(fetchMock.mock.calls[1][0]).toBe(
    "/api/x/profile?cursor=fixture-cursor-2",
  );
});
it("opens automatically without a consent gate or changing unrelated privacy settings", async () => {
  mockAllowNetwork = false;
  render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  expect(
    screen.queryByRole("button", { name: "Enable network" }),
  ).not.toBeInTheDocument();
  expect(mockSetAllowNetwork).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe("/api/x/profile");
});
it("does not attempt an API request in static export without an archive", async () => {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = "true";
  render(<XProfileApp />);
  await screen.findByText("The saved selection is not available yet");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("reports a missing server credential instead of inventing posts or asking visitors for keys", async () => {
  fetchMock.mockResolvedValue(json({ code: "not_configured" }, 503));
  render(<XProfileApp />);
  await screen.findByText("The saved selection is not available yet");
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.getByText("Setup for the site owner")).toBeVisible();
  expect(screen.queryByLabelText(/token|secret/i)).not.toBeInTheDocument();
});
it("recovers after an API error, without exposing upstream errors", async () => {
  fetchMock
    .mockResolvedValueOnce(
      json({ code: "unavailable", detail: "must-not-render-secret" }, 503),
    )
    .mockResolvedValueOnce(json(xFeedFixture));
  render(<XProfileApp />);
  await screen.findByText("Posts are temporarily unavailable");
  expect(screen.queryByText(/must-not-render-secret/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText(/Fixture: building an accessible/);
});
it("does not auto-load flagged media or render injected HTML", async () => {
  fetchMock.mockResolvedValue(
    json({
      ...xFeedFixture,
      posts: [
        makeXPost("777", "<img src=x onerror=evil()>", {
          sensitive: true,
          media: xFeedFixture.posts[0].media,
        }),
      ],
    }),
  );
  const { container } = render(<XProfileApp />);
  await screen.findByText("<img src=x onerror=evil()>");
  expect(container.querySelector('img[src="x"]')).toBeNull();
  expect(
    screen.queryByRole("link", { name: "View photo on X" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show media" }));
  expect(screen.getByRole("link", { name: "View photo on X" })).toBeVisible();
});
it("rejects late responses after closing and reopening and works under StrictMode", async () => {
  let resolveOld: (response: Response) => void = () => {};
  fetchMock
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValue(json(xFeedFixture));
  render(
    <StrictMode>
      <XProfileApp />
    </StrictMode>,
  );
  await screen.findByText(/Fixture: building an accessible/);
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => resolveOld(json({ code: "not_configured" }, 503)));
  expect(
    screen.queryByText("The saved selection is not available yet"),
  ).not.toBeInTheDocument();
  expect(
    within(
      screen.getByRole("main", { name: "X profile timeline" }),
    ).getAllByRole("article"),
  ).toHaveLength(3);
});
it("aborts on unmount without committing a stale response", async () => {
  fetchMock.mockImplementation(() => new Promise(() => {}));
  const { unmount } = render(<XProfileApp />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  unmount();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});

it("keeps the last successful posts visible if a refresh fails", async () => {
  fetchMock
    .mockResolvedValueOnce(json(xFeedFixture))
    .mockResolvedValueOnce(json({ code: "rate_limited" }, 429));
  render(<XProfileApp />);
  await screen.findByText(/Fixture: building an accessible/);
  fireEvent.click(screen.getByRole("button", { name: "Refresh posts" }));
  await screen.findByText("The feed is taking a break");
  expect(screen.getAllByRole("article")).toHaveLength(3);
});
