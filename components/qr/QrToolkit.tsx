'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import Tabs from '../Tabs';
import FormError from '../ui/FormError';
import { clearScans, loadScans, saveScans } from '../../utils/qrStorage';

type QRCodeModule = typeof import('qrcode');

type TabId = (typeof tabs)[number]['id'];

type ScannerControls = { stop?: () => void } | undefined;

const tabs = [
  { id: 'text', label: 'Text' },
  { id: 'url', label: 'URL' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'vcard', label: 'vCard' },
] as const;

let qrModulePromise: Promise<QRCodeModule> | null = null;
const loadQrModule = () => {
  if (!qrModulePromise) {
    qrModulePromise = import('qrcode');
  }
  return qrModulePromise;
};

let scannerModulePromise:
  | Promise<[
      typeof import('@zxing/browser'),
      typeof import('@zxing/library'),
    ]>
  | null = null;
const loadScannerModules = () => {
  if (!scannerModulePromise) {
    scannerModulePromise = Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
  }
  return scannerModulePromise;
};

const useWifiPayload = (
  wifiType: string,
  ssid: string,
  wifiPassword: string,
) =>
  useMemo(
    () => `WIFI:T:${wifiType};S:${ssid};P:${wifiPassword};;`,
    [wifiType, ssid, wifiPassword],
  );

