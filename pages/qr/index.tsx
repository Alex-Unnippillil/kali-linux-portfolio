"use client";

import Image from 'next/image';
import Head from 'next/head';
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

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
    loadScans().then(setBatch);
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    let active = true;
    let animationFrameId = 0;
    const startScanner = async () => {
      if (!navigator.mediaDevices) {
        setError('Camera API not supported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: 'environment' },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }
        const devicesList = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devicesList.filter((device) => device.kind === 'videoinput');
        setDevices(videoInputs);
        if (!selectedDeviceId && videoInputs.length) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        } else if (
          selectedDeviceId &&
          !videoInputs.some((device) => device.deviceId === selectedDeviceId)
        ) {
          setSelectedDeviceId(videoInputs[0]?.deviceId ?? '');
        }

        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scan = async () => {
            if (!active) return;
            try {
              if (videoRef.current) {
                const codes = await detector.detect(videoRef.current);
                if (codes[0]) {
                  const text = codes[0].rawValue;
                  setScanResult(text);
                  setBatch((prev) => [...prev, text]);
                }
              }
            } catch {
              /* ignore */
            }
            animationFrameId = requestAnimationFrame(scan);
          };
          scan();
        } else {
          const jsQR = (await import('jsqr')).default;
          const scanFrame = async () => {
            if (!active) return;
            try {
              if (videoEl && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, canvas.width, canvas.height);
                  if (code) {
                    setScanResult(code.data);
                    setBatch((prev) => [...prev, code.data]);
                  }
                }
              }
            } catch {
              /* ignore frame errors */
            }
            animationFrameId = requestAnimationFrame(scanFrame);
          };
          scanFrame();
        }
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
      active = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoEl && videoEl.srcObject) {
        const tracks = (videoEl.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
    };
  }, [selectedDeviceId]);

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
    <>
      <Head>
        <link rel="canonical" href="https://unnippillil.com/qr" />
      </Head>
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
              aria-label="QR text"
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
              aria-label="QR URL"
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
            <label className="block text-sm" htmlFor="qr-ssid">
              SSID
              <input
                id="qr-ssid"
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                aria-label="Wi-Fi SSID"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-wifi-password">
              Password
              <input
                id="qr-wifi-password"
                type="text"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                aria-label="Wi-Fi password"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-wifi-type">
              Encryption
              <select
                id="qr-wifi-type"
                value={wifiType}
                onChange={(e) => setWifiType(e.target.value)}
                aria-label="Wi-Fi encryption"
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
            <label className="block text-sm" htmlFor="qr-vcard-name">
              Full Name
              <input
                id="qr-vcard-name"
                type="text"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                aria-label="vCard full name"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-org">
              Organization
              <input
                id="qr-vcard-org"
                type="text"
                value={vOrg}
                onChange={(e) => setVOrg(e.target.value)}
                aria-label="vCard organization"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-phone">
              Phone
              <input
                id="qr-vcard-phone"
                type="tel"
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                aria-label="vCard phone number"
                className="mt-1 w-full rounded border p-2"
              />
            </label>
            <label className="block text-sm" htmlFor="qr-vcard-email">
              Email
              <input
                id="qr-vcard-email"
                type="email"
                value={vEmail}
                onChange={(e) => setVEmail(e.target.value)}
                aria-label="vCard email address"
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
        <div className="mt-4 flex flex-col items-center gap-2">
          {qrPng ? (
            <Image
              src={qrPng}
              alt="Generated QR code"
              width={192}
              height={192}
              sizes="192px"
              className="h-48 w-48"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded border border-dashed text-xs text-gray-500">
              Generate a QR code to preview it here.
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={downloadPng}
              className="rounded bg-blue-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-blue-600/50"
              disabled={!qrPng}
            >
              Download QR image
            </button>
            <button
              onClick={downloadSvg}
              className="rounded bg-green-600 p-2 text-white disabled:cursor-not-allowed disabled:bg-green-600/50"
              disabled={!qrSvg}
            >
              Download SVG
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-md">
        <label className="mb-2 block text-sm" htmlFor="qr-camera">
          Camera
          <select
            id="qr-camera"
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            aria-label="Camera selector"
            className="mt-1 w-full rounded border p-2"
          >
            {devices.length === 0 && (
              <option value="">Default camera</option>
            )}
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        <video
          ref={videoRef}
          className="h-48 w-full rounded border"
          aria-label="QR scanner preview"
        />
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
    </>
  );
};

export default QRPage;
