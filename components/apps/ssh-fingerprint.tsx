import React, { useState, useEffect, useRef } from 'react';

const SshFingerprint: React.FC = () => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<
    | {
        md5: string;
        sha256: string;
        type: string;
        size: number;
        curve?: string;
        x?: string;
        y?: string;
        exponent?: string;
        modulus?: string;
      }
    | null
  >(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./ssh-fingerprint.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const worker = workerRef.current;
    worker.onmessage = (e) => {
      const { success, details, error } = e.data;
      if (success) {
        setDetails(details);
        setError(null);
      } else {
        setDetails(null);
        setError(error);
      }
    };
    return () => worker.terminate();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setKeyInput(value);
    if (!value.trim()) {
      setDetails(null);
      setError(null);
      return;
    }
    workerRef.current?.postMessage({ key: value });
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        className="flex-grow text-black p-2"
        placeholder="Paste SSH, PEM, or JWK key here..."
        value={keyInput}
        onChange={handleChange}
      />
      {error && <div className="text-red-500 text-sm break-all">{error}</div>}
      {details && (
        <div className="text-sm space-y-1 break-all">
          <div>MD5: {details.md5}</div>
          <div>SHA-256: {details.sha256}</div>
          <div>Type: {details.type}</div>
          <div>Size: {details.size} bits</div>
          {details.curve && <div>Curve: {details.curve}</div>}
          {details.x && <div>X: {details.x}</div>}
          {details.y && <div>Y: {details.y}</div>}
          {details.exponent && <div>Exponent: {details.exponent}</div>}
          {details.modulus && <div>Modulus: {details.modulus}</div>}
        </div>
      )}
    </div>
  );
};

export default SshFingerprint;

