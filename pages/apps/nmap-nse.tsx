import React, { useEffect, useState } from 'react';

interface Script {
  name: string;
  description: string;
  example: string;
}

type ScriptData = Record<string, Script[]>;

const NmapNSEPage: React.FC = () => {
  const [data, setData] = useState<ScriptData>({});

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
      {Object.entries(data).map(([category, scripts]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl mb-2 capitalize">{category}</h2>
          {scripts.map((script) => (
            <div key={script.name} className="mb-4">
              <a
                href={`https://nmap.org/nsedoc/scripts/${script.name}.html`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-400 underline"
              >
                {script.name}
              </a>
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
