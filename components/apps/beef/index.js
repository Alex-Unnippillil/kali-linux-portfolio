import React, { useState, useEffect, useCallback } from 'react';
import GuideOverlay from './GuideOverlay';
import { hookFixtures, moduleFixtures } from './fixtures';

export default function Beef() {
  const [hooks, setHooks] = useState(hookFixtures);
  const [selected, setSelected] = useState(null);
  const [moduleId, setModuleId] = useState('');
  const [modules, setModules] = useState(moduleFixtures);
  const [output, setOutput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_BEEF_URL || 'http://127.0.0.1:3000';

  const getStatus = (hook) => {
    if (hook.status) return hook.status;
    if (typeof hook.online === 'boolean') return hook.online ? 'online' : 'offline';
    return 'idle';
  };

  const fetchHooks = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hooks`);
      const data = await res.json();
      const hb = data.hooked_browsers || [];
      setHooks(hb.length ? hb : hookFixtures);
    } catch (err) {
      console.error(err);
      setHooks(hookFixtures);
    }
  }, [baseUrl]);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/modules`);
      const data = await res.json();
      const mods = data.modules || [];
      setModules(mods.length ? mods : moduleFixtures);
    } catch (err) {
      console.error(err);
      setModules(moduleFixtures);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchHooks();
    const id = setInterval(fetchHooks, 5000);
    return () => clearInterval(id);
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

  const runModule = async () => {
    if (!selected || !moduleId) return;
    setOutput('');
    try {
      const res = await fetch(`${baseUrl}/api/modules/${moduleId}/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          setOutput((prev) => prev + text);
        }
      } else {
        const json = await res.json();
        setOutput(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      const fallback = modules.find((m) => m.id === moduleId);
      if (fallback && fallback.result) {
        setOutput(fallback.result);
      } else {
        setOutput(e.toString());
      }
    }
  };

  const selectedHook = hooks.find((h) => (h.session || h.id) === selected);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      {showHelp && <GuideOverlay onClose={() => setShowHelp(false)} />}
      <div className="bg-yellow-400 text-black text-center text-xs font-bold py-1">
        Demo only. No real exploitation is performed.
      </div>
      <div className="flex flex-1">
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
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedHook ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black p-2 rounded">
                <h3 className="font-bold mb-2">Info</h3>
                <ul className="text-xs space-y-1">
                  <li>
                    <strong>ID:</strong> {selectedHook.id}
                  </li>
                  {selectedHook.ip && (
                    <li>
                      <strong>IP:</strong> {selectedHook.ip}
                    </li>
                  )}
                  {selectedHook.os && (
                    <li>
                      <strong>OS:</strong> {selectedHook.os}
                    </li>
                  )}
                  {selectedHook.ua && (
                    <li>
                      <strong>UA:</strong> {selectedHook.ua}
                    </li>
                  )}
                </ul>
              </div>
              <div className="bg-black p-2 rounded">
                <h3 className="font-bold mb-2">Commands</h3>
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
              <div className="bg-black p-2 rounded">
                <h3 className="font-bold mb-2">Results</h3>
                {output ? (
                  <pre className="whitespace-pre-wrap text-xs">{output}</pre>
                ) : (
                  <p className="text-xs">No results yet.</p>
                )}
              </div>
            </div>
          ) : (
            <p>Select a hooked browser to inspect modules.</p>
          )}
        </div>
      </div>
    </div>
  );
}
