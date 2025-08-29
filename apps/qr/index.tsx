'use client';
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface BatchItem {
  name: string;
  png: string;
  svg: string;
}

const errorLevels = ['L', 'M', 'Q', 'H'] as const;

type ErrorLevel = (typeof errorLevels)[number];

const QRGenerator: React.FC = () => {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<ErrorLevel>('M');
  const [invert, setInvert] = useState(false);
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');
  const [csv, setCsv] = useState('');
  const [batch, setBatch] = useState<BatchItem[]>([]);

  const opts = React.useMemo(
    () => ({
      errorCorrectionLevel: level,
      color: {
        dark: invert ? '#ffffff' : '#000000',
        light: invert ? '#000000' : '#ffffff',
      },
      margin: 1,
    }),
    [level, invert],
  );

  useEffect(() => {
    const value = text || ' ';
    QRCode.toDataURL(value, opts)
      .then(setPng)
      .catch(() => setPng(''));
    QRCode.toString(value, { ...opts, type: 'svg' })
      .then(setSvg)
      .catch(() => setSvg(''));
  }, [text, opts]);

  const downloadPng = () => {
    if (!png) return;
    const link = document.createElement('a');
    link.href = png;
    link.download = 'qr.png';
    link.click();
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const downloadSvgText = (svgText: string, filename: string) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateBatch = async () => {
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = await Promise.all(
      lines.map(async (line, i) => {
        const [val, nameCol] = line.split(',');
        const value = val.trim();
        const name = nameCol ? nameCol.trim() : `code-${i + 1}`;
        const pngData = await QRCode.toDataURL(value, opts);
        const svgText = await QRCode.toString(value, { ...opts, type: 'svg' });
        return { name, png: pngData, svg: svgText };
      }),
    );
    setBatch(items);
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="space-y-2">
        <label htmlFor="qr-input" className="block">
          <span className="text-sm">Text</span>
          <input
            id="qr-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded p-1 text-black"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="qr-error" className="flex items-center gap-1 text-sm">
            Error
            <select
              id="qr-error"
              value={level}
              onChange={(e) => setLevel(e.target.value as ErrorLevel)}
              className="rounded p-1 text-black"
            >
              {errorLevels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="qr-invert" className="flex items-center gap-1 text-sm">
            <input
              id="qr-invert"
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
            />
            Invert
          </label>
          <button
            type="button"
            onClick={downloadPng}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            PNG
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            SVG
          </button>
        </div>
        {png && <img src={png} alt="QR preview" className="h-48 w-48 bg-white" />}
      </div>
      <div className="space-y-2">
        <label htmlFor="qr-csv" className="block">
          <span className="text-sm">Batch CSV (text,name)</span>
          <textarea
            id="qr-csv"
            rows={4}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            className="w-full rounded p-1 text-black"
          />
        </label>
        <button
          type="button"
          onClick={generateBatch}
          className="px-2 py-1 bg-green-600 rounded"
        >
          Generate Batch
        </button>
        {batch.length > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-3">
            {batch.map((item) => (
              <div key={item.name} className="flex flex-col items-center space-y-1">
                <img src={item.png} alt={item.name} className="w-32 h-32 bg-white" />
                <div className="text-center text-xs break-all">{item.name}</div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => downloadDataUrl(item.png, `${item.name}.png`)}
                    className="px-1 py-0.5 text-xs bg-blue-600 rounded"
                  >
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSvgText(item.svg, `${item.name}.svg`)}
                    className="px-1 py-0.5 text-xs bg-blue-600 rounded"
                  >
                    SVG
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRGenerator;

