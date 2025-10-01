"use client";

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDocsViewer } from './docs/DocsViewer';

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
  const { openDoc } = useDocsViewer();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isEditable) return;
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        openDoc({ appId: 'terminal', fallback: '/docs/apps/terminal.md' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openDoc]);

  const showHelp = () =>
    openDoc({ appId: 'terminal', fallback: '/docs/apps/terminal.md' });

  return (
    <div className="h-full w-full overflow-y-auto">
      <button
        type="button"
        aria-label="Open terminal help"
        aria-haspopup="dialog"
        onClick={showHelp}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      <TerminalApp />
    </div>
  );
}
