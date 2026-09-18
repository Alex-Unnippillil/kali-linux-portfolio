import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import XProfileApp from "../apps/x";
import useXProfile from "../hooks/useXProfile";

// Test-only saved selection, not shipped account posts.
jest.mock("../data/x-profile-snapshot.json", () => {
  const { xFeedFixture } = jest.requireActual("../tests/fixtures/x-profile");
  return {
    version: 1,
    source: "https://x.com/AUnnippillil",
    feed: {
      ...xFeedFixture,
      profile: { ...xFeedFixture.profile, avatar: undefined },
      nextCursor: undefined,
      posts: xFeedFixture.posts.map((post: { media: unknown[] }) => ({
        ...post,
        media: [],
      })),
    },
  };
});
afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
});
it("shows a saved selection synchronously without any API, login, or consent", () => {
  const request = jest
    .spyOn(global, "fetch")
    .mockRejectedValue(new Error("External services unavailable"));
  const { container } = render(<XProfileApp />);
  expect(screen.getByText(/Fixture: building an accessible/)).toBeVisible();
  expect(screen.getByText("Saved posts")).toBeVisible();
  expect(screen.getByText(/Saved selection ·/)).toBeVisible();
  expect(screen.queryByText("Enable network")).not.toBeInTheDocument();
  expect(container.querySelector("iframe")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Replies", exact: true }));
  expect(screen.getByText(/Fixture: thanks/)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
});
it("keeps saved posts available in the static edition, without a server", () => {
  process.env.NEXT_PUBLIC_STATIC_EXPORT = "true";
  const request = jest.spyOn(global, "fetch");
  render(<XProfileApp />);
  expect(screen.getByText(/Fixture: building an accessible/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Refresh posts" }),
  ).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
});
it("does not discard the archive when optional API refresh fails", async () => {
  jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network down"));
  function RefreshHarness() {
    const { feed, issue, refresh } = useXProfile();
    return (
      <>
        <button
          onClick={() => {
            void refresh();
          }}
        >
          Test optional API
        </button>
        <p>{issue}</p>
        <p>{feed?.posts[0]?.text}</p>
      </>
    );
  }
  render(<RefreshHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Test optional API" }));
  await screen.findByText("unavailable");
  expect(screen.getByText(/Fixture: building an accessible/)).toBeVisible();
});
