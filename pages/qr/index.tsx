"use client";

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState, useId } from 'react';
import QRCode from 'qrcode';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
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

type FieldName =
  | 'text'
  | 'url'
  | 'ssid'
  | 'wifiPassword'
  | 'vName'
  | 'vOrg'
  | 'vPhone'
  | 'vEmail';

type LabelField = FieldName | 'wifiType';

interface QRError {
  message: string;
  field?: FieldName;
}

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
  const [error, setError] = useState<QRError | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const idBase = useId();
  const { errorIds, labelIds } = useMemo(() => {
    const sanitizedBase = idBase.replace(/:/g, '');
    return {
      errorIds: {
        general: `qr-error-${sanitizedBase}-general`,
        text: `qr-error-${sanitizedBase}-text`,
        url: `qr-error-${sanitizedBase}-url`,
        ssid: `qr-error-${sanitizedBase}-ssid`,
        wifiPassword: `qr-error-${sanitizedBase}-wifi-password`,
        vName: `qr-error-${sanitizedBase}-vname`,
        vOrg: `qr-error-${sanitizedBase}-vorg`,
        vPhone: `qr-error-${sanitizedBase}-vphone`,
        vEmail: `qr-error-${sanitizedBase}-vemail`,
      } satisfies Record<'general' | FieldName, string>,
      labelIds: {
        text: `qr-label-${sanitizedBase}-text`,
        url: `qr-label-${sanitizedBase}-url`,
        ssid: `qr-label-${sanitizedBase}-ssid`,
        wifiPassword: `qr-label-${sanitizedBase}-wifi-password`,
        wifiType: `qr-label-${sanitizedBase}-wifi-type`,
        vName: `qr-label-${sanitizedBase}-vname`,
        vOrg: `qr-label-${sanitizedBase}-vorg`,
        vPhone: `qr-label-${sanitizedBase}-vphone`,
        vEmail: `qr-label-${sanitizedBase}-vemail`,
      } satisfies Record<LabelField, string>,
    };
  }, [idBase]);

  const generateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let data = '';
    let name = 'qr';
    switch (active) {
      case 'text':
        data = text.trim();
        if (!data) {
          setError({ field: 'text', message: 'Enter text to encode.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        name = 'text';
        break;
      case 'url':
        data = url.trim();
        if (!data) {
          setError({ field: 'url', message: 'Add a URL to encode.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        try {
          const parsedUrl = new URL(data);
          if (!parsedUrl.protocol || !parsedUrl.hostname) {
            throw new Error('Invalid URL');
          }
        } catch {
          setError({ field: 'url', message: 'Use a valid URL.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        name = 'url';
        break;
      case 'wifi':
        if (!ssid.trim()) {
          setError({ field: 'ssid', message: 'Enter the Wi-Fi network name.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        if (wifiType !== 'nopass' && !wifiPassword.trim()) {
          setError({ field: 'wifiPassword', message: 'Add the Wi-Fi password.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        data = `WIFI:T:${wifiType};S:${ssid.trim()};P:${
          wifiType === 'nopass' ? '' : wifiPassword.trim()
        };;`;
        name = 'wifi';
        break;
      case 'vcard': {
        const trimmedName = vName.trim();
        if (!trimmedName) {
          setError({ field: 'vName', message: 'Add the contact name.' });
          setQrPng('');
          setQrSvg('');
          return;
        }
        const parts = trimmedName.split(' ');
        const first = parts.shift() || '';
        const last = parts.pop() || '';
        const middle = parts.join(' ');
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${last};${first};${middle};;`,
          `FN:${trimmedName}`,
        ];
        if (vOrg) lines.push(`ORG:${vOrg.trim()}`);
        if (vPhone) lines.push(`TEL;TYPE=CELL:${vPhone.trim()}`);
        if (vEmail) {
          const trimmedEmail = vEmail.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedEmail)) {
            setError({ field: 'vEmail', message: 'Use a valid email address.' });
            setQrPng('');
            setQrSvg('');
            return;
          }
          lines.push(`EMAIL:${trimmedEmail}`);
        }
        lines.push('END:VCARD');
        data = lines.join('\n');
        name = 'vcard';
        break;
      }
    }
    try {
      const png = await QRCode.toDataURL(data);
      const svg = await QRCode.toString(data, { type: 'svg' });
      setQrPng(png);
      setQrSvg(svg);
      setFileName(name);
      setError(null);
    } catch {
      setError({ message: 'Could not generate the QR code.' });
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
        setError({ message: 'Camera API is not supported in this browser.' });
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
        const codeReader = new BrowserQRCodeReader();
        codeReaderRef.current = codeReader;
        if (videoEl) {
          codeReader.decodeFromVideoDevice(null, videoEl, (result, err) => {
            if (result) {
              const text = result.getText();
              setScanResult(text);
              setBatch((prev) => [...prev, text]);
            }
            if (err && !(err instanceof NotFoundException)) {
              setError({ message: 'Could not read the QR code.' });
            }
          });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError({ message: 'Camera access was denied.' });
        } else {
          setError({ message: 'Could not start the camera.' });
        }
      }
    };

    startScanner();

    return () => {
      codeReaderRef.current?.reset();
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
            <label
              className="block text-sm"
              htmlFor="qr-text"
              id={labelIds.text}
            >
              Text
            </label>
            <input
              id="qr-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'text' || undefined}
              aria-describedby={error?.field === 'text' ? errorIds.text : undefined}
              aria-labelledby={labelIds.text}
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
            <label
              className="block text-sm"
              htmlFor="qr-url"
              id={labelIds.url}
            >
              URL
            </label>
            <input
              id="qr-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'url' || undefined}
              aria-describedby={error?.field === 'url' ? errorIds.url : undefined}
              aria-labelledby={labelIds.url}
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
            <label
              className="block text-sm"
              htmlFor="qr-wifi-ssid"
              id={labelIds.ssid}
            >
              SSID
            </label>
            <input
              id="qr-wifi-ssid"
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'ssid' || undefined}
              aria-describedby={error?.field === 'ssid' ? errorIds.ssid : undefined}
              aria-labelledby={labelIds.ssid}
            />
            <label
              className="block text-sm"
              htmlFor="qr-wifi-password"
              id={labelIds.wifiPassword}
            >
              Password
            </label>
            <input
              id="qr-wifi-password"
              type="text"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'wifiPassword' || undefined}
              aria-describedby={
                error?.field === 'wifiPassword' ? errorIds.wifiPassword : undefined
              }
              aria-labelledby={labelIds.wifiPassword}
            />
            <label
              className="block text-sm"
              htmlFor="qr-wifi-type"
              id={labelIds.wifiType}
            >
              Encryption
            </label>
            <select
              id="qr-wifi-type"
              value={wifiType}
              onChange={(e) => setWifiType(e.target.value)}
              className="w-full rounded border p-2"
              aria-labelledby={labelIds.wifiType}
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None</option>
            </select>
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
            <label
              className="block text-sm"
              htmlFor="qr-vcard-name"
              id={labelIds.vName}
            >
              Full Name
            </label>
            <input
              id="qr-vcard-name"
              type="text"
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'vName' || undefined}
              aria-describedby={error?.field === 'vName' ? errorIds.vName : undefined}
              aria-labelledby={labelIds.vName}
            />
            <label
              className="block text-sm"
              htmlFor="qr-vcard-org"
              id={labelIds.vOrg}
            >
              Organization
            </label>
            <input
              id="qr-vcard-org"
              type="text"
              value={vOrg}
              onChange={(e) => setVOrg(e.target.value)}
              className="w-full rounded border p-2"
              aria-labelledby={labelIds.vOrg}
            />
            <label
              className="block text-sm"
              htmlFor="qr-vcard-phone"
              id={labelIds.vPhone}
            >
              Phone
            </label>
            <input
              id="qr-vcard-phone"
              type="tel"
              value={vPhone}
              onChange={(e) => setVPhone(e.target.value)}
              className="w-full rounded border p-2"
              aria-labelledby={labelIds.vPhone}
            />
            <label
              className="block text-sm"
              htmlFor="qr-vcard-email"
              id={labelIds.vEmail}
            >
              Email
            </label>
            <input
              id="qr-vcard-email"
              type="email"
              value={vEmail}
              onChange={(e) => setVEmail(e.target.value)}
              className="w-full rounded border p-2"
              aria-invalid={error?.field === 'vEmail' || undefined}
              aria-describedby={error?.field === 'vEmail' ? errorIds.vEmail : undefined}
              aria-labelledby={labelIds.vEmail}
            />
            <button
              type="submit"
              className="w-full rounded bg-blue-600 p-2 text-white"
            >
              Generate
            </button>
          </form>
        )}
        {error && (
          <FormError
            id={error.field ? errorIds[error.field] : errorIds.general}
            className="mt-2"
          >
            {error.message}
          </FormError>
        )}
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
        <video
          ref={videoRef}
          className="h-48 w-full rounded border"
          aria-label="Camera preview"
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
  );
};

export default QRPage;
