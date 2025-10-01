import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import VideoPlayer from "@/components/ui/VideoPlayer";

type MockTrack = {
  label: string;
  language: string;
  mode: TextTrackMode;
  kind: TextTrackKind;
};

type MockTrackList = TextTrackList & {
  tracks: MockTrack[];
};

const createMockTrackList = (
  tracks: Array<{ label: string; language: string }>
): MockTrackList => {
  const items: MockTrack[] = tracks.map((track) => ({
    label: track.label,
    language: track.language,
    mode: "disabled",
    kind: "subtitles",
  }));

  const list: Partial<MockTrackList> = {
    tracks: items,
    get length() {
      return items.length;
    },
    item: (index: number) => items[index] ?? null,
    [Symbol.iterator]: function* () {
      for (const item of items) {
        yield item;
      }
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  items.forEach((item, index) => {
    (list as Record<number, MockTrack>)[index] = item;
  });

  return list as MockTrackList;
};

const attachTracksToVideo = (
  container: HTMLElement,
  labels: Array<{ label: string; language: string }>
) => {
  const video = container.querySelector("video") as HTMLVideoElement;
  const trackList = createMockTrackList(labels);

  Object.defineProperty(video, "textTracks", {
    configurable: true,
    get: () => trackList,
  });

  return { video, trackList };
};

describe("VideoPlayer caption menu", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists the last selected caption track per video", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(
      <VideoPlayer
        src="/video.mp4"
        videoId="demo"
        tracks={[
          {
            src: "/captions/en.vtt",
            label: "English",
            srclang: "en",
          },
          {
            src: "/captions/es.vtt",
            label: "Español",
            srclang: "es",
          },
        ]}
      />
    );

    const { video, trackList } = attachTracksToVideo(container, [
      { label: "English", language: "en" },
      { label: "Español", language: "es" },
    ]);

    await act(async () => {
      video.dispatchEvent(new Event("loadedmetadata"));
    });

    await user.click(screen.getByRole("button", { name: /captions/i }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: /español/i })
    );

    expect(localStorage.getItem("video-caption-demo")).toBe("1");
    expect(trackList.tracks[0].mode).toBe("disabled");
    expect(trackList.tracks[1].mode).toBe("showing");

    unmount();

    const { container: secondContainer } = render(
      <VideoPlayer
        src="/video.mp4"
        videoId="demo"
        tracks={[
          {
            src: "/captions/en.vtt",
            label: "English",
            srclang: "en",
          },
          {
            src: "/captions/es.vtt",
            label: "Español",
            srclang: "es",
          },
        ]}
      />
    );

    const { video: secondVideo, trackList: secondTrackList } = attachTracksToVideo(
      secondContainer,
      [
        { label: "English", language: "en" },
        { label: "Español", language: "es" },
      ]
    );

    await act(async () => {
      secondVideo.dispatchEvent(new Event("loadedmetadata"));
    });

    await waitFor(() => {
      expect(secondTrackList.tracks[1].mode).toBe("showing");
    });
    expect(secondTrackList.tracks[0].mode).toBe("disabled");
  });

  it("stores the off state when captions are disabled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <VideoPlayer
        src="/video.mp4"
        videoId="demo-off"
        tracks={[
          {
            src: "/captions/en.vtt",
            label: "English",
            srclang: "en",
          },
        ]}
      />
    );

    const { video, trackList } = attachTracksToVideo(container, [
      { label: "English", language: "en" },
    ]);

    await act(async () => {
      video.dispatchEvent(new Event("loadedmetadata"));
    });

    await user.click(screen.getByRole("button", { name: /captions/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: /english/i }));
    await user.click(screen.getByRole("button", { name: /captions/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: /off/i }));

    expect(localStorage.getItem("video-caption-demo-off")).toBe("off");
    expect(trackList.tracks[0].mode).toBe("disabled");
  });
});

