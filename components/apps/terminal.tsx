import dynamic from '@/utils/dynamic';
import HelpPanel from '../HelpPanel';

// Lazily load the heavy terminal app with session tabs on the client only.
const TerminalApp = dynamic(() => import('../../apps/terminal/tabs'));

/**
 * Wrapper component that ensures the terminal area can scroll when content
 * overflows. The actual indicator/scroll handling lives inside the terminal
 * app, this wrapper just provides the necessary container styles.
 */
export default function Terminal() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <HelpPanel appId="terminal" />
      <TerminalApp />
    </div>
  );
}
