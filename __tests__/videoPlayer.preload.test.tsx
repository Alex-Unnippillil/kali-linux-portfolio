import React from "react";
import { render, waitFor } from "@testing-library/react";
import VideoPlayer from "../components/ui/VideoPlayer";

describe("VideoPlayer network hints", () => {
  it("sets preload metadata on the video element", async () => {
    const { container } = render(
      <VideoPlayer src="/stream.mp4" poster="/poster.jpg" className="w-96" />
    );

    await waitFor(() => {
      const video = container.querySelector("video");
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute("preload", "metadata");
    });
  });

  it("injects preload hints for the stream and poster", async () => {
    const { unmount } = render(
      <VideoPlayer src="/media/clip.mp4" poster="/media/poster.jpg" />
    );

    await waitFor(() => {
      expect(
        document.head.querySelector("link[rel='preload'][as='video'][href='/media/clip.mp4']")
      ).not.toBeNull();
    });
    await waitFor(() => {
      expect(
        document.head.querySelector("link[rel='preload'][as='image'][href='/media/poster.jpg']")
      ).not.toBeNull();
    });

    unmount();

    await waitFor(() => {
      expect(
        document.head.querySelector("link[rel='preload'][as='video'][href='/media/clip.mp4']")
      ).toBeNull();
    });
  });
});
