const PLAYLIST_EMBED_URL =
  'https://open.spotify.com/embed/playlist/37i9dQZF1E8NOMDYRneOXj?utm_source=generator';

const PRIMARY_NAV = [
  { label: 'Home' },
  { label: 'Search' },
  { label: 'Your Library' },
];

const SECONDARY_NAV = [
  'Create Playlist',
  'Liked Songs',
  'Synthwave Sessions',
  'Night Run FM',
  'Lo-Fi Debugger',
];

const QUEUE = [
  { title: 'Neon Heartbeat', artist: 'Vanta Pulse', duration: '3:42' },
  { title: 'Rain on Fiber', artist: 'Datastream Kids', duration: '4:05' },
  { title: 'Terminal Bloom', artist: 'Echo Sector', duration: '3:58' },
  { title: 'Skyline Overclock', artist: 'Aurora Grid', duration: '4:23' },
  { title: 'Packet Trails', artist: 'Bitwise', duration: '3:47' },
  { title: 'Circuit Avenue', artist: 'MonoGlass', duration: '4:11' },
];

export function SpotifyWebPlayerLayout({ description, className = '' }) {
  return (
    <div className={`flex flex-1 flex-col ${className}`}>
      <div className="flex flex-1 min-h-[18rem] overflow-hidden rounded-3xl border border-white/10 bg-[#121212] text-white shadow-[0_40px_80px_rgba(5,8,15,0.6)]">
        <aside className="hidden w-60 flex-col justify-between border-r border-white/5 bg-white/5 p-6 lg:flex">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Spotify</p>
              <h2 className="mt-2 text-2xl font-semibold">Kali Control Room</h2>
            </div>
            <nav aria-label="Primary" className="space-y-2 text-sm font-medium text-white/80">
              {PRIMARY_NAV.map(item => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center justify-between rounded-full border border-white/5 bg-white/5 px-4 py-2 text-left transition hover:border-[#1DB954]/50 hover:bg-[#1DB954]/10 hover:text-white"
                >
                  <span>{item.label}</span>
                  <span aria-hidden className="text-xs text-white/40">
                    ↵
                  </span>
                </button>
              ))}
            </nav>
          </div>
          <div className="space-y-3 text-xs text-white/50">
            <p className="font-semibold uppercase tracking-[0.3em] text-white/60">Playlists</p>
            <ul className="space-y-2">
              {SECONDARY_NAV.map(item => (
                <li key={item} className="truncate rounded-md px-3 py-1.5 transition hover:bg-white/5">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="relative border-b border-white/5 bg-gradient-to-br from-[#1DB954]/20 via-[#121212] to-[#050505] px-8 py-8">
            <div className="absolute right-8 top-4 hidden rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 md:block">
              Live mix
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-6">
                <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-[#1DB954]/15 ring-2 ring-[#1DB954]/40">
                  <span className="text-xl font-semibold tracking-[0.5em] text-white/80">KALI</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Playlist</p>
                  <h1 className="text-3xl font-bold">Synthwave Control Room</h1>
                  <p className="text-sm text-white/60">Hand-picked neon instrumentals for midnight debugging sessions.</p>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-5 py-2 font-semibold text-white/80 transition hover:border-[#1DB954] hover:bg-[#1DB954] hover:text-black"
                >
                  Follow
                </button>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-full border border-white/10 px-5 py-2 font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 md:flex"
                >
                  <span aria-hidden>⋯</span>
                  More
                </button>
              </div>
            </div>
          </header>

          <div className="relative flex-1 overflow-hidden bg-black/40">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
            <iframe
              src={PLAYLIST_EMBED_URL}
              title="Spotify playlist embed"
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
              style={{ border: 'none', borderRadius: 0 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </main>

        <aside className="hidden w-72 flex-col gap-6 border-l border-white/5 bg-white/5 p-6 xl:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Next in queue</p>
            <ul className="mt-4 space-y-3 text-sm">
              {QUEUE.map(track => (
                <li key={track.title} className="flex items-start justify-between gap-4 rounded-xl bg-white/5 px-3 py-2 text-white/80">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{track.title}</p>
                    <p className="text-xs text-white/50">{track.artist}</p>
                  </div>
                  <span className="text-xs text-white/40">{track.duration}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
            <p className="font-semibold uppercase tracking-[0.3em] text-white/70">Tip</p>
            <p className="mt-2 leading-relaxed">
              Drag this window anywhere on the desktop and keep the playlist running while you multitask with other tools.
            </p>
          </div>
        </aside>
      </div>

      {description ? (
        <p className="mt-5 text-xs leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function SpotifyApp() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--color-bg)] text-[color:var(--color-text)]">
      <div
        className="flex-1 min-h-0 overflow-y-auto p-5"
        data-testid="spotify-scroll-region"
      >
        <SpotifyWebPlayerLayout description="Stream a curated synthwave playlist inside a Kali-inspired Spotify shell. Resize, minimise, or pin the window alongside your other desktop apps while the embedded player keeps the beats flowing." />
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;
