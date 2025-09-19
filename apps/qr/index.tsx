'use client';

import { useRef, useState, useCallback, useEffect, type ChangeEvent } from 'react';
import QRCode from 'qrcode';
import Presets from './components/Presets';
import Scan from './components/Scan';
import {
  loadLastGeneration,
  loadLastScan,
  saveLastGeneration,
  saveLastScan,
} from '../../utils/qrStorage';

export default function QR() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payload, setPayload] = useState('');
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [size, setSize] = useState(256);
  const [margin, setMargin] = useState(1);
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [logo, setLogo] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState('');
  const [lastGen, setLastGen] = useState('');
  const [lastScan, setLastScan] = useState('');

  useEffect(() => {
    setLastGen(loadLastGeneration());
    setLastScan(loadLastScan());
  }, []);

  useEffect(() => {
    if (payload) {
      saveLastGeneration(payload);
      setLastGen(payload);
    }
  }, [payload]);

  useEffect(() => {
    if (scanResult) {
      saveLastScan(scanResult);
      setLastScan(scanResult);
    }
  }, [scanResult]);

  const handleLogo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const downloadPng = useCallback(() => {
    if (!payload || !canvasRef.current) return;
    const data = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = data;
    link.download = `qr-${size}.png`;
    link.click();
  }, [payload, size]);

  const downloadSvg = useCallback(async () => {
    if (!payload) return;
    let svg = await QRCode.toString(payload, {
      margin,
      width: size,
      type: 'svg',
      errorCorrectionLevel: ecc,
    });
    if (logo) {
      const imgSize = size * 0.2;
      const pos = (size - imgSize) / 2;
      const logoTag = `<image href="${logo}" x="${pos}" y="${pos}" width="${imgSize}" height="${imgSize}"/>`;
      svg = svg.replace('</svg>', `${logoTag}</svg>`);
    }
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${size}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [payload, size, margin, ecc, logo]);

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('generate')}
          className={`px-2 py-1 rounded ${
            mode === 'generate' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`px-2 py-1 rounded ${
            mode === 'scan' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Scan
        </button>
      </div>

      <div className="w-64 aspect-square mx-auto">
        {mode === 'generate' ? (
          <canvas ref={canvasRef} className="w-full h-full bg-white" />
        ) : (
          <Scan onResult={setScanResult} />
        )}
      </div>

      {mode === 'generate' && (
        <>
          <Presets
            canvasRef={canvasRef}
            onPayloadChange={setPayload}
            size={size}
            margin={margin}
            ecc={ecc}
            logo={logo}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="qr-size" className="text-sm flex items-center gap-1">
              Size
              <select
                id="qr-size"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
                className="ml-1 rounded p-1 text-black"
              >
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
              </select>
            </label>
            <label htmlFor="qr-margin" className="text-sm flex items-center gap-1">
              Margin
              <select
                id="qr-margin"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="ml-1 rounded p-1 text-black"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label htmlFor="qr-ecc" className="text-sm flex items-center gap-1">
              ECC
              <select
                id="qr-ecc"
                value={ecc}
                onChange={(e) => setEcc(e.target.value as typeof ecc)}
                className="ml-1 rounded p-1 text-black"
              >
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H">H</option>
              </select>
            </label>
            <label htmlFor="qr-logo" className="text-sm flex items-center gap-1">
              Logo
              <input
                id="qr-logo"
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="ml-1 rounded p-1 text-black"
              />
            </label>
            {logo && (
              <button
                type="button"
                onClick={() => setLogo(null)}
                className="px-2 py-1 bg-gray-600 rounded text-sm"
              >
                Clear Logo
              </button>
            )}
            <button
              type="button"
              onClick={downloadPng}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download PNG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download SVG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
          </div>
        </>
      )}

      {lastScan && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last scan</p>
          <p className="break-all text-sm">{lastScan}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastScan)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}

      {lastGen && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last generation</p>
          <p className="break-all text-sm">{lastGen}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastGen)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

