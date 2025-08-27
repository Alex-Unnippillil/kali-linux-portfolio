import React, { useCallback, useEffect, useState } from 'react';

interface Script {
  name: string;
  description: string;
  example: string;
}

type ScriptData = Record<string, Script[]>;

const NmapNSEPage: React.FC = () => {
  const [data, setData] = useState<ScriptData>({});
  const openScriptDoc = useCallback((name: string) => {
    window.open(
      `https://nmap.org/nsedoc/scripts/${name}.html`,
      '_blank',
      'noopener,noreferrer'
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json');
        const json = await res.json();
        setData(json);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Nmap NSE Script Library</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Script details use static demo data for learning purposes only. Links open
        in isolated tabs.
      </p>
      {Object.entries(data).map(([category, scripts]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl mb-2 capitalize">{category}</h2>
          {scripts.map((script) => (
            <div key={script.name} className="mb-4">
              <button
                type="button"
                onClick={() => openScriptDoc(script.name)}
                className="font-mono text-blue-400 underline"
              >
                {script.name}
              </button>
              <p className="mb-2">{script.description}</p>
              <pre className="bg-black text-green-400 p-2 rounded overflow-auto">{script.example}</pre>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default NmapNSEPage;
