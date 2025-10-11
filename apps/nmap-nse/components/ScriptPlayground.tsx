'use client';

import React, { useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import scriptCatalog from '../../../public/demo-data/nmap/scripts.json';

interface ScriptMeta {
  name: string;
  description: string;
  categories: string;
  code: string;
}

type CatalogShape = Record<string, Array<{ name: string; description: string; example?: string; categories?: string[] }>>;

const catalog = scriptCatalog as CatalogShape;

const flattened = Object.entries(catalog).flatMap(([tag, scripts]) =>
  scripts.map((script) => ({
    name: script.name,
    description: script.description,
    example: script.example || '',
    categories: script.categories || [tag],
  }))
);

const DEFAULT_SCRIPT: ScriptMeta = flattened[0]
  ? {
      name: flattened[0].name,
      description: flattened[0].description,
      categories: flattened[0].categories.join(', '),
      code: `-- ${flattened[0].name}.nse\ndescription = [[\n${flattened[0].description}\n]]\n`;
    }
  : {
      name: '',
      description: '',
      categories: '',
      code: '',
    };

const ScriptPlayground: React.FC = () => {
  const [script, setScript] = usePersistentState<ScriptMeta>(
    'nmap-nse-playground',
    DEFAULT_SCRIPT
  );

  const outputExamples = useMemo(() => {
    return flattened.reduce<Record<string, string>>((acc, entry) => {
      if (entry.example) {
        acc[entry.name] = entry.example;
      }
      return acc;
    }, {});
  }, []);

  const update = (
    key: keyof ScriptMeta
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setScript({ ...script, [key]: e.target.value });
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full">
      <h2 className="text-xl mb-4">Script Metadata</h2>
        <div className="mb-2">
          <label className="block mb-1" htmlFor="nmap-script-name">
            Name
          </label>
          <input
            id="nmap-script-name"
            type="text"
            value={script.name}
            onChange={update('name')}
            className="w-full p-2 rounded text-black"
            aria-label="Script name"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1" htmlFor="nmap-script-description">
            Description
          </label>
          <textarea
            id="nmap-script-description"
            value={script.description}
            onChange={update('description')}
            className="w-full p-2 rounded text-black"
            rows={3}
            aria-label="Script description"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1" htmlFor="nmap-script-categories">
            Categories (comma separated)
          </label>
          <input
            id="nmap-script-categories"
            type="text"
            value={script.categories}
            onChange={update('categories')}
            className="w-full p-2 rounded text-black"
            aria-label="Script categories"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1" htmlFor="nmap-script-code">
            Script
          </label>
          <textarea
            id="nmap-script-code"
            value={script.code}
            onChange={update('code')}
            className="w-full p-2 rounded text-black font-mono"
            rows={6}
            aria-label="Script code"
          />
        </div>
      <div>
        <h3 className="text-lg mb-2">Simulated Output</h3>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
          {outputExamples[script.name] || 'No example available.'}
        </pre>
      </div>
    </div>
  );
};

export default ScriptPlayground;