const QrToolkit: React.FC = () => {
  const [active, setActive] = useState<TabId>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiType, setWifiType] = useState('WPA');
  const [vName, setVName] = useState('');
  const [vOrg, setVOrg] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [qrPng, setQrPng] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [fileName, setFileName] = useState('qr');
  const [scanResult, setScanResult] = useState('');
  const [batch, setBatch] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const wifiPayload = useWifiPayload(wifiType, ssid, wifiPassword);

  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<unknown>(null);
  const controlsRef = useRef<ScannerControls>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  const resetOutput = () => {
    setQrPng('');
    setQrSvg('');
    setFileName('qr');
  };

  const generateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    let data = '';
    let name = 'qr';

    switch (active) {
      case 'text':
        data = text;
        name = 'text';
        break;
      case 'url':
        data = url;
        name = 'url';
        break;
      case 'wifi':
        data = wifiPayload;
        name = 'wifi';
        break;
      case 'vcard': {
        const parts = vName.trim().split(' ');
        const first = parts.shift() || '';
        const last = parts.pop() || '';
        const middle = parts.join(' ');
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${last};${first};${middle};;`,
          `FN:${vName}`,
        ];
        if (vOrg) lines.push(`ORG:${vOrg}`);
        if (vPhone) lines.push(`TEL;TYPE=CELL:${vPhone}`);
        if (vEmail) lines.push(`EMAIL:${vEmail}`);
        lines.push('END:VCARD');
        data = lines.join('\n');
        name = 'vcard';
        break;
      }
      default:
        break;
    }

    if (!data) {
      setError('Please fill in required fields');
      resetOutput();
      return;
    }

    setIsGenerating(true);
    try {
      const QRCode = await loadQrModule();
      const [png, svg] = await Promise.all([
        QRCode.toDataURL(data),
        QRCode.toString(data, { type: 'svg' }),
      ]);
      setQrPng(png);
      setQrSvg(svg);
      setFileName(name);
      setError('');
    } catch {
      setError('Failed to generate QR code');
      resetOutput();
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPng = () => {
    if (!qrPng) return;
    const a = document.createElement('a');
    a.href = qrPng;
    a.download = `${fileName}.png`;
    a.click();
  };

  const downloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const videoEl = videoRef.current;
    let cancelled = false;

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }

        if ('BarcodeDetector' in window) {
          const detector = new (window as typeof window & {
            BarcodeDetector: new (init: { formats: string[] }) => {
              detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          }).BarcodeDetector({ formats: ['qr_code'] });

          const tick = async () => {
            if (cancelled || !videoEl) return;
            try {
              const codes = await detector.detect(videoEl);
              if (codes?.[0]?.rawValue) {
                setScanResult(codes[0].rawValue);
                setBatch((prev) => [...prev, codes[0].rawValue]);
              }
            } catch {
              // ignore scan failures so the loop continues
            }
            requestAnimationFrame(tick);
          };
          tick();
          return;
        }

        const [browser, library] = await loadScannerModules();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const reader = new browser.BrowserQRCodeReader();
        codeReaderRef.current = reader;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoEl!,
          (result, err) => {
            if (result) {
              const text = result.getText();
              setScanResult(text);
              setBatch((prev) => [...prev, text]);
            }
            if (err && !(err instanceof library.NotFoundException)) {
              setError('Failed to read QR code');
            }
          },
        );
        controlsRef.current = controls;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Camera access was denied');
        } else {
          setError('Could not start camera');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      controlsRef.current?.stop?.();
      const reader = codeReaderRef.current as { reset?: () => void } | null;
      reader?.reset?.();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    loadScans().then((saved) => {
      setBatch(saved);
    });
  }, []);

  useEffect(() => {
    void saveScans(batch);
  }, [batch]);

  const exportCsv = () => {
    if (!batch.length) return;
    const header = 'data\n';
    const csv =
      header + batch.map((s) => `"${s.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-scans.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearBatch = async () => {
    setBatch([]);
    await clearScans();
  };

  const copyScanResult = () => {
    if (scanResult) {
      navigator.clipboard?.writeText(scanResult).catch(() => {});
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="w-full max-w-md">
        <Tabs
          tabs={tabs}
          active={active}
          onChange={setActive}
          className="mb-4 justify-center"
        />
        {active === 'text' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm" htmlFor="qr-text">
              Text
            </label>
            <input
              id="qr-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded border p-2"
              aria-label="QR text content"
            />
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </form>
        )}
        {active === 'url' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm" htmlFor="qr-url">
              URL
            </label>
            <input
              id="qr-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded border p-2"
              aria-label="QR URL"
            />
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </form>
        )}
        {active === 'wifi' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm" htmlFor="qr-wifi-ssid">
              SSID
              <input
                id="qr-wifi-ssid"
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Wi-Fi SSID"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-wifi-password">
              Password
              <input
                id="qr-wifi-password"
                type="text"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Wi-Fi password"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-wifi-encryption">
              Encryption
              <select
                id="qr-wifi-encryption"
                value={wifiType}
                onChange={(e) => setWifiType(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Wi-Fi encryption"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </form>
        )}
        {active === 'vcard' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm" htmlFor="qr-vcard-name">
              Full Name
              <input
                id="qr-vcard-name"
                type="text"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Contact full name"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-org">
              Organization
              <input
                id="qr-vcard-org"
                type="text"
                value={vOrg}
                onChange={(e) => setVOrg(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Contact organization"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-phone">
              Phone
              <input
                id="qr-vcard-phone"
                type="tel"
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Contact phone"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-email">
              Email
              <input
                id="qr-vcard-email"
                type="email"
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                className="mt-1 w-full rounded border p-2"
                aria-label="Contact email"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </form>
        )}
      </div>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-white shadow-lg">
          <h2 className="text-lg font-semibold">Generated Code</h2>
          {error && <FormError>{error}</FormError>}
          {qrPng ? (
            <div className="flex flex-col items-center gap-3">
              <Image
                src={qrPng}
                alt="Generated QR code"
                width={192}
                height={192}
                className="rounded-lg border border-white/10 bg-black p-2 shadow"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={downloadPng}
                  className="rounded bg-blue-600 px-3 py-1 text-sm"
                  type="button"
                >
                  Download PNG
                </button>
                <button
                  onClick={downloadSvg}
                  className="rounded bg-blue-600 px-3 py-1 text-sm"
                  type="button"
                >
                  Download SVG
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/70">
              Enter content to generate a QR code preview.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-white shadow-lg">
          <h2 className="text-lg font-semibold">Live Scanner</h2>
          <video
            ref={videoRef}
            aria-label="QR scanner preview"
            className="h-48 w-full rounded border border-white/10 bg-black object-cover"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyScanResult}
              className="rounded bg-blue-600 px-3 py-1 text-sm disabled:opacity-60"
              disabled={!scanResult}
            >
              Copy Result
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded bg-blue-600 px-3 py-1 text-sm disabled:opacity-60"
              disabled={!batch.length}
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={clearBatch}
              className="rounded bg-slate-700 px-3 py-1 text-sm disabled:opacity-60"
              disabled={!batch.length}
            >
              Clear History
            </button>
          </div>
          {scanResult ? (
            <p className="break-all rounded bg-black/50 p-2 font-mono text-sm">
              {scanResult}
            </p>
          ) : (
            <p className="text-sm text-white/70">
              Align a QR code with the camera to decode it instantly.
            </p>
          )}
        </section>
      </div>

      {batch.length > 0 && (
        <section className="w-full max-w-4xl space-y-2 rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-white shadow-lg">
          <h2 className="text-lg font-semibold">Scan History</h2>
          <ul className="grid gap-2">
            {batch.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded bg-black/40 p-2 font-mono text-sm">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default QrToolkit;
