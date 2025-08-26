import React, { useEffect, useState, useRef } from 'react';
import usePersistentState from '../../usePersistentState';

const DEFAULT_WASM = '/wasm/ghidra.wasm';
const DEFAULT_SYMBOLS = ['main', 'init'];

export default function GhidraApp() {
  const [useRemote, setUseRemote] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pluginName, setPluginName] = useState('');
  const [envKey, setEnvKey] = useState(0);
  const fileInputRef = useRef(null);
  const [symbols, setSymbols] = usePersistentState('ghidra-symbols', DEFAULT_SYMBOLS);

  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined' || typeof fetch === 'undefined') {
      setUseRemote(true);
      return;
    }
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
      .then(() => {
        // Placeholder for actual Ghidra WASM initialization
      })
      .catch(() => {
        setUseRemote(true);
      });
  }, [envKey]);

  const handlePluginUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPluginName(file.name);
      setEnvKey((k) => k + 1); // reinitialize environment
    }
  };

  const handleRename = (index, value) => {
    const updated = [...symbols];
    updated[index] = value;
    setSymbols(updated);
  };

  const remoteUrl = process.env.NEXT_PUBLIC_GHIDRA_URL || 'https://ghidra.app';
  const tutorialUrl = process.env.NEXT_PUBLIC_GHIDRA_TUTORIAL_URL || 'https://ghidra.app/tutorial';

  const ghidraView = useRemote ? (
    <iframe
      key={envKey}
      src={remoteUrl}
      className="w-full flex-1 bg-ub-cool-grey"
      frameBorder="0"
      title="Ghidra"
    />
  ) : (
    <div key={envKey} className="w-full flex-1 flex items-center justify-center bg-ub-cool-grey">
      Loading Ghidra WebAssembly...
    </div>
  );

  const tutorialView = (
    <iframe
      src={tutorialUrl}
      className="w-full flex-1 bg-white"
      title="Ghidra Tutorial"
    />
  );

  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="p-2 space-x-2 bg-gray-800 flex">
        <button
          className="px-2 py-1 bg-gray-700 rounded text-sm"
          onClick={() => setShowTutorial((v) => !v)}
        >
          {showTutorial ? 'Hide Tutorial' : 'Show Tutorial'}
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded text-sm"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          Upload Plugin
        </button>
        <input
          data-testid="plugin-input"
          ref={fileInputRef}
          type="file"
          onChange={handlePluginUpload}
          className="hidden"
        />
      </div>
      {pluginName && (
        <div className="px-2 py-1 bg-gray-700 text-sm">Loaded plugin: {pluginName}</div>
      )}
      {showTutorial ? tutorialView : ghidraView}
      <div className="p-2 bg-gray-800">
        <h2 className="text-sm mb-1">Symbols</h2>
        {symbols.map((sym, idx) => (
          <input
            key={idx}
            data-testid={`symbol-${idx}`}
            value={sym}
            onChange={(e) => handleRename(idx, e.target.value)}
            className="w-full mb-1 p-1 text-black"
          />
        ))}
      </div>
    </div>
  );
}
