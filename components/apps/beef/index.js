import React, { useState, useEffect, useCallback, useRef } from 'react';
import GuideOverlay from './GuideOverlay';
import HookGraph from './HookGraph';

export default function Beef() {
  const [hooks, setHooks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [moduleId, setModuleId] = useState('');
  const [modules, setModules] = useState([]);
  const [output, setOutput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [steps, setSteps] = useState([]);
  const [liveMessage, setLiveMessage] = useState('');
  const prevHooks = useRef(0);
  const prevSteps = useRef(0);

  const hooksUrl = '/demo-data/beef/hooks.json';
  const modulesUrl = '/demo-data/beef/modules.json';

  const getStatus = (hook) => {
    if (hook.status) return hook.status;
    if (typeof hook.online === 'boolean') return hook.online ? 'online' : 'offline';
    return 'idle';
  };

  const fetchHooks = useCallback(async () => {
    try {
      const res = await fetch(hooksUrl);
      const data = await res.json();
      setHooks(data.hooked_browsers || []);
    } catch (err) {
      console.error(err);
    }
  }, [hooksUrl]);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch(modulesUrl);
      const data = await res.json();
      setModules(data.modules || []);
    } catch (err) {
      console.error(err);
    }
  }, [modulesUrl]);

  useEffect(() => {
    fetchHooks();
  }, [fetchHooks]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('beefHelpDismissed');
      if (!dismissed) setShowHelp(true);
    }
  }, []);

  useEffect(() => {
    if (hooks.length > prevHooks.current) {
      const h = hooks[hooks.length - 1];
      const id = h.session || h.id;
      setLiveMessage(`Hook ${h.name || id} added`);
    }
    prevHooks.current = hooks.length;
  }, [hooks, prevHooks]);

  useEffect(() => {
    if (steps.length > prevSteps.current) {
      const s = steps[steps.length - 1];
      setLiveMessage(`Module ${s.module} run on ${s.hook}`);
    }
    prevSteps.current = steps.length;
  }, [steps, prevSteps]);

  const runModule = () => {
    if (!selected || !moduleId) return;
    setOutput('');
    const mod = modules.find((m) => m.id === moduleId);
    if (mod) setOutput(mod.output || '');
    setSteps((prev) => [
      ...prev,
      { id: prev.length + 1, hook: selected, module: moduleId },
    ]);
  };

  return (
    <div className="relative flex h-full w-full bg-ub-cool-grey text-white pt-6">
      <div className="absolute inset-x-0 top-0 bg-yellow-400 text-black text-center text-sm py-1 z-10">
        Demo data, no live scanning
      </div>
      {showHelp && <GuideOverlay onClose={() => setShowHelp(false)} />}
      <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
        <div className="flex items-center justify-between p-2">
          <h2 className="font-bold">Hooked Browsers</h2>
          <button
            type="button"
            className="px-2 py-1 bg-ub-gray-50 text-black rounded"
            onClick={fetchHooks}
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
          {hooks.length === 0 && (
            <p className="col-span-full text-center text-sm">No hooks yet.</p>
          )}
          {hooks.map((hook) => {
            const id = hook.session || hook.id;
            const status = getStatus(hook);
            return (
              <div
                key={id}
                onClick={() => setSelected(id)}
                className={`flex flex-col items-center p-2 cursor-pointer rounded hover:bg-ub-gray-50 ${
                  selected === id ? 'bg-ub-gray-50 text-black' : ''
                }`}
              >
                <img
                  src={`/themes/Yaru/apps/beef-${status}.svg`}
                  alt={status}
                  className="w-12 h-12 mb-1"
                />
                <span className="text-xs text-center truncate w-full">
                  {hook.name || id}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto flex flex-col">
        <div className="h-64 mb-4">
          <HookGraph hooks={hooks} steps={steps} />
        </div>
        {selected ? (
          <>
            <div className="mb-2">
              <select
                className="w-full p-1 mb-2 text-black"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
              >
                <option value="">Select Module</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={runModule}
                className="px-3 py-1 bg-ub-primary text-white rounded"
              >
                Run Module
              </button>
            </div>
            {output && (
              <pre className="whitespace-pre-wrap text-xs bg-black p-2 rounded">{output}</pre>
            )}
          </>
        ) : (
          <p>Select a hooked browser to run modules.</p>
        )}
      </div>
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
    </div>
  );
}
