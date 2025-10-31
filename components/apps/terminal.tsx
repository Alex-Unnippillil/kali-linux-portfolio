import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';
import { createLiveRegionLoader } from './createLiveRegionLoader';

// Lazily load the heavy terminal app with session tabs on the client only.
const TerminalApp = dynamic(() => import('../../apps/terminal/tabs'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Terminal...', {
    className: 'flex h-full w-full items-center justify-center bg-ub-cool-grey',
  }),
});

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
