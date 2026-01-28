"use client";

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import Tabs from '../../components/Tabs';
import FormError from '../../components/ui/FormError';
import { clearScans, loadScans, saveScans } from '../../utils/qrStorage';

const tabs = [
  { id: 'text', label: 'Text' },
  { id: 'url', label: 'URL' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'vcard', label: 'vCard' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const QRPage: React.FC = () => {
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastScanRef = useRef<string | null>(null);

  const generateQr = async (e: React.FormEvent) => {
    e.preventDefault();
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
        data = `WIFI:T:${wifiType};S:${ssid};P:${wifiPassword};;`;
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
    }
    if (!data) {
      setError('Please fill in required fields');
      setQrPng('');
      setQrSvg('');
      return;
    }
    try {
      const png = await QRCode.toDataURL(data);
      const svg = await QRCode.toString(data, { type: 'svg' });
      setQrPng(png);
      setQrSvg(svg);
      setFileName(name);
      setError('');
    } catch {
      setError('Failed to generate QR code');
      setQrPng('');
      setQrSvg('');
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
    loadScans().then(setBatch);
    const startScanner = async () => {
      if (!navigator.mediaDevices) {
        setError('Camera API not supported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }
        const scan = () => {
          if (!videoEl) return;
          if (videoEl.readyState < 2) {
            animationRef.current = requestAnimationFrame(scan);
            return;
          }
          const width = videoEl.videoWidth;
          const height = videoEl.videoHeight;
          if (!width || !height) {
            animationRef.current = requestAnimationFrame(scan);
            return;
          }
          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height);
            if (code?.data && code.data !== lastScanRef.current) {
              lastScanRef.current = code.data;
              setScanResult(code.data);
              setBatch((prev) => [...prev, code.data]);
            }
          }
          animationRef.current = requestAnimationFrame(scan);
        };
        animationRef.current = requestAnimationFrame(scan);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Camera access was denied');
        } else {
          setError('Could not start camera');
        }
      }
    };

    startScanner();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoEl && videoEl.srcObject) {
        const tracks = (videoEl.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    saveScans(batch);
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
            />
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white"
            >
              Generate
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
            />
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white"
            >
              Generate
            </button>
          </form>
        )}
        {active === 'wifi' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm">
              SSID
              <input
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="text"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm">
              Encryption
              <select
                value={wifiType}
                onChange={(e) => setWifiType(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">None</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white"
            >
              Generate
            </button>
          </form>
        )}
        {active === 'vcard' && (
          <form onSubmit={generateQr} className="space-y-2">
            <label className="block text-sm">
              Full Name
              <input
                type="text"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm">
              Organization
              <input
                type="text"
                value={vOrg}
                onChange={(e) => setVOrg(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm">
              Phone
              <input
                type="tel"
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                type="email"
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white"
            >
              Generate
            </button>
          </form>
        )}
        {error && <FormError className="mt-2">{error}</FormError>}
        {qrPng && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Image
              src={qrPng}
              alt="Generated QR code"
              width={192}
              height={192}
              sizes="192px"
              className="h-48 w-48"
            />
            <div className="flex gap-2">
              <button
                onClick={downloadPng}
                className="rounded bg-blue-600 p-2 text-white"
              >
                Download PNG
              </button>
              <button
                onClick={downloadSvg}
                className="rounded bg-green-600 p-2 text-white"
              >
                Download SVG
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="w-full max-w-md">
        <video ref={videoRef} className="h-48 w-full rounded border" />
        {scanResult && (
          <p className="mt-2 text-center text-sm">Decoded: {scanResult}</p>
        )}
        {batch.length > 0 && (
          <>
            <ul className="mt-2 max-h-40 overflow-y-auto rounded border p-2 text-sm">
              {batch.map((code, i) => (
                <li key={i}>{code}</li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button
                onClick={exportCsv}
                className="flex-1 rounded bg-green-600 p-2 text-white"
              >
                Export CSV
              </button>
              <button
                onClick={clearBatch}
                className="flex-1 rounded bg-red-600 p-2 text-white"
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QRPage;
