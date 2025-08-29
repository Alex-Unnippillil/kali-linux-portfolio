'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReportView, { Report } from './components/ReportView';

interface Script {
  name: string;
  description: string;
  example: string;
}

type ScriptData = Record<string, Script[]>;

const NmapNSE: React.FC = () => {
  const [data, setData] = useState<ScriptData>({});
  const [query, setQuery] = useState('');
  const workerRef = useRef<Worker>();
  const [report, setReport] = useState<Report | null>(null);
  const [parseError, setParseError] = useState('');
  const copyExample = useCallback((text: string) => {
    if (typeof window !== 'undefined') {
      try {
        navigator.clipboard?.writeText(text);
      } catch (e) {
        // ignore copy errors
      }
    }
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./workers/xmlParser.ts', import.meta.url)
    );
    workerRef.current.onmessage = (e) => {
      const { error } = e.data as { error?: string };
      if (error) {
        setParseError(error);
        setReport(null);
      } else {
        setParseError('');
        setReport(e.data as Report);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      workerRef.current?.postMessage(reader.result);
    };
    reader.readAsText(file);
  };
  const openScriptDoc = useCallback((name: string) => {
    if (typeof window !== 'undefined') {
      window.open(
        `https://nmap.org/nsedoc/scripts/${name}.html`,
        '_blank',
        'noopener,noreferrer'
      );
    }
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

  const queryLower = query.toLowerCase();
  const filtered: [string, Script[]][] = Object.entries(data).flatMap(
    ([category, scripts]) => {
    const categoryMatch = category.toLowerCase().includes(queryLower);
    const matchedScripts = scripts.filter((s) =>
      s.name.toLowerCase().includes(queryLower)
    );
    if (categoryMatch) {
      return [[category, scripts]];
    }
    if (matchedScripts.length > 0) {
      return [[category, matchedScripts]];
    }
    return [] as [string, Script[]][];
  });

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Nmap NSE Script Library</h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter scripts"
        className="mb-4 p-2 w-full rounded text-black"
      />
      <p className="text-sm text-yellow-300 mb-4">
        Script details use static demo data for learning purposes only. Links open
        in isolated tabs.
      </p>
      {filtered.map(([category, scripts]) => (
        <div key={category} className="mb-6">
          <h2 className="text-xl mb-2 capitalize">{category}</h2>
          {scripts.map((script: Script) => (
            <div key={script.name} className="mb-4">
              <button
                type="button"
                onClick={() => openScriptDoc(script.name)}
                className="font-mono text-blue-400 underline"
              >
                {script.name}
              </button>
              <p className="mb-2">{script.description}</p>
              <pre className="bg-black text-green-400 p-2 rounded overflow-auto font-mono leading-[1.2]">
                {script.example}
              </pre>
              <button
                type="button"
                onClick={() => copyExample(script.example)}
                className="mt-2 px-2 py-1 bg-blue-700 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      ))}
      <section className="mt-8">
        <h2 className="text-xl mb-2">Upload Nmap XML Report</h2>
        <input type="file" accept=".xml" onChange={onFile} />
        {parseError && (
          <div className="mt-2 text-red-400">{parseError}</div>
        )}
        {report && (
          <div className="mt-4">
            <ReportView report={report} />
          </div>
        )}
      </section>
    </div>
  );
};

export default NmapNSE;
