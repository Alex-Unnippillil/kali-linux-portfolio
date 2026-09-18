import {
  firstAvailableVideo,
  mapConcurrent,
  mergeUniqueVideos,
  nextPlaylistCursor,
  sortPlaylistVideos,
} from "../utils/youtube-library";
import type { YouTubePlaylistVideo } from "../utils/youtube";
const video = (videoId: string, title = videoId): YouTubePlaylistVideo => ({
  videoId,
  title,
  description: "",
  thumbnail: "",
  publishedAt: "",
  position: 0,
});

test("combines playlist pages by stable video ID without mutating inputs", () => {
  const first = [video("a"), video("b")];
  const second = [video("b", "duplicate"), video("c")];
  expect(mergeUniqueVideos(first, second).map((item) => item.videoId)).toEqual([
    "a",
    "b",
    "c",
  ]);
  expect(first).toHaveLength(2);
  expect(second[0].title).toBe("duplicate");
});
test("unavailable/private/deleted entries are not playable cards", () => {
  expect(
    mergeUniqueVideos([
      video(""),
      video("a", "Private video"),
      video("b", "Deleted video"),
      video("c", "A real video"),
    ]).map((item) => item.videoId),
  ).toEqual(["c"]);
});
test("invalid and repeated pagination cursors are terminal", () => {
  expect(nextPlaylistCursor("next", "current")).toBe("next");
  expect(nextPlaylistCursor("current", "current")).toBeUndefined();
  expect(nextPlaylistCursor("")).toBeUndefined();
  expect(nextPlaylistCursor(null)).toBeUndefined();
});
test("sorting handles invalid dates and preserves the source order", () => {
  const videos = [
    video("a"),
    { ...video("b"), publishedAt: "2026-01-02", position: 1 },
  ];
  expect(
    sortPlaylistVideos(videos, "newest").map((item) => item.videoId),
  ).toEqual(["b", "a"]);
  expect(
    sortPlaylistVideos(videos, "playlist").map((item) => item.videoId),
  ).toEqual(["a", "b"]);
  expect(videos[0].videoId).toBe("a");
});
test("account fan-out is limited while results retain their original order", async () => {
  let active = 0;
  let maximum = 0;
  const values = Array.from({ length: 10 }, (_, index) => index);
  const results = await mapConcurrent(
    values,
    async (value) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, value % 3));
      active--;
      return value * 2;
    },
    3,
  );
  expect(maximum).toBeLessThanOrEqual(3);
  expect(results).toEqual(values.map((value) => value * 2));
});
test("empty account directories resolve without requests; invalid concurrency fails", async () => {
  const worker = jest.fn();
  await expect(mapConcurrent([], worker)).resolves.toEqual([]);
  expect(worker).not.toHaveBeenCalled();
  await expect(mapConcurrent([1], worker, 0)).rejects.toThrow(RangeError);
});

test("default selection waits for curator order, not the fastest network response", () => {
  const playlists = [{ id: "first" }, { id: "second" }] as Parameters<
    typeof firstAvailableVideo
  >[0];
  const second = {
    items: [video("second-video")],
    loading: false,
    loaded: true,
  };
  expect(firstAvailableVideo(playlists, { second })).toBeUndefined();
  expect(
    firstAvailableVideo(playlists, {
      first: { items: [video("first-video")], loading: false, loaded: true },
      second,
    })?.videoId,
  ).toBe("first-video");
  expect(
    firstAvailableVideo(playlists, {
      first: { items: [], loading: false, error: "unavailable" },
      second,
    })?.videoId,
  ).toBe("second-video");
});
test("malformed optional metadata does not crash video cards or descriptions", () => {
  const malformed = {
    ...video("valid-video"),
    description: null,
    thumbnail: null,
    title: "Valid video",
  } as unknown as YouTubePlaylistVideo;
  expect(mergeUniqueVideos([malformed])[0]).toMatchObject({
    description: "",
    thumbnail: "",
  });
});

describe("remote directory validation", () => {
  const { normalizePlaylistDirectory } = require("../utils/youtube-library");
  test("normalizes optional fields and ignores invalid, duplicate and non-public entries", () => {
    const result = normalizePlaylistDirectory({
      playlists: [
        null,
        { id: "a", title: "First" },
        { id: "a", title: "Duplicate" },
        { id: "hidden", title: "Private", privacyStatus: "private" },
        { id: "bad", title: {} },
      ],
      sections: { invalid: true },
    });
    expect(result.playlists).toEqual([
      {
        id: "a",
        title: "First",
        description: "",
        thumbnail: "",
        publishedAt: "",
        itemCount: 0,
        privacyStatus: "public",
      },
    ]);
    expect(result.sections).toEqual([]);
  });
  test("category entries can only reference validated public playlists", () => {
    const result = normalizePlaylistDirectory({
      playlists: [{ id: "a", title: "First" }],
      sections: [
        null,
        {
          sectionId: "one",
          sectionTitle: {},
          playlists: [null, { id: "a" }, { id: "a" }, { id: "missing" }],
        },
        { sectionId: "one", playlists: [{ id: "a" }] },
      ],
    });
    expect(result.sections).toEqual([
      {
        sectionId: "one",
        sectionTitle: "Collections",
        playlists: result.playlists,
      },
    ]);
  });
  test("a malformed top-level response becomes a retryable error", () => {
    expect(() => normalizePlaylistDirectory(null)).toThrow(/unavailable/);
    expect(() => normalizePlaylistDirectory({ playlists: {} })).toThrow(
      /unavailable/,
    );
  });
});
