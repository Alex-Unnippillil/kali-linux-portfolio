import React, { useEffect, useRef, useState } from 'react';

interface HashResult {
  aHash: string;
  dHash: string;
  pHash: string;
  simHash: string;
}

interface WorkerResult {
  hashesA: HashResult;
  hashesB: HashResult;
  distances: Record<string, number>;
  diff: { width: number; height: number; data: ArrayBuffer };
  heatmaps: Record<string, number[]>;
  error?: string;
}

const guidance = (d: number) => {
  if (d === 0) return 'identical';
  if (d <= 5) return 'almost identical';
  if (d <= 10) return 'similar – review for false positives';
  return 'different';
};

const ContentFingerprint: React.FC = () => {
  const workerRef = useRef<Worker>();
  const fileARef = useRef<File | null>(null);
  const fileBRef = useRef<File | null>(null);

  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);
  const [result, setResult] = useState<WorkerResult | null>(null);
  const diffCanvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');

  const downloadCSV = () => {
    if (!result) return;
    const rows = [
      ['algorithm', 'hashA', 'hashB', 'hamming'],
      ...Object.keys(result.hashesA).map((key) => [
        key,
        (result.hashesA as any)[key],
        (result.hashesB as any)[key],
        result.distances[key].toString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hashes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker(new URL('./hashWorker.ts', import.meta.url));
      workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
        const data = e.data;
        if ((data as any).error) {
          setError((data as any).error);
          return;
        }
        setError('');
        setResult(data);
      };
    }
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (result?.diff && diffCanvas.current) {
      const { width, height, data } = result.diff;
      const ctx = diffCanvas.current.getContext('2d');
      if (!ctx) return;
      const img = new ImageData(new Uint8ClampedArray(data), width, height);
      diffCanvas.current.width = width;
      diffCanvas.current.height = height;
      ctx.putImageData(img, 0, 0);
    }
  }, [result]);

  const sendToWorker = () => {
    if (fileARef.current && fileBRef.current && workerRef.current) {
      workerRef.current.postMessage({ fileA: fileARef.current, fileB: fileBRef.current });
    }
  };

  const handleFile = (file: File, which: 'a' | 'b') => {
    if (!file.type.startsWith('image/')) {
      setError('Unsupported image type');
      return;
    }
    const url = URL.createObjectURL(file);
    if (which === 'a') {
      if (urlA) URL.revokeObjectURL(urlA);
      setUrlA(url);
      fileARef.current = file;
    } else {
      if (urlB) URL.revokeObjectURL(urlB);
      setUrlB(url);
      fileBRef.current = file;
    }
    setResult(null);
    setError('');
    if (fileARef.current && fileBRef.current) sendToWorker();
  };

  const makeDropHandler = (which: 'a' | 'b') => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file, which);
  };

  const inputHandler = (which: 'a' | 'b') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file, which);
  };

  const renderDropZone = (which: 'a' | 'b', url: string | null) => (
    <div
      className="flex-1 border-2 border-dashed border-gray-500 flex items-center justify-center relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={makeDropHandler(which)}
    >
      {url ? (
        <img src={url} alt="preview" className="max-h-64 object-contain" />
      ) : (
        <span>Drag & drop image {which.toUpperCase()}</span>
      )}
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={inputHandler(which)}
      />
      {which === 'b' && result?.diff && (
        <canvas ref={diffCanvas} className="absolute inset-0 pointer-events-none" />
      )}
    </div>
  );

  const renderHeatmap = (bits: number[]) => (
    <div className="grid grid-cols-8 gap-0.5">
      {bits.map((b, i) => (
        <div
          key={i}
          className={`w-4 h-4 ${b ? 'bg-red-500' : 'bg-green-600'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
        {renderDropZone('a', urlA)}
        {renderDropZone('b', urlB)}
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {result && (
        <>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="p-2">Algorithm</th>
                  <th className="p-2">Image A</th>
                  <th className="p-2">Image B</th>
                  <th className="p-2">Hamming</th>
                  <th className="p-2">Guidance</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(result.hashesA).map((key) => (
                  <tr key={key} className="border-t border-gray-700">
                    <td className="p-2">{key}</td>
                    <td className="p-2 break-all">{(result.hashesA as any)[key]}</td>
                    <td className="p-2 break-all">{(result.hashesB as any)[key]}</td>
                    <td className="p-2">{result.distances[key]}</td>
                    <td className="p-2">{guidance(result.distances[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={downloadCSV}
              className="px-2 py-1 bg-blue-600 rounded text-xs"
            >
              Download CSV
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {Object.keys(result.heatmaps).map((key) => (
              <div key={key} className="flex flex-col items-center">
                <div className="mb-1 text-xs">{key}</div>
                {renderHeatmap(result.heatmaps[key])}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="text-xs text-gray-400">
        Hash differences &lt;=5 are typically nearly identical, 6-10 similar, &gt;10 different.
        Low distances may still collide, so inspect the heatmap and diff overlay to avoid false positives.
        WebAssembly-optimized pHash runs in a worker to keep the UI responsive.
      </div>
    </div>
  );
};

export default ContentFingerprint;

