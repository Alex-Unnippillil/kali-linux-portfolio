import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';

export interface TerminalProps {
  addFolder?: (path: string) => void;
  openApp?: (id: string) => void;
  context?: Record<string, unknown>;
}

// Lazily load the heavy terminal app with session tabs on the client only.
const TerminalApp = dynamic(() => import('../../apps/terminal/tabs'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-drk-abrgn text-[color:var(--kali-text)]">
      <div className="rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-4 py-2 text-sm shadow-lg shadow-black/30">
        Booting terminal session...
      </div>
    </div>
  ),
});

/**
 * Wrapper component that provides a constrained layout for the terminal window.
 */
export default function Terminal({ openApp }: TerminalProps) {
  return (
    <div className="relative h-full w-full flex flex-col min-h-0 overflow-hidden">
      <HelpPanel appId="terminal" embedded />
      <TerminalApp openApp={openApp} />
    </div>
  );
}
