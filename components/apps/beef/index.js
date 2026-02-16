import React, { useEffect, useMemo, useState } from 'react';
import PayloadBuilder from '../../../apps/beef/components/PayloadBuilder';
import GuideOverlay from './GuideOverlay';
import modulesData from './modules.json';
import HookGraph from './HookGraph';

const GUIDE_STORAGE_KEY = 'beefHelpDismissed';

const SAFE_MODULE_IDS = ['browser-info', 'detect-plugins', 'get-local-storage', 'alert'];

const getDefaultModuleId = () => SAFE_MODULE_IDS[0];

const formatClockTime = (value) =>
  value.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export default function Beef() {
  const [step, setStep] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState(getDefaultModuleId());
  const [executions, setExecutions] = useState([]);

  useEffect(() => {
    try {
      setShowGuide(localStorage.getItem(GUIDE_STORAGE_KEY) !== 'true');
    } catch {
      setShowGuide(true);
    }
  }, []);

  const safeModules = useMemo(
    () => modulesData.modules.filter((module) => SAFE_MODULE_IDS.includes(module.id)),
    [],
  );

  const selectedModule =
    safeModules.find((module) => module.id === selectedModuleId) || safeModules[0];

  const runSelectedModule = () => {
    const moduleName = selectedModule?.name || 'Unknown module';
    const now = new Date();

    setExecutions((prev) => {
      const nextId = prev.length + 1;
      const execution = {
        id: `run-${nextId}`,
        hook: `sandbox-browser-${String(nextId).padStart(2, '0')}`,
        module: selectedModuleId,
        status: 'success',
        summary: `${moduleName} ran against local demo state only.`,
        timestamp: formatClockTime(now),
      };

      return [execution, ...prev].slice(0, 6);
    });
  };

  const targetPage = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <title>Sandboxed Target</title>\n</head>\n<body>\n  <h1>Sandboxed Target Page</h1>\n  <p>This page is isolated and cannot make network requests.</p>\n  <script>document.body.append(' - loaded');<\/script>\n</body>\n</html>`;

  const steps = [
    {
      title: 'Disclaimer',
      body:
        'Use these security tools only in environments where you have explicit authorization. Unauthorized testing is illegal.',
      action: 'Begin',
    },
    {
      title: 'Sandboxed Target',
      body: 'The iframe below hosts an isolated page for demonstration. It runs entirely locally.',
      render: (
        <iframe
          title="sandbox"
          className="w-full h-48 border"
          sandbox=""
          srcDoc={targetPage}
        />
      ),
      action: 'Next',
    },
    {
      title: 'Simulated Hook',
      body: 'The target has been locally “hooked”. No packets left this machine.',
      action: 'Next',
    },
    {
      title: 'Run Demo Module',
      body: 'Select a deterministic module and run it against local demo data.',
      render: (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="demo-module-select" className="text-xs uppercase tracking-wide text-white/80">
              Module
            </label>
            <select
              id="demo-module-select"
              value={selectedModuleId}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              className="rounded bg-white px-2 py-1 text-black"
            >
              {safeModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={runSelectedModule}
              className="rounded bg-ub-gray-50 px-3 py-1 text-black"
            >
              Run Module
            </button>
          </div>

          <p className="text-xs text-white/80">{selectedModule?.description}</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded border border-white/20 bg-black/25 p-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                Execution Log
              </h3>
              {executions.length === 0 ? (
                <p className="text-xs text-white/70">No module runs yet. Execute one to populate the graph.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {executions.map((entry) => (
                    <li key={entry.id} className="rounded border border-white/20 bg-black/30 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-semibold">{entry.summary}</strong>
                        <span className="text-[11px] text-white/65">{entry.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-green-300">
                        Status: {entry.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded border border-white/20 bg-black/25 p-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                Hook / Module Graph
              </h3>
              {executions.length === 0 ? (
                <p className="text-xs text-white/70">Graph appears after the first execution.</p>
              ) : (
                <div className="h-56 rounded bg-black/40">
                  <HookGraph hooks={executions} steps={executions} />
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      action: 'Next',
    },
    {
      title: 'Payload Builder',
      body: 'Craft benign payload pages. Copy or preview the generated HTML locally.',
      render: <PayloadBuilder />,
      action: 'Next',
    },
    {
      title: 'Complete',
      body: 'The lab sequence is finished. Reset to clear all data.',
      action: 'Reset Lab',
      final: true,
    },
  ];

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const resetLab = () => {
    try {
      localStorage.removeItem('beef-lab-ok');
    } catch {
      // ignore
    }
    setStep(0);
    setExecutions([]);
    setSelectedModuleId(getDefaultModuleId());
  };

  const current = steps[step];

  return (
    <div className="relative p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col">
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}
      <h2 className="text-xl mb-4">{current.title}</h2>
      <p className="mb-4 text-sm">{current.body}</p>
      {current.render && <div className="mb-4">{current.render}</div>}
      <button
        type="button"
        onClick={current.final ? resetLab : next}
        className="self-start px-3 py-1 bg-ub-primary text-white rounded"
      >
        {current.action}
      </button>
      <p className="mt-4 text-xs">
        For educational use only. No network calls occur during this demo.
      </p>
    </div>
  );
}
