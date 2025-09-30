"use client";

import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

interface Props {
  open: boolean;
}

const tileBaseClass =
  'group relative flex min-h-[4.25rem] flex-col justify-between rounded-2xl border border-black/20 bg-black/10 p-4 text-left transition-all duration-200 ease-out hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ubt-blue/80 focus-visible:ring-offset-ub-cool-grey';

const switchTrackClass = (enabled: boolean) =>
  `inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
    enabled ? 'bg-ubt-blue/80' : 'bg-ubt-cool-grey/60'
  }`;

const switchThumbClass = (enabled: boolean) =>
  `h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
    enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
  }`;

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col justify-end transition-opacity duration-300 ${
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        aria-hidden
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="relative z-10 flex justify-center px-4 pb-6 sm:px-6">
        <section
          aria-label="Quick settings"
          aria-modal={open}
          className={`w-full max-w-xl transform-gpu transition-transform duration-300 ease-out ${
            open ? 'translate-y-0' : 'translate-y-[calc(100%+2rem)]'
          }`}
          role="dialog"
        >
          <div className="overflow-hidden rounded-3xl border border-black/20 bg-ub-cool-grey shadow-2xl">
            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
              <header className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-cool-grey">
                  Quick Settings
                </h2>
                <span className="text-xs text-ubt-cool-grey/80">Customize your workspace</span>
              </header>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <button
                  className={tileBaseClass}
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">Theme</p>
                      <p className="mt-1 text-xs text-ubt-cool-grey">Switch between light and dark</p>
                    </div>
                    <span
                      className="rounded-full bg-ubt-blue/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ubt-blue"
                    >
                      {theme === 'light' ? 'Light' : 'Dark'}
                    </span>
                  </div>
                </button>

                <button
                  aria-checked={sound}
                  aria-label="Toggle system sound"
                  className={`${tileBaseClass} focus-visible:ring-ubt-orange/80`}
                  onClick={() => setSound(!sound)}
                  role="switch"
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Sound</p>
                    <p className="mt-1 text-xs text-ubt-cool-grey">Control notifications</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm font-medium text-white">
                    <span>{sound ? 'On' : 'Muted'}</span>
                    <span className={switchTrackClass(sound)}>
                      <span className={switchThumbClass(sound)} />
                    </span>
                  </div>
                </button>

                <button
                  aria-checked={online}
                  aria-label="Toggle network status"
                  className={tileBaseClass}
                  onClick={() => setOnline(!online)}
                  role="switch"
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Network</p>
                    <p className="mt-1 text-xs text-ubt-cool-grey">Simulate online status</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm font-medium text-white">
                    <span>{online ? 'Connected' : 'Offline'}</span>
                    <span className={switchTrackClass(online)}>
                      <span className={switchThumbClass(online)} />
                    </span>
                  </div>
                </button>

                <button
                  aria-checked={reduceMotion}
                  aria-label="Toggle reduced motion"
                  className={tileBaseClass}
                  onClick={() => setReduceMotion(!reduceMotion)}
                  role="switch"
                  type="button"
                >
                  <div>
                    <p className="text-sm font-medium text-white">Reduced motion</p>
                    <p className="mt-1 text-xs text-ubt-cool-grey">Minimize animations</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm font-medium text-white">
                    <span>{reduceMotion ? 'Enabled' : 'Disabled'}</span>
                    <span className={switchTrackClass(reduceMotion)}>
                      <span className={switchThumbClass(reduceMotion)} />
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default QuickSettings;
