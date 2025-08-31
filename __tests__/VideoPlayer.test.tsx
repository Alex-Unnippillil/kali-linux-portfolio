import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VideoPlayer from "../components/ui/VideoPlayer";

describe("VideoPlayer", () => {
  it("renders tracks and supports transcript search and copy", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn() },
      writable: true,
    });

    const { container } = render(
      <VideoPlayer
        src="video.mp4"
        tracks={[
          {
            src: "captions-en.vtt",
            label: "English",
            srcLang: "en",
            default: true,
          },
          { src: "captions-es.vtt", label: "Español", srcLang: "es" },
        ]}
        transcript={`hello world\nsecond line`}
      />,
    );

    const tracks = container.querySelectorAll("track");
    expect(tracks).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /show transcript/i }));
    await user.type(screen.getByPlaceholderText(/search transcript/i), "hello");
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("hello world"),
    );
  });
});
