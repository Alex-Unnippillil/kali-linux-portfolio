'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  ChangeEvent,
  FormEvent,
} from 'react';
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
  const [formResetKey, setFormResetKey] = useState(0);

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

  const resetForm = useCallback(() => {
    setPayload('');
    setSize(256);
    setMargin(1);
    setEcc('M');
    setLogo(null);
    setFormResetKey((value) => value + 1);
  }, []);

  const copyPayload = useCallback(async () => {
    if (!payload) return;
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      // ignore clipboard failures
    }
  }, [payload]);

  const shareQr = useCallback(async () => {
    if (!payload) return;
    const shareData: ShareData = { title: 'QR Code', text: payload };
    try {
      const nav = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        clipboard?: Clipboard;
      };
      if (typeof nav.share === 'function') {
        await nav.share(shareData);
      } else if (nav.clipboard) {
        await nav.clipboard.writeText(payload);
      }
    } catch {
      // ignore share failures
    }
  }, [payload]);

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

      <div className="space-y-3">
        <div className="w-64 aspect-square mx-auto">
          {mode === 'generate' ? (
            <canvas ref={canvasRef} className="w-full h-full bg-white" />
          ) : (
            <Scan onResult={setScanResult} />
          )}
        </div>
        <div className="mx-auto w-full max-w-sm space-y-2 rounded-lg border border-gray-700 bg-gray-800/70 p-3">
          {mode === 'generate' ? (
            <>
              <div>
                <p className="text-sm font-semibold">Preview toolbar</p>
                <p className="text-xs text-gray-300">
                  Download or share this code, then open your phone camera to scan it directly from the screen.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadPng}
                  className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Download PNG"
                  disabled={!payload}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3v12" />
                    <path d="M8 11l4 4 4-4" />
                    <path d="M4 19h16" />
                  </svg>
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={downloadSvg}
                  className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Download SVG"
                  disabled={!payload}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3v12" />
                    <path d="M8 11l4 4 4-4" />
                    <path d="M4 19h16" />
                  </svg>
                  <span>Download SVG</span>
                </button>
                <button
                  type="button"
                  onClick={shareQr}
                  className="flex items-center gap-2 rounded bg-gray-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Share QR code"
                  disabled={!payload}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Scanning tips</p>
              <p className="text-xs text-gray-300">
                Allow camera access and center the QR code in the frame to decode it instantly.
              </p>
            </>
          )}
        </div>
      </div>

      {mode === 'generate' && (
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
          className="space-y-6 rounded-lg border border-gray-700 bg-gray-800/40 p-4"
        >
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Payload</h2>
              <p className="mt-1 text-xs text-gray-300">
                Use the presets to structure text, URLs, or Wi-Fi credentials before generating the QR code.
              </p>
            </div>
            <Presets
              key={formResetKey}
              canvasRef={canvasRef}
              onPayloadChange={setPayload}
              size={size}
              margin={margin}
              ecc={ecc}
              logo={logo}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Rendering options</h3>
                <p className="mt-1 text-xs text-gray-300">
                  Adjust the output size, margin, and error correction level to match your use case.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <label htmlFor="qr-size" className="flex flex-col gap-1">
                  <span className="font-medium">Size</span>
                  <select
                    id="qr-size"
                    value={size}
                    onChange={(e) => setSize(parseInt(e.target.value, 10))}
                    className="rounded p-1 text-black"
                  >
                    <option value={128}>128 px</option>
                    <option value={256}>256 px</option>
                    <option value={512}>512 px</option>
                  </select>
                </label>
                <label htmlFor="qr-margin" className="flex flex-col gap-1">
                  <span className="font-medium">Margin</span>
                  <select
                    id="qr-margin"
                    value={margin}
                    onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                    className="rounded p-1 text-black"
                  >
                    <option value={0}>0 modules</option>
                    <option value={1}>1 module</option>
                    <option value={2}>2 modules</option>
                    <option value={4}>4 modules</option>
                  </select>
                </label>
                <label htmlFor="qr-ecc" className="flex flex-col gap-1">
                  <span className="font-medium">Error correction</span>
                  <select
                    id="qr-ecc"
                    value={ecc}
                    onChange={(e) => setEcc(e.target.value as typeof ecc)}
                    className="rounded p-1 text-black"
                  >
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Branding</h3>
                <p className="mt-1 text-xs text-gray-300">
                  Add a center logo (about 20% of the canvas) to personalize your QR code.
                </p>
              </div>
              <div className="space-y-3 text-sm">
                <label htmlFor="qr-logo" className="flex flex-col gap-1">
                  <span className="font-medium">Logo</span>
                  <input
                    id="qr-logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogo}
                    className="rounded bg-white p-1 text-black"
                  />
                </label>
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="w-fit rounded bg-gray-600 px-3 py-1 text-sm"
                  >
                    Clear logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded bg-gray-600 px-3 py-1 text-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={copyPayload}
                className="rounded bg-blue-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!payload}
              >
                Copy payload
              </button>
            </div>
            <p className="flex-1 text-xs text-gray-300 md:text-right">
              {payload ? (
                <span className="break-all">Current payload: {payload}</span>
              ) : (
                'Enter content to generate a QR code preview.'
              )}
            </p>
          </div>
        </form>
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

