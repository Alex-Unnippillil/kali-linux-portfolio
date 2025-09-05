import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import HelpPanel from '../HelpPanel';

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
 * overflows. Adds a recording overlay that logs commands and allows download
 * of the session log when stopped.
 */
export default function Terminal() {
  const [recording, setRecording] = useState(false);
  const commandsRef = useRef<string[]>([]);

  const handleCommand = (cmd: string) => {
    if (recording) commandsRef.current.push(cmd);
  };

  const downloadLog = () => {
    const blob = new Blob([commandsRef.current.join('\n')], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-log.txt';
    a.click();
    URL.revokeObjectURL(url);
    commandsRef.current = [];
  };

  const toggleRecording = () => {
    if (recording) {
      downloadLog();
      setRecording(false);
    } else {
      commandsRef.current = [];
      setRecording(true);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <HelpPanel appId="terminal" />
      <button
        type="button"
        aria-label="Toggle recording"
        onClick={toggleRecording}
        className="fixed top-2 right-12 z-40 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center focus:outline-none focus:ring"
      >
        ●
      </button>
      {recording && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded">REC</div>
        </div>
      )}
      <TerminalApp onCommand={handleCommand} />
    </div>
  );
}
