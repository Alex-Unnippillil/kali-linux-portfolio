import { SpotifyWebPlayerLayout } from "../../components/apps/spotify";

const SpotifyPage = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 lg:px-12">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--kali-text-muted)]">
            Spotify playlist
          </p>
          <h1 className="text-3xl font-semibold">Fullscreen Spotify player</h1>
          <p className="text-sm text-[color:var(--kali-text-subtle)]">
            The desktop and standalone views now load Spotify&apos;s official embedded player so playback works reliably inside
            the Kali desktop frame. You still get a quick link to pop the playlist into Spotify proper whenever you want the
            full experience.
          </p>
        </header>

        <SpotifyWebPlayerLayout
          className="min-h-[32rem]"
          description="Drag the window, resize it, or keep it floating on a secondary monitor — the official Spotify embed keeps playing inside the frame."
        />
      </div>
    </div>
  );
};

export default SpotifyPage;
