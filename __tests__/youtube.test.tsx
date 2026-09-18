import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import YouTubeApp from "../components/apps/youtube";

let mockAllowNetwork = true;
const mockSetAllowNetwork = jest.fn();
jest.mock("../hooks/useSettings", () => ({
  useSettings: () => ({
    allowNetwork: mockAllowNetwork,
    setAllowNetwork: mockSetAllowNetwork,
  }),
}));
jest.mock("../components/EmbedFrame", () => ({
  __esModule: true,
  default: ({ src, title }: { src: string; title: string }) => (
    <iframe src={src} title={title} />
  ),
}));

const playlists = [
  {
    id: "PL_LABS",
    title: "Lab Playlist",
    description: "Lab desc",
    thumbnail: "",
    itemCount: 3,
    publishedAt: "",
    privacyStatus: "public",
  },
  {
    id: "PL_TUTORIALS",
    title: "Tutorial Playlist",
    description: "Tutorial desc",
    thumbnail: "",
    itemCount: 2,
    publishedAt: "",
    privacyStatus: "public",
  },
];
const directory = {
  summary: {
    id: "UCxPIJ3hw6AOwomUWh5B7SfQ",
    title: "Alex Unnippillil",
    thumbnail: "",
  },
  directory: {
    playlists,
    sections: [
      {
        sectionId: "a",
        sectionTitle: "Alpha Tutorials",
        playlists: [playlists[1]],
      },
      { sectionId: "all", sectionTitle: "Playlists", playlists },
      {
        sectionId: "z",
        sectionTitle: "Zeta Guides",
        playlists: [playlists[0]],
      },
    ],
  },
};
const video = (videoId: string, title = videoId) => ({
  videoId,
  title,
  description: "A playlist video",
  thumbnail: "",
  publishedAt: "2026-01-01",
  position: 0,
});
const response = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status });
let fetchMock: jest.SpyInstance;
beforeEach(() => {
  mockAllowNetwork = true;
  mockSetAllowNetwork.mockClear();
  localStorage.clear();
  fetchMock = jest.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/directory")) return response(directory);
    const lab = url.searchParams.get("playlistId") === "PL_LABS";
    return response({
      items: [
        video(
          lab ? "lab-video01" : "tutorial001",
          lab ? "First Lab Video" : "First Tutorial Video",
        ),
      ],
    });
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

test("embeds the first curated video and preserves it while browsing and searching", async () => {
  render(<YouTubeApp />);
  const frame = await screen.findByTitle("YouTube player for First Lab Video");
  expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/lab-video01?playsinline=1",
  );
  expect(frame.getAttribute("src")).not.toContain("autoplay=1");
  expect(
    screen.getByRole("heading", { name: "First Lab Video" }),
  ).not.toHaveFocus();
  const categories = screen.getByRole("navigation", {
    name: "Collection categories",
  });
  expect(
    within(categories).getByRole("button", { name: "Alpha Tutorials" }),
  ).toBeInTheDocument();
  expect(
    within(categories).getByRole("button", { name: "Zeta Guides" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Open playlist Tutorial Playlist" }),
  );
  expect(screen.getByTitle("YouTube player for First Lab Video")).toBe(frame);
  fireEvent.click(
    await screen.findByRole("button", { name: "Watch First Tutorial Video" }),
  );
  const nextFrame = screen.getByTitle(
    "YouTube player for First Tutorial Video",
  );
  expect(
    screen.getByRole("heading", { name: "First Tutorial Video" }),
  ).toHaveFocus();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "no match" },
  });
  expect(screen.getByTitle("YouTube player for First Tutorial Video")).toBe(
    nextFrame,
  );
  expect(screen.getByText(/selected video stays ready/)).toBeInTheDocument();
});

