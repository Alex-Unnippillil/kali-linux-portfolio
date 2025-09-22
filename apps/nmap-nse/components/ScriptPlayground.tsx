'use client';

import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface ScriptMeta {
  name: string;
  description: string;
  categories: string;
  code: string;
}

const OUTPUT_EXAMPLES: Record<string, string> = {
  'http-title': `80/tcp open  http
| http-title: Example Domain
|_Requested resource was Example Domain page`,
  'ftp-anon': `21/tcp open  ftp
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_This is a sample output`,
};

const ScriptPlayground: React.FC = () => {
  const [script, setScript] = usePersistentState<ScriptMeta>(
    'nmap-nse-playground',
    {
      name: '',
      description: '',
      categories: '',
      code: '',
    }
  );

  const update = (
    key: keyof ScriptMeta
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setScript({ ...script, [key]: e.target.value });
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full">
      <h2 className="text-xl mb-4">Script Metadata</h2>
        <label className="block mb-2">
          <span className="block mb-1">Name</span>
          <input
            type="text"
            value={script.name}
            onChange={update('name')}
            className="w-full p-2 rounded text-black"
            aria-label="Script name"
          />
        </label>
        <label className="block mb-2">
          <span className="block mb-1">Description</span>
          <textarea
            value={script.description}
            onChange={update('description')}
            className="w-full p-2 rounded text-black"
            rows={3}
            aria-label="Script description"
          />
        </label>
        <label className="block mb-2">
          <span className="block mb-1">Categories (comma separated)</span>
          <input
            type="text"
            value={script.categories}
            onChange={update('categories')}
            className="w-full p-2 rounded text-black"
            aria-label="Script categories"
          />
        </label>
        <label className="block mb-4">
          <span className="block mb-1">Script</span>
          <textarea
            value={script.code}
            onChange={update('code')}
            className="w-full p-2 rounded text-black font-mono"
            rows={6}
            aria-label="Nmap script"
          />
        </label>
      <div>
        <h3 className="text-lg mb-2">Simulated Output</h3>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
          {OUTPUT_EXAMPLES[script.name] || 'No example available.'}
        </pre>
      </div>
    </div>
  );
};

export default ScriptPlayground;

