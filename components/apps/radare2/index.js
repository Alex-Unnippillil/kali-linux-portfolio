import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Pre-baked data for the tour
const demoSections = [
  { name: '.text', addr: '0x1000', size: '0x200' },
  { name: '.data', addr: '0x2000', size: '0x80' },
  { name: '.bss', addr: '0x2080', size: '0x40' },
];

const demoSymbols = [
  { name: 'sym.main', addr: '0x1000' },
  { name: 'sym.helper', addr: '0x1050' },
  { name: 'sym.exit', addr: '0x1100' },
];

// Sample call graph input for the worker
const demoAnalysis = `
main -> sym.helper
sym.helper -> sym.exit
`;

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const Radare2 = () => {
  const workerRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Kick off the worker with the pre-baked analysis so no real
  // analysis runs in the browser.
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(
        new URL('./analysisWorker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'graph') {
          setGraphData(e.data.graphData);
        }
      };
      workerRef.current.postMessage({ type: 'graph', analysis: demoAnalysis });
      return () => workerRef.current.terminate();
    }
    return undefined;
  }, []);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-xl mb-4">Radare2 Tour</h1>

      <section className="mb-6">
        <h2 className="text-lg mb-2">Sections</h2>
        <ul className="bg-black rounded p-2">
          {demoSections.map((s) => (
            <li key={s.name}>
              {s.name} - {s.addr} - {s.size}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg mb-2">Symbols</h2>
        <ul className="bg-black rounded p-2">
          {demoSymbols.map((sym) => (
            <li key={sym.name}>
              {sym.name} - {sym.addr}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg mb-2">Call Graph</h2>
        <div className="h-64 bg-black rounded">
          <ForceGraph2D graphData={graphData} />
        </div>
      </section>

      <p>
        Learn more from the{' '}
        <a
          href="https://book.rada.re"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          official radare2 book
        </a>{' '}
        and the{' '}
        <a
          href="https://rada.re"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          project site
        </a>
        .
      </p>
    </div>
  );
};

export default Radare2;

