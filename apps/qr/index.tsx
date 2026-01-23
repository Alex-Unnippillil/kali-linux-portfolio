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
    <div className="flex h-full flex-col gap-6 overflow-auto bg-[color:var(--kali-bg)] p-4 text-kali-text">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('generate')}
          className={`rounded border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
            mode === 'generate'
              ? 'border-transparent bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)] hover:bg-kali-primary/90'
              : 'border-kali-border/60 bg-[var(--kali-panel)] text-kali-text/80 hover:border-kali-border hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-blue)_12%)] hover:text-kali-text'
          }`}
          aria-pressed={mode === 'generate'}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`rounded border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
            mode === 'scan'
              ? 'border-transparent bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)] hover:bg-kali-primary/90'
              : 'border-kali-border/60 bg-[var(--kali-panel)] text-kali-text/80 hover:border-kali-border hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-blue)_12%)] hover:text-kali-text'
          }`}
          aria-pressed={mode === 'scan'}
        >
          Scan
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-start">
        <section className="flex flex-col gap-4 rounded-lg border border-kali-border/60 bg-[var(--kali-panel)] p-4 shadow-inner">
          <div className="flex flex-col items-center gap-4">
            <div className="aspect-square w-full max-w-xs rounded bg-white p-2">
              {mode === 'generate' ? (
                <canvas
                  ref={canvasRef}
                  aria-label="Generated QR code preview"
                  className="h-full w-full"
                />
              ) : (
                <Scan onResult={setScanResult} />
              )}
            </div>
            <div className="w-full space-y-2 text-left">
              {mode === 'generate' ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Preview & actions</p>
                    <p className="text-xs text-kali-text/70">
                      Download or share this code, then open your phone camera to scan it.
                    </p>
                    <p className="text-xs text-kali-text/70">
                      Download or share this code, then open your phone camera
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadPng}
                      className="flex items-center gap-2 rounded bg-kali-primary px-3 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:bg-kali-primary/40 disabled:text-kali-inverse/70"
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
                      className="flex items-center gap-2 rounded bg-kali-primary px-3 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:bg-kali-primary/40 disabled:text-kali-inverse/70"
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
                      className="flex items-center gap-2 rounded border border-kali-border/60 bg-[var(--kali-panel)] px-3 py-1 text-sm font-medium text-kali-text transition-colors hover:border-kali-border hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-blue)_12%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,transparent)] disabled:text-kali-text/50"
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
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Scanning tips</p>
                  <p className="text-xs text-kali-text/70">
                    Allow camera access and keep the QR code centered in the live preview to decode it instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {mode === 'generate' && (
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
            className="w-full space-y-6 rounded-lg border border-kali-border/60 bg-[var(--kali-panel)] p-4 shadow"
          >
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Payload</h2>
                <p className="mt-1 text-xs text-kali-text/70">
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
                  <p className="mt-1 text-xs text-kali-text/70">
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
                  <p className="mt-1 text-xs text-kali-text/70">
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
                      aria-label="Upload logo image"
                      className="rounded bg-white p-1 text-black"
                    />
                  </label>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="w-fit rounded bg-kali-muted px-3 py-1 text-sm text-kali-text transition-colors hover:bg-kali-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
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
                className="rounded bg-kali-muted px-3 py-1 text-sm text-kali-text transition-colors hover:bg-kali-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={copyPayload}
                className="rounded bg-kali-primary px-3 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:bg-kali-primary/40 disabled:text-kali-inverse/70"
                disabled={!payload}
              >
                Copy payload
              </button>
            </div>
            <p className="flex-1 text-xs text-kali-text/70 md:text-right">
              {payload ? (
                <span className="break-all">Current payload: {payload}</span>
              ) : (
                'Enter content to generate a QR code preview.'
              )}
            </p>
          </div>
        </form>
      )}

      </div>

      {lastScan && (
        <div className="space-y-2">
          <p className="text-xs text-kali-text/70">Last scan</p>
          <p className="break-all text-sm">{lastScan}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastScan)}
            className="rounded bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
          >
            Copy
          </button>
        </div>
      )}

      {lastGen && (
        <div className="space-y-2">
          <p className="text-xs text-kali-text/70">Last generation</p>
          <p className="break-all text-sm">{lastGen}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastGen)}
            className="rounded bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
