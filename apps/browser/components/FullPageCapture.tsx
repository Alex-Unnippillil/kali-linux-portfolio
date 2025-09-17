'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useBrowserStorage from '../useBrowserStorage';

interface CaptureMeta {
  id: string;
  ts: number;
  type: 'png' | 'pdf';
}

export default function FullPageCapture() {
  const [captures, setCaptures] = useBrowserStorage<CaptureMeta[]>(
    'fullpage-captures',
    () => [],
  );
  const [processing, setProcessing] = useState(false);
  const canvasContainer = useRef<HTMLDivElement>(null);

  const capture = async (type: 'png' | 'pdf') => {
    setProcessing(true);
    try {
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      if (canvasContainer.current) {
        canvasContainer.current.innerHTML = '';
        canvasContainer.current.appendChild(canvas);
      }
      const imgData = canvas.toDataURL('image/png');
      if (type === 'png') {
        const a = document.createElement('a');
        a.href = imgData;
        a.download = 'capture.png';
        a.click();
      } else {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        pdf.save('capture.pdf');
      }
      setCaptures([
        ...captures,
        { id: `${Date.now()}`, ts: Date.now(), type },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-x-2">
        <button
          type="button"
          onClick={() => capture('png')}
          disabled={processing}
          className="px-3 py-1 rounded bg-blue-600 text-white"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={() => capture('pdf')}
          disabled={processing}
          className="px-3 py-1 rounded bg-green-600 text-white"
        >
          Download PDF
        </button>
      </div>
      <div ref={canvasContainer} />
      {captures.length > 0 && (
        <ul className="text-xs list-disc pl-4">
          {captures.map((c) => (
            <li key={c.id}>
              {new Date(c.ts).toLocaleString()} - {c.type.toUpperCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

