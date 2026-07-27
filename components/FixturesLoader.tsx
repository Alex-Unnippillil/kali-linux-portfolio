"use client";

import { useEffect, useRef, useState } from 'react';

interface LoaderProps {
  onData: (rows: any[]) => void;
}

const isDevBuild = process.env.NODE_ENV !== 'production';
const forcedFixtures = process.env.NEXT_PUBLIC_FORCE_FIXTURES === 'true';
const fixturesEnabled = isDevBuild || forcedFixtures;

let FixturesLoaderComponent: ({ onData }: LoaderProps) => JSX.Element;

if (fixturesEnabled) {
  FixturesLoaderComponent = function FixturesLoaderDev({ onData }: LoaderProps) {
    const [progress, setProgress] = useState(0);
    const workerRef = useRef<Worker | null>(null);
    const forcedInProd = forcedFixtures && !isDevBuild;

    useEffect(() => {
      const worker = new Worker(new URL('../workers/fixturesParser.ts', import.meta.url));
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'progress') setProgress(payload);
        if (type === 'result') {
          onData(payload);
          try {
            localStorage.setItem('fixtures-last', JSON.stringify(payload));
          } catch {
            /* ignore */
          }
        }
      };

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    }, [onData]);

    const loadSample = async () => {
      if (!workerRef.current) return;
      const res = await fetch('/fixtures/sample.json');
      const text = await res.text();
      workerRef.current.postMessage({ type: 'parse', text });
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!workerRef.current) return;
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        workerRef.current?.postMessage({ type: 'parse', text: reader.result });
      };
      reader.readAsText(file);
    };

    const cancel = () => workerRef.current?.postMessage({ type: 'cancel' });

    return (
      <div className="text-xs" aria-label="fixtures loader">
        {forcedInProd && (
          <div
            role="alert"
            className="mb-2 rounded border border-ub-orange bg-ub-orange px-2 py-1 text-black font-semibold"
          >
            Fixtures forced on in production. Remove NEXT_PUBLIC_FORCE_FIXTURES to keep bundles lean.
          </div>
        )}
        <div className="mb-2 flex items-center">
          <button onClick={loadSample} className="px-2 py-1 bg-ub-cool-grey text-white mr-2" type="button">
            Load Sample
          </button>
          <label className="px-2 py-1 bg-ub-cool-grey text-white mr-2 cursor-pointer">
            Import
            <input type="file" onChange={onFile} className="hidden" aria-label="import fixture" />
          </label>
          <button onClick={cancel} className="px-2 py-1 bg-ub-red text-white" type="button">
            Cancel
          </button>
        </div>
        <div className="mb-2" aria-label="progress">
          Parsing: {progress}%
        </div>
      </div>
    );
  };
} else {
  FixturesLoaderComponent = function FixturesLoaderDisabled() {
    return (
      <div className="text-xs" aria-label="fixtures loader disabled">
        <div className="rounded border border-ub-cool-grey bg-ub-grey px-2 py-1 text-white">
          Fixtures loader is disabled in production builds to keep bundles lean.
        </div>
      </div>
    );
  };
}

export default FixturesLoaderComponent;

