import React, { useState, useEffect, useRef } from 'react';

const modes = [
  { id: 'b64encode', label: 'Base64 Encode' },
  { id: 'b64decode', label: 'Base64 Decode' },
  { id: 'hex2b64', label: 'Hex to Base64' },
  { id: 'b642hex', label: 'Base64 to Hex' },
];

const EncodingConverter = ({ onConvert }) => {
  const [mode, setMode] = useState('b64encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const workerRef = useRef();
  const callbacks = useRef(new Map());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./encoding.worker.js', import.meta.url)
    );
    workerRef.current.onmessage = (e) => {
      const cb = callbacks.current.get(e.data.id);
      if (cb) {
        cb(e.data);
        callbacks.current.delete(e.data.id);
      }
    };
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  const callWorker = (payload) =>
    new Promise((resolve) => {
      const id = Math.random();
      callbacks.current.set(id, resolve);
      workerRef.current.postMessage({ id, ...payload });
    });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!input) {
        setOutput('');
        setError("Please enter text, e.g., hello");
        return;
      }
      const res = await callWorker({ mode, input });
      if (res.error) {
        setOutput('');
        setError(res.error);
      } else {
        setOutput(res.result);
        setError('');
        if (onConvert) {
          const m = modes.find((m) => m.id === mode);
          onConvert(`${m?.label.toLowerCase()} "${input}"`, res.result);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, mode, onConvert]);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Encoding Converter</h2>
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="text-black p-1 rounded"
        >
          {modes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        className="text-black p-1 rounded"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Input"
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="flex flex-col gap-2">
        <textarea
          className="text-black p-1 rounded"
          value={output}
          readOnly
          placeholder="Result"
        />
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          disabled={!output}
          className="bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
        >
          Copy
        </button>
      </div>
      <a
        href="/apps/base-encoders"
        target="_blank"
        rel="noreferrer"
        className="text-sm underline"
      >
        Open full Base Encoders app
      </a>
    </div>
  );
};

export default EncodingConverter;
