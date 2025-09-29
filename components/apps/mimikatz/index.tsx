'use client';

import React, { useEffect, useMemo, useState } from 'react';
import WarningBanner from '../../WarningBanner';
import {
  commandPresets,
  CommandContext,
  safeDefaultPreset,
} from '../../../apps/mimikatz/commandPresets';
import {
  detectDisplayMode,
  DisplayMode,
  isBrowserDisplayMode,
} from '../../../apps/mimikatz/detectDisplayMode';

const sensitiveRegex =
  /(Token|NTLM hash|Kerberos Ticket|Ticket cache):\s*(\S+)/i;

const contextConfig: Record<
  CommandContext,
  { label: string; badge: string }
> = {
  safe: { label: 'Lab-safe', badge: 'bg-green-600 text-white' },
  'requires-elevation': {
    label: 'Needs elevation',
    badge: 'bg-amber-500 text-black',
  },
  'unsafe-live': { label: 'Unsafe live', badge: 'bg-red-700 text-white' },
};

const maskSensitive = (
  line: string,
  show: boolean,
): React.ReactNode => {
  const match = line.match(sensitiveRegex);
  if (!match) return line;
  const [, label, value] = match;
  return (
    <>
      {label}:{' '}
      <span className="p-[6px]">{show ? value : '********'}</span>
    </>
  );
};

const initialPreset = safeDefaultPreset ?? commandPresets[0];

const MimikatzApp: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(initialPreset.id);
  const [lastRunId, setLastRunId] = useState<string>(initialPreset.id);
  const [sessionOutput, setSessionOutput] = useState<string[]>(
    initialPreset.output,
  );
  const [showSensitive, setShowSensitive] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'unknown';
    return detectDisplayMode(window);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateMode = () => setDisplayMode(detectDisplayMode(window));
    updateMode();

    const media = window.matchMedia?.('(display-mode: standalone)');
    const addMediaListener = () => {
      if (!media) return () => {};
      const handler = () => updateMode();
      if (media.addEventListener) {
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
      }
      if (media.addListener) {
        media.addListener(handler);
        return () => media.removeListener(handler);
      }
      return () => {};
    };

    const removeMediaListener = addMediaListener();
    window.addEventListener('appinstalled', updateMode);
    window.addEventListener('focus', updateMode);
    return () => {
      removeMediaListener();
      window.removeEventListener('appinstalled', updateMode);
      window.removeEventListener('focus', updateMode);
    };
  }, []);

  useEffect(() => {
    setShowSensitive(false);
  }, [selectedId]);

  const selectedPreset = useMemo(
    () =>
      commandPresets.find((preset) => preset.id === selectedId) ??
      commandPresets[0],
    [selectedId],
  );

  const lastRunPreset = useMemo(
    () =>
      commandPresets.find((preset) => preset.id === lastRunId) ??
      commandPresets[0],
    [lastRunId],
  );

  const inBrowserMode = isBrowserDisplayMode(displayMode);

  const presetDisabled = useMemo(() => {
    if (!selectedPreset) return true;
    if (!inBrowserMode) return false;
    return (
      selectedPreset.context === 'requires-elevation' ||
      selectedPreset.context === 'unsafe-live'
    );
  }, [selectedPreset, inBrowserMode]);

  const handleRun = () => {
    if (presetDisabled || !selectedPreset) return;
    setSessionOutput(selectedPreset.output);
    setLastRunId(selectedPreset.id);
  };

  const copyLine = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // clipboard access not available
    }
  };

  const exportOutput = () => {
    if (!sessionOutput.length) return;
    const blob = new Blob([sessionOutput.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lastRunPreset.id}-output.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <WarningBanner>
        Demo only. No real credentials are used.
      </WarningBanner>
      {inBrowserMode && (
        <div
          className="bg-yellow-900 text-yellow-100 text-sm px-4 py-2 border-b border-yellow-700"
          data-testid="browser-mode-banner"
        >
          Browser demo mode detected. Commands that require elevation or live
          memory access are disabled here.
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 max-w-full border-r border-gray-800 overflow-auto">
          <h2 className="px-4 py-3 font-semibold uppercase text-xs tracking-wider border-b border-gray-800">
            Command presets
          </h2>
          <ul className="divide-y divide-gray-800">
            {commandPresets.map((preset) => {
              const isActive = preset.id === selectedId;
              const context = contextConfig[preset.context];
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(preset.id)}
                    className={`w-full text-left px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      isActive ? 'bg-ub-dark' : 'hover:bg-ub-dark'
                    }`}
                    aria-label={`Select ${preset.command}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm flex items-center gap-2">
                        <span aria-hidden="true">{preset.icon}</span>
                        {preset.command}
                      </span>
                      <span
                        className={`text-[10px] uppercase px-2 py-1 rounded ${context.badge}`}
                      >
                        {context.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      {preset.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 overflow-auto">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span aria-hidden="true">{selectedPreset.icon}</span>
                {selectedPreset.title}
              </h3>
              <p className="text-sm text-gray-200 mt-1">{selectedPreset.description}</p>
              <p className="text-xs text-gray-300 mt-1">
                {selectedPreset.contextNote}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showSensitive}
                  onChange={(e) => setShowSensitive(e.target.checked)}
                />
                Show sensitive fields
              </label>
              <button
                type="button"
                onClick={handleRun}
                disabled={presetDisabled}
                className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                  presetDisabled
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Run preset
              </button>
              <button
                type="button"
                onClick={exportOutput}
                disabled={!sessionOutput.length}
                className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                  sessionOutput.length
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Export output
              </button>
            </div>
            {presetDisabled && (
              <div
                className="bg-yellow-900 text-yellow-100 text-sm px-3 py-2 rounded border border-yellow-700"
                role="note"
              >
                Disabled in browser demo: {selectedPreset.contextNote}
              </div>
            )}
          </div>
          <div className="px-4 pb-4 flex-1 overflow-auto">
            {sessionOutput.length ? (
              <div>
                <div className="text-xs text-gray-300 mb-2">
                  Output from{' '}
                  <span className="font-mono text-white">
                    {lastRunPreset.command}
                  </span>
                </div>
                <div className="bg-black text-green-400 font-mono text-sm p-3 rounded space-y-1">
                  {sessionOutput.map((line, idx) => (
                    <div key={`${line}-${idx}`} className="flex items-start gap-2">
                      <span className="flex-1 whitespace-pre-wrap">
                        {maskSensitive(line, showSensitive)}
                      </span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-white"
                        onClick={() => copyLine(line)}
                        aria-label={`Copy line ${idx + 1}`}
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-black text-green-300 font-mono text-sm p-3 rounded">
                Run a lab-safe preset to view simulated output.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder?: unknown, openApp?: unknown) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
