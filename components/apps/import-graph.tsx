import React, { useState } from 'react';

interface ImportEntry {
  module: string;
  name: string;
}

const ImportGraph: React.FC = () => {
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const [error, setError] = useState<string>('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setImports([]);
    try {
      const buf = await file.arrayBuffer();
      const mod = await WebAssembly.compile(buf);
      const imps = WebAssembly.Module.imports(mod) as ImportEntry[];
      setImports(imps);
    } catch (err) {
      setError('Failed to parse imports. Please upload a valid WebAssembly binary.');
    }
  };

  const height = Math.max(imports.length * 30 + 40, 120);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <input
        type="file"
        accept=".wasm,application/wasm,application/octet-stream"
        onChange={handleFile}
        className="mb-4"
      />
      {error && <div className="text-red-400">{error}</div>}
      {imports.length > 0 && (
        <svg width={400} height={height} className="border border-gray-700 bg-gray-800">
          <circle cx={50} cy={20} r={10} fill="#4ade80" />
          <text x={50} y={20} dy={4} textAnchor="middle" className="text-xs fill-white">
            Binary
          </text>
          {imports.map((imp, idx) => (
            <g key={`${imp.module}.${imp.name}`}>
              <circle cx={300} cy={40 + idx * 30} r={8} fill="#60a5fa" />
              <text
                x={315}
                y={40 + idx * 30}
                dy={4}
                className="text-xs fill-white"
              >{`${imp.module}.${imp.name}`}</text>
              <line x1={60} y1={20} x2={292} y2={40 + idx * 30} stroke="#fff" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
};

export default ImportGraph;
export const displayImportGraph = () => <ImportGraph />;
