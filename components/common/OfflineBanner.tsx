import { useEffect, useState } from 'react';
import clsx from 'clsx';
import useNetworkStatus from '../../hooks/useNetworkStatus';

const wrapperBaseClasses =
  'pointer-events-none fixed inset-x-0 top-0 z-[2000] flex justify-center px-3 sm:px-4 transition-all duration-300 ease-out';

const panelBaseClasses =
  'pointer-events-auto flex w-full max-w-3xl items-start gap-3 rounded-md bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-lg ring-1 ring-slate-600/60 backdrop-blur';

const headlineClasses = 'text-sm font-semibold text-slate-100';
const bodyClasses = 'text-xs text-slate-200 sm:text-sm';
const buttonClasses =
  'ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-600/80 bg-slate-800/80 text-slate-100 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

function OfflineIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 flex-shrink-0 text-sky-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 5.5l19 13" />
      <path d="M5.2 7.3A12 12 0 0121.5 8" />
      <path d="M8.5 9.5a8 8 0 018.4.9" />
      <path d="M11.5 11.5a4 4 0 014 .9" />
      <path d="M3 15a6 6 0 018.5 0" />
      <path d="M7 19h10" />
      <path d="M12 15v4" />
    </svg>
  );
}

export default function OfflineBanner(): JSX.Element | null {
  const online = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!online) {
      setDismissed(false);
    }
  }, [online]);

  if (online || dismissed) {
    return null;
  }

  return (
    <div
      className={clsx(
        wrapperBaseClasses,
        online ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      )}
      role="status"
      aria-live="assertive"
    >
      <div className={panelBaseClasses}>
        <OfflineIcon />
        <div className="flex flex-1 flex-col gap-1">
          <p className={headlineClasses}>Offline mode enabled</p>
          <p className={bodyClasses}>
            Documentation and simulators will use cached content until connectivity returns. Some live features may be
            unavailable.
          </p>
        </div>
        <button
          type="button"
          className={buttonClasses}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline status banner"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
