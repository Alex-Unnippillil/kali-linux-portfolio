import React, { useEffect, useRef, useState } from 'react';

const printable = (byte: number) => byte >= 32 && byte <= 126;

const extractStrings = (data: Uint8Array, minLength = 4) => {
  const results: { offset: number; value: string }[] = [];
  let current = '';
  let start = 0;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    if (printable(b)) {
      if (current.length === 0) start = i;
      current += String.fromCharCode(b);
    } else {
      if (current.length >= minLength) results.push({ offset: start, value: current });
      current = '';
    }
  }
  if (current.length >= minLength) results.push({ offset: start, value: current });
  return results;
};

const rollingEntropy = (data: Uint8Array, windowSize = 256) => {
  if (data.length < windowSize) return [] as { offset: number; entropy: number }[];
  const freq = new Array(256).fill(0);
  for (let i = 0; i < windowSize; i++) freq[data[i]]++;
  const entropies: { offset: number; entropy: number }[] = [];
  const calc = () => {
    let h = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i]) {
        const p = freq[i] / windowSize;
        h -= p * Math.log2(p);
      }
    }
    return h;
  };
  entropies.push({ offset: 0, entropy: calc() });
  for (let i = windowSize; i < data.length; i++) {
    freq[data[i - windowSize]]--;
    freq[data[i]]++;
    entropies.push({ offset: i - windowSize + 1, entropy: calc() });
  }
  return entropies;
};

const EntropyExplorer: React.FC = () => {
  const [strings, setStrings] = useState<{ offset: number; value: string }[]>([]);
  const [entropy, setEntropy] = useState<{ offset: number; entropy: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const data = new Uint8Array(buffer);
      setStrings(extractStrings(data));
      setEntropy(rollingEntropy(data));
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || entropy.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    const maxEntropy = 8;
    for (let i = 1; i < entropy.length; i++) {
      const prev = entropy[i - 1];
      const curr = entropy[i];
      const x1 = ((i - 1) / entropy.length) * width;
      const y1 = height - (prev.entropy / maxEntropy) * height;
      const x2 = (i / entropy.length) * width;
      const y2 = height - (curr.entropy / maxEntropy) * height;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = curr.entropy > 7.5 ? 'red' : 'lime';
      ctx.stroke();
    }
  }, [entropy]);

  const exportCSV = () => {
    let csv = 'type,offset,value\n';
    strings.forEach((s) => {
      const val = s.value.replace(/"/g, '""');
      csv += `string,${s.offset},"${val}"\n`;
    });
    entropy.forEach((e) => {
      csv += `entropy,${e.offset},${e.entropy.toFixed(4)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entropy_explorer.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 h-full w-full text-white bg-ub-cool-grey overflow-auto">
      <input type="file" onChange={handleFile} className="mb-4" />
      <div className="mb-4">
        <canvas ref={canvasRef} width={600} height={200} className="w-full border" />
      </div>
      {strings.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 font-bold">Strings</h3>
          <ul className="max-h-64 overflow-y-auto text-xs bg-black p-2">
            {strings.map((s, i) => (
              <li key={i}>{s.value}</li>
            ))}
          </ul>
        </div>
      )}
      {(strings.length > 0 || entropy.length > 0) && (
        <button className="px-2 py-1 bg-gray-700" onClick={exportCSV}>
          Export CSV
        </button>
      )}
    </div>
  );
};

export default EntropyExplorer;

