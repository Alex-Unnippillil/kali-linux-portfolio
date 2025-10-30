import React, { useMemo, useState } from 'react';

type CompactApp = {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  keywords?: string;
};

type CompactAppDrawerProps = {
  open: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
  apps: CompactApp[];
  pinnedApps: CompactApp[];
  runningApps: CompactApp[];
  recentApps: CompactApp[];
};

const normalizeIcon = (icon?: string) => {
  if (typeof icon !== 'string' || icon.length === 0) {
    return '/themes/Yaru/apps/system-default-app.png';
  }
  if (icon.startsWith('./')) {
    return icon.replace('./', '/');
  }
  return icon;
};

const Section: React.FC<{ title: string; apps: CompactApp[]; onLaunch: (id: string) => void }>
  = ({ title, apps, onLaunch }) => {
    if (!apps.length) return null;
    return (
      <section aria-label={title} className="space-y-3">
        <header className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300/70">
          {title}
        </header>
        <div className="grid grid-cols-1 gap-3">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onLaunch(app.id)}
              className="flex items-center gap-4 rounded-2xl bg-slate-800/80 px-4 py-4 text-left text-base text-slate-100 shadow-lg shadow-slate-950/40 transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.99]"
            >
              <img
                src={normalizeIcon(app.icon)}
                alt=""
                className="h-12 w-12 flex-none rounded-xl border border-slate-500/40 bg-slate-900/80 object-contain p-2"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{app.title}</span>
                {app.description ? (
                  <span className="truncate text-sm text-slate-300/80">{app.description}</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  };

const CompactAppDrawer: React.FC<CompactAppDrawerProps> = ({
  open,
  onClose,
  onLaunch,
  apps,
  pinnedApps,
  runningApps,
  recentApps,
}) => {
  const [query, setQuery] = useState('');

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return apps;
    }
    return apps.filter((app) => {
      const haystack = [app.title, app.id, app.description, app.keywords]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [apps, query]);

  const handleLaunch = (id: string) => {
    onLaunch(id);
    setQuery('');
  };

  const dialogClasses = [
    'fixed inset-0 z-[700] flex flex-col bg-slate-950/95 backdrop-blur-xl transition-opacity duration-200 ease-out',
    open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
  ].join(' ');

  const bodyClasses = 'flex-1 overflow-y-auto px-4 pb-16 pt-4 sm:px-6';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App drawer"
      aria-hidden={open ? 'false' : 'true'}
      className={dialogClasses}
    >
      <div className="flex items-center justify-between px-4 pt-6 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-100">Apps</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/80 text-slate-200 shadow-lg shadow-slate-950/40 transition active:scale-95"
        >
          <span className="sr-only">Close app drawer</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="px-4 pt-4 sm:px-6">
        <label htmlFor="compact-app-search" className="sr-only">
          Search apps
        </label>
        <div className="relative">
          <input
            id="compact-app-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps"
            className="h-12 w-full rounded-full border border-slate-700/70 bg-slate-900/80 px-12 text-base text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5a6 6 0 016 6c0 1.486-.538 2.849-1.429 3.899l3.265 3.265-1.414 1.414-3.265-3.265A5.973 5.973 0 0111 17a6 6 0 110-12z" />
          </svg>
        </div>
      </div>

      <div className={bodyClasses}>
        <div className="space-y-8">
          <Section title="Running" apps={runningApps} onLaunch={handleLaunch} />
          <Section title="Pinned" apps={pinnedApps} onLaunch={handleLaunch} />
          <Section title="Recent" apps={recentApps} onLaunch={handleLaunch} />
          <Section title="All apps" apps={filteredApps} onLaunch={handleLaunch} />
        </div>
      </div>
    </div>
  );
};

export type { CompactApp };
export default CompactAppDrawer;
