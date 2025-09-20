import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MiniPlayer from "../../../apps/spotify/components/MiniPlayer";

describe("MiniPlayer persistence", () => {
  const defaultProps = {
    track: { title: "Test Song" },
    progress: 32,
    duration: 120,
    canControl: true,
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onTogglePlay: jest.fn(),
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists the floating window position after dragging", async () => {
    render(<MiniPlayer {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /detach/i }));

    const handle = await screen.findByTestId("spotify-mini-player-handle");

    fireEvent.mouseDown(handle, {
      clientX: 50,
      clientY: 60,
      button: 0,
      buttons: 1,
    });

    fireEvent.mouseMove(document.body, {
      clientX: 120,
      clientY: 160,
      buttons: 1,
    });

    fireEvent.mouseUp(document.body, {
      clientX: 120,
      clientY: 160,
      button: 0,
    });

    await waitFor(() => {
      const stored = window.localStorage.getItem("spotify-mini-player-position");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual({ x: 94, y: 124 });
    });
  });

  it("restores the persisted position when re-opened", async () => {
    window.localStorage.setItem(
      "spotify-mini-player-position",
      JSON.stringify({ x: 150, y: 180 }),
    );

    render(<MiniPlayer {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /detach/i }));

    const card = await screen.findByTestId("spotify-mini-player");

    expect(card).toHaveStyle("left: 150px");
    expect(card).toHaveStyle("top: 180px");
  });
});
