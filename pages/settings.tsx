import { useState } from 'react';
import Head from 'next/head';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import { defaults, resetSettings } from '../utils/settingsStore';

const THEME_OPTIONS: Array<{
  id: string;
  name: string;
  description: string;
  accent: string;
}> = [
  {
    id: 'default',
    name: 'Kali Blue',
    description: 'Original Kali-inspired desktop with adaptive accent.',
    accent: '#1793d1',
  },
  {
    id: 'dark',
    name: 'Night Ops',
    description: 'Dim surfaces with a softer blue accent.',
    accent: '#64b5f6',
  },
  {
    id: 'neon',
    name: 'Neon Pulse',
    description: 'Vibrant glow with synthwave flair.',
    accent: '#00f6ff',
  },
  {
    id: 'matrix',
    name: 'Matrix Grid',
    description: 'Terminal green aura and cascading overlay.',
    accent: '#00ff9c',
  },
];

const WALLPAPER_OPTIONS = [
  'wall-1',
  'wall-2',
  'wall-3',
  'wall-4',
  'wall-5',
  'wall-6',
  'wall-7',
  'wall-8',
].map((name) => ({
  id: name,
  label: name.replace('wall-', 'Wallpaper '),
  src: `/wallpapers/${name}.webp`,
}));

const SettingsPage = () => {
  const {
    theme,
    setTheme,
    wallpaper,
    setWallpaper,
    useKaliWallpaper,
    setUseKaliWallpaper,
    accent,
    setAccent,
  } = useSettings();
  const [isResetting, setIsResetting] = useState(false);

  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  const handleWallpaperSelect = (value: string) => {
    setUseKaliWallpaper(false);
    setWallpaper(value);
  };

  const handleReset = async () => {
    setIsResetting(true);
    await resetSettings();
    const applyDefaults = () => {
      setTheme(defaults.theme);
      setAccent(defaults.accent);
      setWallpaper(defaults.wallpaper);
      setUseKaliWallpaper(defaults.useKaliWallpaper);
    };

    if (typeof window !== 'undefined') {
      const start = window.performance.now();
      window.requestAnimationFrame(() => {
        applyDefaults();
        const elapsed = window.performance.now() - start;
        window.setTimeout(() => setIsResetting(false), Math.max(0, 50 - elapsed));
      });
    } else {
      applyDefaults();
      setIsResetting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Desktop settings • Kali Linux Portfolio</title>
        <meta
          name="description"
          content="Choose wallpapers, switch desktop themes, and reset your Kali-inspired workspace."
        />
      </Head>
      <main className="min-h-screen bg-[color:var(--color-bg)] pb-24 pt-16 text-[color:var(--kali-text)]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6">
          <header className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--kali-text-muted)]">Personalise</p>
            <h1 className="text-3xl font-semibold tracking-tight">Desktop appearance</h1>
            <p className="max-w-2xl text-sm text-[color:var(--kali-text-subtle)]">
              Pick a theme preset, explore wallpapers, or roll back to the default Kali look.
              All changes are stored locally so the desktop remembers your choices.
            </p>
          </header>

          <section aria-labelledby="theme-heading" className="space-y-6 rounded-2xl border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-surface)] p-8 shadow-kali-panel backdrop-blur">
            <div className="flex flex-col gap-2">
              <h2 id="theme-heading" className="text-xl font-semibold">Desktop theme</h2>
              <p className="text-sm text-[color:var(--kali-text-subtle)]">
                Themes bundle accent colours, overlays, and wallpaper suggestions.
                You can still fine-tune the wallpaper afterwards.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {THEME_OPTIONS.map((option) => {
                const isActive = theme === option.id;
                return (
                  <label
                    key={option.id}
                    className={`relative flex cursor-pointer flex-col gap-3 rounded-xl border px-5 py-4 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--kali-blue)] ${
                      isActive
                        ? 'border-transparent bg-[color:var(--desktop-accent-soft)]/30 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_35px_-24px_rgba(23,147,209,0.75)]'
                        : 'border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-muted)] hover:border-[color:var(--desktop-accent-soft)]'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-4">
                      <span className="text-lg font-medium">{option.name}</span>
                      <span
                        aria-hidden
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-xs uppercase tracking-wide text-white/80"
                        style={{ backgroundColor: option.accent }}
                      >
                        {option.accent.replace('#', '')}
                      </span>
                    </span>
                    <span className="text-sm text-[color:var(--kali-text-subtle)]">{option.description}</span>
                    <input
                      type="radio"
                      name="desktop-theme"
                      value={option.id}
                      checked={isActive}
                      onChange={() => handleThemeChange(option.id)}
                      className="sr-only"
                      aria-label={`Use the ${option.name} theme`}
                    />
                    {isActive ? (
                      <span className="absolute right-5 top-4 text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--desktop-accent)]">
                        Active
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="wallpaper-heading" className="space-y-6 rounded-2xl border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-surface)] p-8 shadow-kali-panel backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 id="wallpaper-heading" className="text-xl font-semibold">Wallpaper</h2>
                <p className="text-sm text-[color:var(--kali-text-subtle)]">
                  The gallery below updates instantly and is cached in your browser for future sessions.
                </p>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={useKaliWallpaper}
                  onChange={(event) => setUseKaliWallpaper(event.target.checked)}
                  className="h-4 w-4 rounded border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-muted)] text-[color:var(--desktop-accent)] focus:ring-[var(--desktop-accent)]"
                  aria-label="Toggle animated Kali gradient wallpaper"
                />
                Use animated Kali gradient
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WALLPAPER_OPTIONS.map((option) => {
                const isSelected = wallpaper === option.id && !useKaliWallpaper;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleWallpaperSelect(option.id)}
                    disabled={useKaliWallpaper}
                    className={`group relative flex h-32 overflow-hidden rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] ${
                      isSelected
                        ? 'border-transparent ring-2 ring-[var(--desktop-accent)]'
                        : 'border-[color:var(--desktop-surface-border)] hover:border-[color:var(--desktop-accent-soft)]'
                    } ${useKaliWallpaper ? 'opacity-40 saturate-50' : 'opacity-100'}`}
                    aria-pressed={isSelected}
                    aria-label={`Set ${option.label}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${option.src})` }}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-xs uppercase tracking-[0.2em] text-white/80">
                      {option.label}
                      {isSelected ? <span className="text-[color:var(--desktop-accent)]">Selected</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {useKaliWallpaper ? (
              <p className="text-xs text-[color:var(--kali-text-subtle)]">
                The gradient plays behind the desktop wallpaper layer. Turn it off to pick a static background.
              </p>
            ) : null}
          </section>

          <section className="space-y-6 rounded-2xl border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-surface)] p-8 shadow-kali-panel backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Accent preview</h2>
                <p className="text-sm text-[color:var(--kali-text-subtle)]">
                  This palette updates system highlights. Select a chip to override the preset accent.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {ACCENT_OPTIONS.map((value) => {
                  const active = accent === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccent(value)}
                      className={`h-9 w-9 rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] ${
                        active ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]' : 'border-transparent hover:border-white/60'
                      }`}
                      style={{ backgroundColor: value }}
                      aria-label={`Use accent colour ${value}`}
                      aria-pressed={active}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[color:var(--kali-text-subtle)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-muted)] px-4 py-2 text-[color:var(--desktop-navbar-text)]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                Current accent {accent}
              </span>
            </div>
          </section>

          <div className="flex flex-col items-start gap-4 rounded-2xl border border-[color:var(--desktop-surface-border)] bg-[color:var(--desktop-card-muted)] p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium">Restore defaults</h2>
              <p className="text-sm text-[color:var(--kali-text-subtle)]">
                Revert wallpaper, theme, and accent back to the original Kali desktop. Your changes are applied on the next frame to avoid layout jitter.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] ${
                isResetting
                  ? 'cursor-wait bg-[color:var(--desktop-accent-soft)] text-white/70'
                  : 'bg-[color:var(--desktop-accent)] text-black hover:bg-[color:var(--desktop-accent-strong)] hover:text-white'
              }`}
            >
              {isResetting ? 'Resetting…' : 'Reset to default'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
};

export default SettingsPage;
