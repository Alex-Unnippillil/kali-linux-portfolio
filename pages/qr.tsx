import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { BrowserQRCodeReader, NotFoundException } from '@zxing/library';
import FormError from '../components/ui/FormError';

const QRPage: React.FC = () => {
  const [text, setText] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserQRCodeReader>();

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
    const startScanner = async () => {
      if (!navigator.mediaDevices) {
        setError('Camera API not supported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const codeReader = new BrowserQRCodeReader();
        codeReaderRef.current = codeReader;
        codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err) => {
            if (result) {
              setScanResult(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              setError('Failed to read QR code');
            }
          },
        );
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
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, []);

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
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">
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
      </div>
    </div>
  );
};

export default QRPage;

