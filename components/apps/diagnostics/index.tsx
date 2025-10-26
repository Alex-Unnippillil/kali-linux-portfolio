'use client';

import { useCallback, useState } from 'react';
import NetworkTest from './NetworkTest';

interface DiagnosticsToolboxProps {
  addFolder?: (...args: unknown[]) => void;
  openApp?: (...args: unknown[]) => void;
}

const DiagnosticsToolbox: React.FC<DiagnosticsToolboxProps> = () => {
  const [running, setRunning] = useState(true);
  const [resetCounter, setResetCounter] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);

  const toggleRunning = useCallback(() => {
    setRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setResetCounter((prev) => prev + 1);
    setRunning(true);
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <header className="border-b border-ubt-grey/60 bg-black/30 p-4">
        <h1 className="text-xl font-semibold">Diagnostics Toolbox</h1>
        <p className="mt-1 text-sm text-ubt-grey">
          Run synthetic network fetch bursts to observe simulated throughput and latency trends without
          hitting real infrastructure.
        </p>
        {autoPaused && (
          <p className="mt-2 text-xs text-yellow-300" role="status">
            Sampling paused automatically while this tab is hidden.
          </p>
        )}
      </header>
      <div className="flex flex-wrap items-center gap-2 border-b border-ubt-grey/60 bg-black/20 px-4 py-3 text-sm">
        <button
          type="button"
          onClick={toggleRunning}
          aria-pressed={!running}
          className="rounded bg-gray-700 px-3 py-1 font-medium transition hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded bg-red-700 px-3 py-1 font-medium transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          Reset
        </button>
        <span className="text-xs text-ubt-grey sm:text-sm">
          Endpoint: <code className="text-emerald-200">/api/network-sample</code>
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <NetworkTest
          isRunning={running}
          resetSignal={resetCounter}
          onAutoPauseChange={setAutoPaused}
        />
      </div>
    </div>
  );
};

export default DiagnosticsToolbox;

export const displayDiagnostics = (
  addFolder?: (...args: unknown[]) => void,
  openApp?: (...args: unknown[]) => void,
) => <DiagnosticsToolbox addFolder={addFolder} openApp={openApp} />;
