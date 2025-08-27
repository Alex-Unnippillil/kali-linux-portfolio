import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

const errorLevels = {
  L: { label: 'Low', value: 1, percent: 7 },
  M: { label: 'Medium', value: 2, percent: 15 },
  Q: { label: 'Quartile', value: 3, percent: 25 },
  H: { label: 'High', value: 4, percent: 30 },
};

const cornerStyles = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Dot' },
];

const getLuminance = (hex) => {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};

const getContrast = (a, b) => {
  const l1 = getLuminance(a);
  const l2 = getLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const isValidUrl = (str) => {
  try {
    // eslint-disable-next-line no-new
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [cornerStyle, setCornerStyle] = useState('square');
  const [errorLevel, setErrorLevel] = useState('M');
  const [size, setSize] = useState(256);
  const [contrastMsg, setContrastMsg] = useState('');
  const [contrastOk, setContrastOk] = useState(true);

  const generateRef = useRef(null);
  const qrRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const timeoutRef = useRef(null);
  const workerRef = useRef(null);
  const fileInputRef = useRef(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    qrRef.current = new QRCodeStyling({ width: 256, height: 256, type: 'canvas' });
    qrRef.current.append(generateRef.current);
  }, []);

  useEffect(() => {
    const ratio = getContrast(darkColor, lightColor);
    const ok = ratio >= 4.5;
    setContrastOk(ok);
    setContrastMsg(`Contrast ratio: ${ratio.toFixed(2)}${ok ? '' : ' (needs ≥ 4.5)'}`);
  }, [darkColor, lightColor]);

  const generate = () => {
    if (!text || !contrastOk) return;
    qrRef.current.update({
      data: text,
      width: size,
      height: size,
      qrOptions: { errorCorrectionLevel: errorLevel },
      dotsOptions: { color: darkColor },
      backgroundOptions: { color: lightColor },
      cornersSquareOptions: { type: cornerStyle, color: darkColor },
    });
  };

  const download = (ext) => {
    qrRef.current?.download({ name: 'qr', extension: ext });
  };

  const initWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./scan.worker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => {
        setDecodedText(e.data || 'No QR code found');
      };
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    initWorker();
    const img = new Image();
    img.onload = () => {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      workerRef.current.postMessage({
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
      });
    };
    img.onerror = () => setDecodedText('Could not load image');
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
      workerRef.current.postMessage({
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
      });
    }
    if (prefersReducedMotion.current) {
      timeoutRef.current = setTimeout(scan, 1000);
    } else {
      animationRef.current = requestAnimationFrame(scan);
    }
  };

  const startCamera = async () => {
    const allow = window.confirm(
      'This tool uses your camera to scan QR codes. The video never leaves your device. Continue?'
    );
    if (!allow) {
      setMessage('Camera access cancelled. Upload an image instead.');
      fileInputRef.current?.focus();
      return;
    }
    try {
      initWorker();
      setMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMessage('Place the QR code within the square');
      scan();
    } catch (err) {
      setMessage('Camera permission denied or unavailable. Upload an image instead.');
      fileInputRef.current?.focus();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setMessage('');
  };

  useEffect(() => () => stopCamera(), []);

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
        <div className="flex flex-wrap gap-2 mb-2">
          <label className="flex items-center space-x-2">
            <span>Foreground</span>
            <input
              type="color"
              value={darkColor}
              onChange={(e) => setDarkColor(e.target.value)}
              aria-label="Select foreground color"
            />
          </label>
          <label className="flex items-center space-x-2">
            <span>Background</span>
            <input
              type="color"
              value={lightColor}
              onChange={(e) => setLightColor(e.target.value)}
              aria-label="Select background color"
            />
          </label>
          <label className="flex items-center space-x-2">
            <span>Corners</span>
            <select
              value={cornerStyle}
              onChange={(e) => setCornerStyle(e.target.value)}
              className="text-black p-1 rounded"
              aria-label="Select corner style"
            >
              {cornerStyles.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center space-x-2">
            <span>EC Level</span>
            <select
              value={errorLevel}
              onChange={(e) => setErrorLevel(e.target.value)}
              className="text-black p-1 rounded"
              aria-label="Select error correction level"
            >
              {Object.keys(errorLevels).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center space-x-2">
            <span>Size</span>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value, 10))}
              aria-label="Select size"
            />
            <span className="text-sm">{size}px</span>
          </label>
        </div>
        <p className="text-sm" aria-live="polite">
          {contrastMsg}
        </p>
        <p className="text-sm" aria-live="polite">
          Error correction strength: {errorLevels[errorLevel].label} (
          {errorLevels[errorLevel].percent}% )
        </p>
        <div className="flex space-x-2 mb-2 mt-2">
          <button
            onClick={generate}
            disabled={!contrastOk || !text}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-white"
            aria-label="Generate QR code"
          >
            Generate
          </button>
          <button
            onClick={() => download('png')}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
            aria-label="Download PNG"
          >
            PNG
          </button>
          <button
            onClick={() => download('svg')}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
            aria-label="Download SVG"
          >
            SVG
          </button>
        </div>
        <div
          ref={generateRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="bg-white"
          aria-label="Generated QR code"
        />
      </div>

      <div>
        <h2 className="text-lg mb-2">Scan QR Code</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="mb-2"
          aria-label="Upload image to scan"
          ref={fileInputRef}
        />
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
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            aria-label="Camera preview"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-green-500" />
          </div>
        </div>
        {message && (
          <p className="mt-2" aria-live="polite" role="status">
            {message}
          </p>
        )}
        {decodedText && decodedText !== 'No QR code found' && decodedText !== 'Could not load image' ? (
          <div
            className="mt-2 flex items-center gap-2 break-all"
            aria-live="polite"
            role="status"
          >
            <span>Decoded: {decodedText}</span>
            <button
              onClick={() => navigator.clipboard.writeText(decodedText)}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              aria-label="Copy decoded text"
            >
              Copy
            </button>
            <span
              className={`px-2 py-1 text-xs rounded ${
                isValidUrl(decodedText) ? 'bg-green-700' : 'bg-red-700'
              }`}
              aria-label={isValidUrl(decodedText) ? 'Valid URL' : 'Invalid URL'}
            >
              {isValidUrl(decodedText) ? 'Valid URL' : 'Invalid URL'}
            </span>
          </div>
        ) : (
          decodedText && (
            <p className="mt-2 break-all" aria-live="polite" role="status">
              {decodedText}
            </p>
          )
        )}
        <canvas ref={scanCanvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default QRTool;

