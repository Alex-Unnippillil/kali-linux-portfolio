import { act, renderHook } from "@testing-library/react";
import useLibrary from "../../../apps/spotify/utils/useLibrary";

describe("useLibrary", () => {
  it("exposes the full library without a query", () => {
    const { result } = renderHook(() => useLibrary());

    expect(result.current.counts.tracks).toBe(6);
    expect(result.current.counts.albums).toBe(3);
    expect(result.current.counts.playlists).toBe(3);
    expect(result.current.counts.all).toBe(12);
    expect(result.current.getTrack("soundhelix-song-2")?.title).toBe(
      "Dynamic Sweep",
    );
  });

  it("filters by multi-word queries across categories", () => {
    const { result } = renderHook(() => useLibrary());

    act(() => {
      result.current.setQuery("focus electronic");
    });

    const trackIds = result.current.results.tracks.map((track) => track.id);
    const albumIds = result.current.results.albums.map((album) => album.id);
    const playlistIds = result.current.results.playlists.map(
      (playlist) => playlist.id,
    );

    expect(trackIds).toEqual(["soundhelix-song-2"]);
    expect(albumIds).toEqual(["pulse-cascade"]);
    expect(playlistIds).toEqual(["focus-scan"]);
    expect(result.current.counts.tracks).toBe(1);
    expect(result.current.counts.albums).toBe(1);
    expect(result.current.counts.playlists).toBe(1);
    expect(result.current.counts.all).toBe(3);
  });

  it("narrows visible collections when the category changes", () => {
    const { result } = renderHook(() => useLibrary());

    act(() => {
      result.current.setQuery("quiet");
    });

    expect(result.current.results.tracks.map((track) => track.id)).toEqual([
      "soundhelix-song-6",
    ]);
    expect(result.current.results.albums.map((album) => album.id)).toEqual([
      "night-watch",
    ]);
    expect(result.current.results.playlists.map((playlist) => playlist.id)).toEqual(
      ["after-hours"],
    );

    act(() => {
      result.current.setCategory("albums");
    });

    expect(result.current.visible.tracks).toHaveLength(0);
    expect(result.current.visible.albums.map((album) => album.id)).toEqual([
      "night-watch",
    ]);
    expect(result.current.visible.playlists).toHaveLength(0);

    act(() => {
      result.current.setCategory("playlists");
    });

    expect(result.current.visible.tracks).toHaveLength(0);
    expect(result.current.visible.albums).toHaveLength(0);
    expect(result.current.visible.playlists.map((playlist) => playlist.id)).toEqual(
      ["after-hours"],
    );
  });
});
