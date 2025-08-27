import React, { useEffect, useState } from 'react';

const DEFAULT_WASM = '/wasm/ghidra.wasm';

function Fallback({ message }) {
  const sampleCode = `int main(void) {\n  puts("Hello from Ghidra!");\n  return 0;\n}`;

  return (
    <div className="w-full h-full p-4 overflow-auto bg-ub-cool-grey text-white">
      {message && <p className="text-yellow-300 mb-2">{message}</p>}
      <div className="mb-4">
        <input
          type="file"
          disabled
          className="mb-1 opacity-50 cursor-not-allowed"
        />
        <p className="text-sm text-red-400">Uploads are disabled in this demo.</p>
      </div>
      <h3 className="font-bold mb-1">Sample Project</h3>
      <ul className="list-disc list-inside mb-2">
        <li>hello.c</li>
      </ul>
      <pre className="bg-black p-2 rounded text-sm overflow-auto whitespace-pre">
{sampleCode}
      </pre>
    </div>
  );
}

export default function GhidraApp() {
  const remoteUrl = process.env.NEXT_PUBLIC_GHIDRA_URL;
  const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM || DEFAULT_WASM;
  const [embedDenied, setEmbedDenied] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);

  useEffect(() => {
    if (!remoteUrl && typeof WebAssembly !== 'undefined') {
      WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
        .then(() => {
          setWasmReady(true);
          // Placeholder for actual Ghidra WASM initialization
        })
        .catch(() => setWasmReady(false));
    }
  }, [remoteUrl, wasmUrl]);

  if (remoteUrl && !embedDenied) {
    return (
      <iframe
        src={remoteUrl}
        className="w-full h-full bg-ub-cool-grey"
        frameBorder="0"
        title="Ghidra"
        onError={() => setEmbedDenied(true)}
      />
    );
  }

  if (wasmReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ub-cool-grey text-white">
        Loading Ghidra WebAssembly...
      </div>
    );
  }

  const message = embedDenied
    ? 'Embedding denied by remote host.'
    : 'No Ghidra configuration available.';
  return <Fallback message={message} />;
}

