import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';
import {
  TerminalCommandContext,
  type TerminalCommandPayload,
} from '../../apps/terminal/context';

// Lazily load the heavy terminal app with session tabs on the client only.
const TerminalApp = dynamic(() => import('../../apps/terminal/tabs'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Terminal...
    </div>
  ),
});

type TerminalWrapperProps = {
  context?: TerminalCommandPayload | null;
  command?: string;
  requestId?: number;
  openApp?: (id: string) => void;
};

/**
 * Wrapper component that ensures the terminal area can scroll when content
 * overflows. The actual indicator/scroll handling lives inside the terminal
 * app, this wrapper just provides the necessary container styles.
 */
export default function Terminal({
  context,
  command,
  requestId,
  openApp,
}: TerminalWrapperProps) {
  const payload = useMemo<TerminalCommandPayload | null>(() => {
    if (!context && command === undefined && requestId === undefined) {
      return null;
    }
    return {
      ...(context ?? {}),
      ...(command !== undefined ? { command } : {}),
      ...(requestId !== undefined ? { requestId } : {}),
    };
  }, [command, context, requestId]);

  return (
    <TerminalCommandContext.Provider value={payload}>
      <div className="h-full w-full overflow-y-auto">
        <HelpPanel appId="terminal" />
        <TerminalApp openApp={openApp} />
      </div>
    </TerminalCommandContext.Provider>
  );
}
