import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SpotifyApp from "../../../apps/spotify";

describe("Spotify media key integration", () => {
  const renderWithWindow = () => {
    const windowRoot = document.createElement("div");
    windowRoot.id = "spotify";
    windowRoot.tabIndex = 0;
    const container = document.createElement("div");
    windowRoot.appendChild(container);
    document.body.appendChild(windowRoot);
    render(<SpotifyApp />, { container });
    return { windowRoot };
  };

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("handles media track navigation when the window is focused", async () => {
    const { windowRoot } = renderWithWindow();
    const appRoot = windowRoot.querySelector('[tabindex="0"]') as HTMLElement | null;
    expect(appRoot).toBeTruthy();
    appRoot?.focus();

    await act(async () => {
      fireEvent.keyDown(window, { code: "MediaTrackNext", key: "MediaTrackNext" });
    });

    await waitFor(() =>
      expect(screen.getByText("Song 2", { selector: "p" })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Next track"),
    );

    await act(async () => {
      fireEvent.keyDown(window, { code: "MediaTrackPrevious", key: "MediaTrackPrevious" });
    });

    await waitFor(() =>
      expect(screen.getByText("Song 1", { selector: "p" })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Previous track"),
    );
  });

  it("ignores media keys when the Spotify window is not focused", async () => {
    renderWithWindow();
    const outsideButton = document.createElement("button");
    outsideButton.textContent = "outside";
    outsideButton.tabIndex = 0;
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    await act(async () => {
      fireEvent.keyDown(window, { code: "MediaTrackNext", key: "MediaTrackNext" });
    });

    expect(screen.getByText("Song 1", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    outsideButton.remove();
  });

  it("toggles playback state with the media play/pause key", async () => {
    const { windowRoot } = renderWithWindow();
    const appRoot = windowRoot.querySelector('[tabindex="0"]') as HTMLElement | null;
    expect(appRoot).toBeTruthy();
    appRoot?.focus();

    const playButton = screen.getByRole("button", { name: "Play/Pause" });
    expect(playButton).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      fireEvent.keyDown(window, { code: "MediaPlayPause", key: "MediaPlayPause" });
    });

    await waitFor(() => expect(playButton).toHaveAttribute("aria-pressed", "true"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Playing"),
    );

    await act(async () => {
      fireEvent.keyDown(window, { code: "MediaPlayPause", key: "MediaPlayPause" });
    });

    await waitFor(() => expect(playButton).toHaveAttribute("aria-pressed", "false"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Paused"));
  });
});
