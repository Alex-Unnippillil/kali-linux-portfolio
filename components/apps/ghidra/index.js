import React, { useEffect, useState } from 'react';
import ExternalFrame from '../../ExternalFrame';

const DEFAULT_WASM = '/wasm/ghidra.wasm';

export default function GhidraApp() {
  const [useRemote, setUseRemote] = useState(false);

  useEffect(() => {
    const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
    if (typeof WebAssembly === 'undefined') {
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
  }, []);

  if (useRemote) {
    const remoteUrl = process.env.NEXT_PUBLIC_GHIDRA_URL || 'https://ghidra.app';
    return (
      <ExternalFrame
        src={remoteUrl}
        className="w-full h-full bg-ub-cool-grey"
        frameBorder="0"
        title="Ghidra"
        allowlist={[remoteUrl]}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-ub-cool-grey text-white">
      Loading Ghidra WebAssembly...
    </div>
  );
}
