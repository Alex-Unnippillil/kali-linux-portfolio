import React, { useEffect, useState } from 'react';

const DEFAULT_WASM = '/wasm/ghidra.wasm';

const SAMPLE_PROJECTS = [
  { id: 1, name: 'Firmware', image: '/themes/ghidra/placeholder-1.svg' },
  { id: 2, name: 'Malware', image: '/themes/ghidra/placeholder-2.svg' },
  { id: 3, name: 'Kernel', image: '/themes/ghidra/placeholder-3.svg' },
];

export default function GhidraApp() {
  const [useRemote, setUseRemote] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined') {
      setUseRemote(true);
      return;
    }
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
      .catch(() => {
        setUseRemote(true);
      });
  }, []);

  useEffect(() => {
    setProjects(SAMPLE_PROJECTS);
  }, []);

  if (useRemote) {
    const remoteUrl = process.env.NEXT_PUBLIC_GHIDRA_URL || 'https://ghidra.app';
    return (
      <iframe
        src={remoteUrl}
        className="w-full h-full bg-ub-cool-grey"
        frameBorder="0"
        title="Ghidra"
      />
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4 bg-ub-cool-grey text-white">
      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          Loading Ghidra WebAssembly...
        </div>
      ) : (
        <div className="ghidra-grid">
          {projects.map((p) => (
            <div key={p.id} className="ghidra-item">
              <img src={p.image} alt={p.name} className="ghidra-thumb" />
              <span className="mt-2 block text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
