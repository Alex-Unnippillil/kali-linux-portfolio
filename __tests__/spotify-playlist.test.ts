import {
  DEFAULT_PLAYLIST_TEXT,
  MAX_PLAYLISTS,
  arePlaylistsEqual,
  formatPlaylist,
  validatePlaylistText,
} from "../apps/spotify/utils/playlist";

describe("validatePlaylistText", () => {
  it("parses the default playlist JSON", () => {
    const result = validatePlaylistText(DEFAULT_PLAYLIST_TEXT);
    expect(result.error).toBeNull();
    expect(result.playlists).not.toBeNull();
    if (!result.playlists) {
      return;
    }
    expect(Object.keys(result.playlists).length).toBeGreaterThan(0);
  });

  it("rejects invalid JSON", () => {
    const result = validatePlaylistText("{ not valid json }");
    expect(result.error).toBeTruthy();
    expect(result.playlists).toBeNull();
  });

  it("requires an object map", () => {
    const result = validatePlaylistText(JSON.stringify(["one", "two"]));
    expect(result.error).toMatch(/object/i);
    expect(result.playlists).toBeNull();
  });

  it("enforces the playlist limit", () => {
    const overLimit = JSON.stringify(
      Array.from({ length: MAX_PLAYLISTS + 1 }).reduce<Record<string, string>>((acc, _, index) => {
        acc[`mood-${index}`] = "37i9dQZF1DX4WYpdgoIcn6";
        return acc;
      }, {}),
    );
    const result = validatePlaylistText(overLimit, { limit: MAX_PLAYLISTS });
    expect(result.error).toMatch(/limit/i);
    expect(result.playlists).toBeNull();
  });

  it("rejects invalid playlist ids", () => {
    const bad = JSON.stringify({ focus: "not-an-id" });
    const result = validatePlaylistText(bad);
    expect(result.error).toMatch(/valid Spotify playlist ID/i);
    expect(result.playlists).toBeNull();
  });

  it("emits warnings for duplicate ids without blocking", () => {
    const json = JSON.stringify({
      chill: "37i9dQZF1DX4WYpdgoIcn6",
      relax: "37i9dQZF1DX4WYpdgoIcn6",
    });
    const result = validatePlaylistText(json);
    expect(result.error).toBeNull();
    expect(result.playlists).not.toBeNull();
    expect(result.warnings).toHaveLength(1);
  });
});

describe("arePlaylistsEqual", () => {
  it("compares playlists ignoring order", () => {
    const a = JSON.parse(DEFAULT_PLAYLIST_TEXT);
    const b = JSON.parse(formatPlaylist(JSON.parse(DEFAULT_PLAYLIST_TEXT)));
    expect(arePlaylistsEqual(a, b)).toBe(true);
  });
});
