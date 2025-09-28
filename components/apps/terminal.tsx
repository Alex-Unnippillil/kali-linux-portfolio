import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';

interface TerminalWrapperContext {
  path?: string;
  initialPath?: string;
  [key: string]: unknown;
}

interface TerminalWrapperProps {
  openApp?: (id: string) => void;
  context?: TerminalWrapperContext;
}

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
export default function Terminal({ openApp, context }: TerminalWrapperProps) {
  const initialPath = context?.initialPath ?? context?.path;
  return (
    <div className="h-full w-full overflow-y-auto">
      <HelpPanel appId="terminal" />
      <TerminalApp openApp={openApp} initialPath={initialPath} />
    </div>
  );
}
