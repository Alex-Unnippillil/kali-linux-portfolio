'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

interface CsvItem {
  value: string;
  label: string;
}

const BatchMaker: React.FC = () => {
  const [items, setItems] = useState<CsvItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line, i) => {
          const [val, name] = line.split(',');
          return {
            value: val.trim(),
            label: name ? name.trim() : `code-${i + 1}`,
          };
        });
      setItems(rows);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const draw = async () => {
      if (!items.length) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = 128;
      const cols = 4;
      canvas.width = cols * size;
      canvas.height = Math.ceil(items.length / cols) * size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < items.length; i++) {
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        await QRCode.toCanvas(off, items[i].value, { margin: 1 });
        const x = (i % cols) * size;
        const y = Math.floor(i / cols) * size;
        ctx.drawImage(off, x, y);
      }
    };
    draw();
  }, [items]);

  const exportPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('qr-codes.pdf');
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="text-sm text-white"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={exportPdf}
          className="px-2 py-1 bg-blue-600 rounded"
          disabled={!items.length}
        >
          Export PDF
        </button>
      </div>
      <canvas ref={canvasRef} className="bg-white" />
    </div>
  );
};

export default BatchMaker;

