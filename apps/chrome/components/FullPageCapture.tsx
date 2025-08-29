'use client';

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import usePersistentState from '../../../hooks/usePersistentState';

interface CaptureMeta {
  id: string;
  ts: number;
  type: 'png' | 'pdf';
}

export default function FullPageCapture() {
  const [captures, setCaptures] = usePersistentState<CaptureMeta[]>(
    'chrome-fullpage-captures',
    () => []
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
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => capture('png')}
          disabled={processing}
          className="p-2 rounded bg-blue-600 text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M12 5v8m0 0l3-3m-3 3l-3-3M5 19h14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">Download PNG</span>
        </button>
        <button
          type="button"
          onClick={() => capture('pdf')}
          disabled={processing}
          className="p-2 rounded bg-green-600 text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M12 5v8m0 0l3-3m-3 3l-3-3M5 19h14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">Download PDF</span>
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

