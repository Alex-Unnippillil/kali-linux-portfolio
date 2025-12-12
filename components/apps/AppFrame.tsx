import Image from 'next/image';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

export type KeyboardShortcut = {
  keys: string;
  description: string;
};

export type AppFrameProps = {
  title: string;
  icon?: string;
  description?: string;
  helpTitle?: string;
  helpContent?: ReactNode;
  shortcuts?: KeyboardShortcut[];
  children: ReactNode;
};

const basePanelClasses =
  'border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-text)] shadow-sm';

const defaultHelp = (
  <>
    <p className="text-sm text-slate-200">
      Each app is a contained demo that runs entirely in your browser. Nothing leaves your
      device unless you explicitly connect a service in settings.
    </p>
    <p className="text-xs text-slate-400">
      Tip: enable reduced motion in your OS to tone down visual effects.
    </p>
  </>
);

export default function AppFrame({
  title,
  icon,
  description,
  helpTitle = 'About this demo',
  helpContent = defaultHelp,
  shortcuts = [],
  children,
}: AppFrameProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  const mergedShortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      { keys: 'Shift + /', description: 'Toggle help panel' },
      ...shortcuts,
    ],
    [shortcuts],
  );

  useEffect(() => {
    const toggleHelp = (event: KeyboardEvent) => {
      if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setHelpOpen((prev) => !prev);
      }
      if (event.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
      }
    };

    window.addEventListener('keydown', toggleHelp);
    return () => window.removeEventListener('keydown', toggleHelp);
  }, [helpOpen]);

  return (
    <section
      className="flex h-full min-h-[420px] flex-col gap-4 rounded-2xl bg-[color:var(--kali-overlay)] p-4"
      aria-label={`${title} container`}
    >
      <header className={`${basePanelClasses} flex items-start gap-3 rounded-xl p-4`}
        role="banner"
      >
        {icon ? (
          <Image
            src={icon}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[color:var(--kali-overlay)] object-contain p-1"
            priority
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--kali-border)_65%,transparent)] bg-[color:var(--kali-overlay)] text-lg font-semibold">
            {title.slice(0, 1)}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold leading-6 text-[color:var(--kali-text)]">{title}</h1>
            <span className="rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
              Offline demo
            </span>
          </div>
          {description ? (
            <p className="text-sm text-slate-300">{description}</p>
          ) : (
            <p className="text-sm text-slate-400">
              Runs inside the desktop shell with consistent padding, focus, and keyboard hints.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2" aria-label="App actions">
          <kbd className="hidden rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] px-2 py-1 text-[11px] text-slate-200 sm:inline">
            Shift + /
          </kbd>
          <button
            type="button"
            className="rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-sm font-medium text-[color:var(--kali-text)] transition hover:-translate-y-[1px] hover:border-[color:color-mix(in_srgb,var(--color-accent)_45%,transparent)] hover:text-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-overlay)]"
            onClick={() => setHelpOpen((prev) => !prev)}
            aria-expanded={helpOpen}
            aria-controls={helpId}
          >
            {helpOpen ? 'Hide help' : 'Open help'}
          </button>
        </div>
      </header>

      {helpOpen && (
        <section
          id={helpId}
          className={`${basePanelClasses} rounded-xl p-4 text-sm leading-relaxed`}
          aria-label="Help panel"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
            <div className="md:w-2/3">
              <h2 className="text-base font-semibold text-[color:var(--kali-text)]">{helpTitle}</h2>
              <div className="mt-2 space-y-2 text-slate-200">{helpContent}</div>
            </div>
            <div className="md:w-1/3">
              <div className="rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-overlay)] p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Keyboard hints</h3>
                <ul className="mt-2 space-y-2 text-[13px] text-slate-200">
                  {mergedShortcuts.map((shortcut) => (
                    <li key={shortcut.keys} className="flex items-start gap-2">
                      <span className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                        {shortcut.keys}
                      </span>
                      <span className="leading-snug text-slate-300">{shortcut.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      <div
        className={`${basePanelClasses} relative flex-1 overflow-auto rounded-xl p-3`}
        role="region"
        aria-label={`${title} content`}
      >
        {children}
      </div>
    </section>
  );
}
