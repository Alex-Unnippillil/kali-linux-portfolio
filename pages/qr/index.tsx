import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
import FormError from '../../components/ui/FormError';
import { clearScans, loadScans, saveScans } from '../../utils/qrStorage';

const QRPage: React.FC = () => {
  const [text, setText] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [batch, setBatch] = useState<string[]>([]);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);

  const generateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = await QRCode.toDataURL(text);
      setQrUrl(url);
      setError('');
    } catch {
      setError('Failed to generate QR code');
    }
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
              setError('Failed to read QR code');
            }
          });
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
      <form onSubmit={generateQr} className="w-full max-w-md">
        <label className="mb-2 block text-sm font-medium" htmlFor="qr-text">
          Text to encode
        </label>
        <input
          id="qr-text"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mb-4 w-full rounded border p-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-blue-600 p-2 text-white"
        >
          Generate QR
        </button>
      </form>
      {error && <FormError className="mt-0">{error}</FormError>}
      {qrUrl && (
        <img src={qrUrl} alt="Generated QR code" className="h-48 w-48" />
      )}
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
