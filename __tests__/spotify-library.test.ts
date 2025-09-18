import {
  createLibraryIndex,
  filterLibrary,
  toQueueTracks,
  type RawSpotifyLibrary,
} from "../apps/spotify/library";

const SAMPLE_LIBRARY: RawSpotifyLibrary = {
  tracks: [
    {
      id: "track-night-drive",
      title: "Night Drive",
      artist: "Synth Fox",
      album: "City Signals",
      url: "https://example.com/night-drive.mp3",
      cover: "/themes/Yaru/apps/spotify.svg",
    },
    {
      id: "track-terminal-code",
      title: "Terminal Code",
      artist: "Synth Fox",
      album: "City Signals",
      url: "https://example.com/terminal-code.mp3",
      cover: "/themes/Yaru/apps/spotify.svg",
    },
    {
      id: "track-laser-focus",
      title: "Laser Focus",
      artist: "Circuit Dream",
      album: "Focus Tape",
      url: "https://example.com/laser-focus.mp3",
      cover: "/themes/Yaru/apps/spotify.svg",
    },
  ],
  albums: [
    {
      id: "album-city-signals",
      title: "City Signals",
      artist: "Synth Fox",
      cover: "/themes/Yaru/apps/spotify.svg",
      tracks: ["track-night-drive", "track-terminal-code"],
    },
    {
      id: "album-focus-tape",
      title: "Focus Tape",
      artist: "Circuit Dream",
      cover: "/themes/Yaru/apps/spotify.svg",
      tracks: ["track-laser-focus"],
    },
  ],
  playlists: [
    {
      id: "playlist-night-focus",
      title: "Night Focus",
      description: "Late-night synthwave coding.",
      tracks: ["track-night-drive", "track-laser-focus"],
    },
  ],
};

describe("spotify library loader", () => {
  it("resolves track references for albums and playlists", () => {
    const library = createLibraryIndex(SAMPLE_LIBRARY);
    expect(library.tracks.map((track) => track.id)).toEqual([
      "track-night-drive",
      "track-terminal-code",
      "track-laser-focus",
    ]);
    expect(library.albums[0].tracks.map((track) => track.id)).toEqual([
      "track-night-drive",
      "track-terminal-code",
    ]);
    expect(library.playlists[0].tracks.map((track) => track.id)).toEqual([
      "track-night-drive",
      "track-laser-focus",
    ]);
  });

  it("filters tracks, albums, and playlists using shared tokens", () => {
    const library = createLibraryIndex(SAMPLE_LIBRARY);
    const filtered = filterLibrary(library, "night synth");
    expect(filtered.tracks.map((track) => track.id)).toEqual([
      "track-night-drive",
    ]);
    expect(filtered.albums.map((album) => album.id)).toEqual([
      "album-city-signals",
    ]);
    expect(filtered.playlists.map((playlist) => playlist.id)).toEqual([
      "playlist-night-focus",
    ]);

    const focusFiltered = filterLibrary(library, "laser focus");
    expect(focusFiltered.tracks.map((track) => track.id)).toEqual([
      "track-laser-focus",
    ]);
    expect(focusFiltered.albums.map((album) => album.id)).toEqual([
      "album-focus-tape",
    ]);
  });

  it("strips search metadata when converting to queue tracks", () => {
    const library = createLibraryIndex(SAMPLE_LIBRARY);
    const queue = toQueueTracks(library.tracks);
    expect(queue).toHaveLength(3);
    expect(queue.every((track) => !("searchText" in track))).toBe(true);
    expect(queue[0]).toEqual(
      expect.objectContaining({
        id: "track-night-drive",
        title: "Night Drive",
        url: "https://example.com/night-drive.mp3",
      }),
    );
  });
});
