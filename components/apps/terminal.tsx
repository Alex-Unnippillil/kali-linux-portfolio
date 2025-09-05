"use client";

import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';
import usePersistentState from '../../hooks/usePersistentState';

// Lazily load the heavy terminal app with session tabs on the client only.
const TerminalApp = dynamic(() => import('../../apps/terminal/tabs'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Terminal...
    </div>
  ),
});

/**
 * Wrapper component that ensures the terminal area can scroll when content
 * overflows. The actual indicator/scroll handling lives inside the terminal
 * app, this wrapper just provides the necessary container styles.
 */
export default function Terminal() {
  const [dismissed, setDismissed] = usePersistentState<boolean>(
    'terminal-banner-dismissed',
    false,
  );

  return (
    <div className="h-full w-full overflow-y-auto">
      {!dismissed && (
        <div
          className="bg-ub-yellow text-black p-2 text-xs flex justify-between items-center"
          role="alert"
        >
          <span>zsh (default in current Kali) – press ? for shortcuts</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="ml-2 px-2"
          >
            ×
          </button>
        </div>
      )}
      <HelpPanel appId="terminal" />
      <TerminalApp />
    </div>
  );
}
