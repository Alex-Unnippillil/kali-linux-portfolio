import React, { useState, useEffect } from 'react';

export default function Beef() {
  const [hooks, setHooks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [moduleId, setModuleId] = useState('');
  const [output, setOutput] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_BEEF_URL || 'http://127.0.0.1:3000';

  const fetchHooks = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hooks`);
      const data = await res.json();
      setHooks(data.hooked_browsers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHooks();
  }, []);

  const runModule = async () => {
    if (!selected || !moduleId) return;
    try {
      const res = await fetch(`${baseUrl}/api/modules/${moduleId}/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } catch (e) {
      setOutput(e.toString());
    }
  };

  return (
    <div className="flex h-full w-full bg-ub-cool-grey text-white">
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
        <ul>
          {hooks.map((hook) => (
            <li
              key={hook.session || hook.id}
              onClick={() => setSelected(hook.session || hook.id)}
              className={`p-2 cursor-pointer hover:bg-ub-gray-50 ${
                selected === (hook.session || hook.id) ? 'bg-ub-gray-50 text-black' : ''
              }`}
            >
              {hook.name || hook.session || hook.id}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {selected ? (
          <>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Module ID"
                className="w-full p-1 mb-2 text-black"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
              />
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
    </div>
  );
}