test("combined feed advances each playlist cursor and removes duplicate videos", async () => {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/directory")) return response(directory);
    const lab = url.searchParams.get("playlistId") === "PL_LABS";
    const pageToken = url.searchParams.get("pageToken");
    return response(
      pageToken
        ? {
            items: [
              video("shared00001", "Shared video"),
              video(
                lab ? "lab-second1" : "tutorial002",
                lab ? "Second lab" : "Second tutorial",
              ),
            ],
          }
        : {
            items: [video("shared00001", "Shared video")],
            nextPageToken: lab ? "LAB_NEXT" : "TUTORIAL_NEXT",
          },
    );
  });
  render(<YouTubeApp />);
  await screen.findByRole("button", { name: "Watch Shared video" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Load more videos" }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Load more videos" }));
  await screen.findByRole("button", { name: "Watch Second tutorial" });
  expect(
    screen.getAllByRole("button", { name: "Watch Shared video" }),
  ).toHaveLength(1);
  const urls = fetchMock.mock.calls.map(
    ([url]) => new URL(String(url), "http://localhost"),
  );
  expect(
    urls.some(
      (url) =>
        url.searchParams.get("playlistId") === "PL_LABS" &&
        url.searchParams.get("pageToken") === "LAB_NEXT",
    ),
  ).toBe(true);
  expect(
    urls.some(
      (url) =>
        url.searchParams.get("playlistId") === "PL_TUTORIALS" &&
        url.searchParams.get("pageToken") === "TUTORIAL_NEXT",
    ),
  ).toBe(true);
  expect(
    screen.queryByRole("button", { name: "Load more videos" }),
  ).not.toBeInTheDocument();
});

test("empty playlists do not refetch indefinitely", async () => {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
    String(input).includes("/directory")
      ? response(directory)
      : response({ items: [] }),
  );
  render(<YouTubeApp />);
  await screen.findByRole("heading", { name: "No videos to show yet" });
  await act(async () => {
    await Promise.resolve();
  });
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/playlist-items"),
    ),
  ).toHaveLength(2);
});

test("failed playlists stop and retry only on explicit request", async () => {
  fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
    String(input).includes("/directory")
      ? response(directory)
      : response({ error: "Temporary failure" }, 503),
  );
  render(<YouTubeApp />);
  const retry = await screen.findByRole("button", {
    name: "Retry failed playlists",
  });
  await waitFor(() => expect(retry).toBeEnabled());
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/playlist-items"),
    ),
  ).toHaveLength(2);
  fireEvent.click(retry);
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/playlist-items"),
      ),
    ).toHaveLength(4),
  );
});

test("network-off is respected until the visitor enables it", async () => {
  mockAllowNetwork = false;
  const { rerender } = render(<YouTubeApp />);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Enable network" }));
  expect(mockSetAllowNetwork).toHaveBeenCalledWith(true);
  mockAllowNetwork = true;
  rerender(<YouTubeApp />);
  await screen.findByRole("button", { name: "Watch First Lab Video" });
});

test("Watch later survives reopening and is explicitly browser-local", async () => {
  const { unmount } = render(<YouTubeApp />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Save First Lab Video for later",
    }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("youtube:watch-later") ?? "[]"),
    ).toHaveLength(1),
  );
  unmount();
  render(<YouTubeApp />);
  fireEvent.click(screen.getByRole("button", { name: /^Watch later/ }));
  await screen.findByRole("button", { name: "Watch First Lab Video" });
  expect(
    screen.getByText("Saved on this browser, not your YouTube account."),
  ).toBeInTheDocument();
});

test("slash focuses app search without taking typing from an editable control", async () => {
  render(<YouTubeApp />);
  await screen.findByRole("button", { name: "Watch First Lab Video" });
  const root = screen.getByTestId("youtube-app");
  fireEvent.keyDown(root, { key: "/" });
  expect(screen.getByRole("searchbox")).toHaveFocus();
  const event = new KeyboardEvent("keydown", {
    key: "/",
    bubbles: true,
    cancelable: true,
  });
  screen.getByRole("searchbox").dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
});

test("disabling network removes an already selected player", async () => {
  const { rerender } = render(<YouTubeApp />);
  await screen.findByTitle("YouTube player for First Lab Video");
  mockAllowNetwork = false;
  rerender(<YouTubeApp />);
  expect(screen.queryByTitle(/YouTube player/)).not.toBeInTheDocument();
});
