import React, { useEffect, useRef, useState } from 'react';
import { logEvent } from '../../../utils/ga';

const QRToolComponent = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const generateCanvasRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const generate = async () => {
    if (!text) return;
    const QRCode = await import('qrcode');
    QRCode.toCanvas(generateCanvasRef.current, text, { width: 256 }, (err) => {
      if (err) console.error(err);
    });
    logEvent('app_action', { id: 'qr_tool', action: 'generate' });
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = generateCanvasRef.current.toDataURL('image/png');
    link.click();
    logEvent('app_action', { id: 'qr_tool', action: 'download' });
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = await import('jsqr');
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      setDecodedText(code ? code.data : 'No QR code found');
    };
    img.onerror = () => setDecodedText('Could not load image');
    img.src = URL.createObjectURL(file);
    logEvent('app_action', { id: 'qr_tool', action: 'upload' });
  };

  const scan = async () => {
    if (videoRef.current && scanCanvasRef.current) {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsQR = await import('jsqr');
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setDecodedText(code.data);
      }
    }
    animationRef.current = requestAnimationFrame(scan);
  };

  const startCamera = async () => {
    try {
      setMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMessage('Place the QR code within the square');
      scan();
      logEvent('app_action', { id: 'qr_tool', action: 'start_camera' });
    } catch (err) {
      setMessage('Camera permission denied or unavailable');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setMessage('');
    logEvent('app_action', { id: 'qr_tool', action: 'stop_camera' });
  };

  useEffect(() => {
    logEvent('app_open', { id: 'qr_tool' });
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div
      className="h-full w-full p-4 bg-gray-900 text-white overflow-auto"
      role="application"
      aria-label="QR Tool"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          window.history.back();
        }
      }}
    >
      <div className="mb-6">
        <h2 className="text-lg mb-2">Generate QR Code</h2>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
          placeholder="Enter text"
          aria-label="Text to encode"
        />
        <div className="flex space-x-2 mb-2">
          <button
            onClick={generate}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
            aria-label="Generate QR code"
          >
            Generate
          </button>
          <button
            onClick={download}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
            aria-label="Download QR code"
          >
            Download
          </button>
        </div>
        <canvas ref={generateCanvasRef} className="bg-white w-full h-full" />
      </div>

      <div>
        <h2 className="text-lg mb-2">Scan QR Code</h2>
        <input type="file" accept="image/*" onChange={handleFile} className="mb-2" aria-label="Upload image to scan" />
        <div className="flex space-x-2 mb-2">
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
            aria-label="Start camera for scanning"
          >
            Start Camera
          </button>
          <button
            onClick={stopCamera}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white"
            aria-label="Stop camera"
          >
            Stop Camera
          </button>
        </div>
        <div className="relative w-64 h-64 bg-black">
          <video ref={videoRef} className="w-full h-full object-cover" aria-label="Camera preview" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-green-500" />
          </div>
        </div>
        {message && <p className="mt-2">{message}</p>}
        {decodedText && (
          <p className="mt-2 break-all">Decoded: {decodedText}</p>
        )}
        <canvas ref={scanCanvasRef} className="hidden" />
      </div>
    </div>
  );
};

import { ErrorBoundary } from '../../ErrorBoundary';

export default function QRTool() {
  return (
    <ErrorBoundary>
      <QRToolComponent />
    </ErrorBoundary>
  );
}

export const displayQrTool = () => <QRTool />;
