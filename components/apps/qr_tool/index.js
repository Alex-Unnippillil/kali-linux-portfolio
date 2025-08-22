import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const generate = () => {
    if (!text) return;
    QRCode.toCanvas(canvasRef.current, text, { width: 256 }, (err) => {
      if (err) console.error(err);
    });
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      setDecodedText(result.data);
    } catch (err) {
      setDecodedText('No QR code found');
    }
  };

  const startCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.start();
      return;
    }
    scannerRef.current = new QrScanner(
      videoRef.current,
      (result) => setDecodedText(result.data),
      { returnDetailedScanResult: true }
    );
    scannerRef.current.start();
  };

  const stopCamera = () => {
    scannerRef.current?.stop();
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="mb-6">
        <h2 className="text-lg mb-2">Generate QR Code</h2>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
          placeholder="Enter text"
        />
        <div className="flex space-x-2 mb-2">
          <button onClick={generate} className="px-4 py-2 bg-blue-600 rounded">
            Generate
          </button>
          <button onClick={download} className="px-4 py-2 bg-green-600 rounded">
            Download
          </button>
        </div>
        <canvas ref={canvasRef} className="bg-white" />
      </div>

      <div>
        <h2 className="text-lg mb-2">Scan QR Code</h2>
        <input type="file" accept="image/*" onChange={handleFile} className="mb-2" />
        <div className="flex space-x-2 mb-2">
          <button onClick={startCamera} className="px-4 py-2 bg-blue-600 rounded">
            Start Camera
          </button>
          <button onClick={stopCamera} className="px-4 py-2 bg-red-600 rounded">
            Stop Camera
          </button>
        </div>
        <video ref={videoRef} className="w-64 h-64 bg-black" />
        {decodedText && (
          <p className="mt-2 break-all">Decoded: {decodedText}</p>
        )}
      </div>
    </div>
  );
};

export default QRTool;

export const displayQrTool = () => {
  return <QRTool />;
};

