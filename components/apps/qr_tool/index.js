import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [format, setFormat] = useState('png');
  const [svgData, setSvgData] = useState('');
  const generateCanvasRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const generate = () => {
    if (!text) return;
    QRCode.toCanvas(generateCanvasRef.current, text, { width: 256 }, (err) => {
      if (err) console.error(err);
    });
    QRCode.toString(text, { type: 'svg', width: 256 }, (err, data) => {
      if (err) console.error(err);
      else setSvgData(data);
    });
  };

  const download = () => {
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = 'qr.png';
      link.href = generateCanvasRef.current.toDataURL('image/png');
      link.click();
    } else {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'qr.svg';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const copy = async () => {
    try {
      if (format === 'png') {
        generateCanvasRef.current.toBlob(async (blob) => {
          if (blob) await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        });
      } else {
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        await navigator.clipboard.write([new ClipboardItem({ 'image/svg+xml': blob })]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    setDecodedText('');
    setScanError('');
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) setDecodedText(code.data);
      else setScanError('No QR code found');
    };
    img.onerror = () => setScanError('Could not load image');
    img.src = URL.createObjectURL(file);
  };

  const scan = () => {
    if (videoRef.current && scanCanvasRef.current) {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
  };

  useEffect(() => {
    return () => {
      stopCamera();
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
            onClick={copy}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded text-white"
            aria-label="Copy QR code to clipboard"
          >
            Copy
          </button>
          <button
            onClick={download}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
            aria-label="Download QR code"
          >
            Download
          </button>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="p-2 rounded text-black"
            aria-label="Select download format"
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
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
        {scanError && <p className="mt-2 text-red-400">{scanError}</p>}
        {decodedText && (
          <p className="mt-2 break-all">Decoded: {decodedText}</p>
        )}
        <canvas ref={scanCanvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default QRTool;

