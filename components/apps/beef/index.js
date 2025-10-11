import React, { useEffect, useMemo, useState } from 'react';
import HookGraph from './HookGraph';
import PayloadBuilder from '../../../apps/beef/components/PayloadBuilder';
import modulesData from './modules.json';
import { hookInventory, demoActivity } from './demoData';

const LAB_MODE_KEY = 'beef-lab-mode';

export default function Beef() {
  const moduleList = modulesData.modules;
  const safeDefaultId = useMemo(() => {
    const safeModule = moduleList.find((module) => !module.labOnly);
    return safeModule ? safeModule.id : moduleList[0]?.id || '';
  }, [moduleList]);

  const [labMode, setLabMode] = useState(false);
  const [selectedHookId, setSelectedHookId] = useState(hookInventory[0]?.id || '');
  const [selectedModuleId, setSelectedModuleId] = useState(safeDefaultId);
  const [runDetails, setRunDetails] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(LAB_MODE_KEY);
      if (stored === 'enabled') {
        setLabMode(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LAB_MODE_KEY, labMode ? 'enabled' : 'disabled');
    } catch {
      /* ignore storage errors */
    }
  }, [labMode]);

  useEffect(() => {
    const currentModule = moduleList.find((module) => module.id === selectedModuleId);
    if (!currentModule || (currentModule.labOnly && !labMode)) {
      const fallback = moduleList.find((module) => !module.labOnly) || moduleList[0];
      if (fallback && fallback.id !== selectedModuleId) {
        setSelectedModuleId(fallback.id);
      }
    }
  }, [labMode, moduleList, selectedModuleId]);

  const selectedHook = hookInventory.find((hook) => hook.id === selectedHookId);
  const selectedModule = moduleList.find((module) => module.id === selectedModuleId);

  const handleToggleLabMode = () => {
    setLabMode((prev) => !prev);
    setRunDetails(null);
  };

  const handleRunModule = () => {
    if (!selectedModule || (selectedModule.labOnly && !labMode)) {
      return;
    }
    setRunDetails({
      module: selectedModule.name,
      explanation: selectedModule.explanation,
      output: selectedModule.result,
      snippet: selectedModule.demo,
      labOnly: selectedModule.labOnly,
      hook: selectedHook?.codename || selectedHookId,
    });
  };

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col gap-4 overflow-auto">
      <section className="bg-black/30 rounded p-4 space-y-3">
        <h2 className="text-xl font-semibold">BeEF Simulation Lab</h2>
        <p className="text-sm text-gray-100">
          Explore a simulated Browser Exploitation Framework environment. Hooks, modules, and outputs are
          pre-recorded to illustrate workflows without transmitting any live payloads.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={labMode}
              onChange={handleToggleLabMode}
              aria-label="Enable lab mode for advanced modules"
            />
            <span>Lab mode (unlocks advanced data-collection modules)</span>
          </label>
          <p className="text-xs text-gray-300">
            Offline demo only – perfect for classrooms, capture-the-flag prep, and tabletop exercises.
          </p>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-black/25 rounded p-4 flex flex-col min-h-[16rem]">
          <h3 className="text-lg font-semibold mb-1">Hook inventory</h3>
          <p className="text-sm text-gray-200 mb-4">
            Select a simulated browser session to inspect its canned profile and network segment.
          </p>
          <div className="space-y-2 overflow-auto pr-1">
            {hookInventory.map((hook) => {
              const isSelected = hook.id === selectedHookId;
              return (
                <button
                  key={hook.id}
                  type="button"
                  onClick={() => setSelectedHookId(hook.id)}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring ${
                    isSelected ? 'bg-ub-primary border-ub-primary text-white' : 'bg-black/40 border-black/30 hover:bg-black/50'
                  }`}
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{hook.codename}</span>
                    <span className="text-xs uppercase tracking-wide">{hook.status}</span>
                  </div>
                  <p className="text-xs text-gray-200">{hook.browser}</p>
                  <p className="text-xs text-gray-300">{hook.ip} · {hook.scope}</p>
                </button>
              );
            })}
          </div>
          {selectedHook && (
            <div className="mt-4 bg-black/40 rounded p-3 text-xs text-gray-200">
              <p className="font-semibold text-sm mb-1">Hook notes</p>
              <p>{selectedHook.note}</p>
            </div>
          )}
        </div>

        <div className="bg-black/25 rounded p-4 flex flex-col min-h-[16rem]">
          <h3 className="text-lg font-semibold mb-1">Module catalog</h3>
          <p className="text-sm text-gray-200 mb-4">
            Review curated exploit demos. Advanced items stay disabled until lab mode is enabled.
          </p>
          <div className="space-y-2 overflow-auto pr-1 flex-1">
            {moduleList.map((module) => {
              const disabled = module.labOnly && !labMode;
              const isSelected = module.id === selectedModuleId;
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => !disabled && setSelectedModuleId(module.id)}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring ${
                    isSelected ? 'bg-ub-primary border-ub-primary text-white' : 'bg-black/40 border-black/30 hover:bg-black/50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{module.name}</span>
                    <span className="text-xs uppercase tracking-wide">{module.category}</span>
                  </div>
                  <p className="text-xs text-gray-200 mb-1">{module.description}</p>
                  {module.labOnly && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-red-300">
                      Lab mode required
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleRunModule}
              className="px-4 py-2 bg-ub-primary text-white rounded focus:outline-none focus:ring disabled:opacity-50"
              disabled={!selectedModule || (selectedModule.labOnly && !labMode)}
            >
              Run demo module
            </button>
          </div>
          {runDetails && (
            <div className="mt-4 bg-black/40 rounded p-3 text-xs text-gray-200 space-y-2">
              <p className="font-semibold text-sm">{runDetails.module}</p>
              <p>Target hook: {runDetails.hook}</p>
              <p>{runDetails.explanation}</p>
              <pre className="bg-black text-green-400 p-2 rounded whitespace-pre-wrap break-all">
                {runDetails.snippet}
              </pre>
              <p>{runDetails.output}</p>
              {runDetails.labOnly && (
                <p className="text-red-300">Visible because lab mode is enabled.</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-black/30 rounded p-4">
        <h3 className="text-lg font-semibold mb-1">Recent activity timeline</h3>
        <p className="text-sm text-gray-200 mb-3">
          These entries replay a typical BeEF lab session so learners can correlate hook status, executed modules, and
          documented outcomes.
        </p>
        <HookGraph hooks={hookInventory} steps={demoActivity} />
      </section>

      <section className="bg-black/30 rounded p-4">
        <h3 className="text-lg font-semibold mb-2">Payload builder sandbox</h3>
        <p className="text-sm text-gray-200 mb-3">
          Craft static payload pages to include in tabletop narratives. All generated HTML stays in-browser.
        </p>
        <PayloadBuilder />
      </section>

      <p className="text-xs text-gray-300">
        For educational use only. No network calls occur during this demo; everything shown above is canned lab data.
      </p>
    </div>
  );
}
