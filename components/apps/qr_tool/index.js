import React, { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';

const errorLevels = { L: 'Low', M: 'Medium', Q: 'Quartile', H: 'High' };

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
  const [tab, setTab] = useState('generate');

  // generate state
  const [text, setText] = useState('');
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [errorLevel, setErrorLevel] = useState('M');
  const [size, setSize] = useState(256);
  const [genError, setGenError] = useState('');
  const canvasRef = useRef(null);

  // scan state
  const videoRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const workerRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [streaming, setStreaming] = useState(false);

  const generate = async () => {
    if (!text) {
      setGenError('Enter text to encode');
      return;
    }
    if (text.length > 1024) {
      setGenError('Text too long (max 1024 characters)');
      return;
    }
    const ratio = getContrast(darkColor, lightColor);
    if (ratio < 4.5) {
      setGenError(`Insufficient contrast ratio ${ratio.toFixed(2)} (needs ≥ 4.5)`);
      return;
    }
    try {
      await QRCode.toCanvas(canvasRef.current, text, {
        errorCorrectionLevel: errorLevel,
        color: { dark: darkColor, light: lightColor },
        width: size,
      });
      setGenError('');
    } catch (err) {
      setGenError('Failed to generate QR code');
    }
  };

  const initWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./scan.worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        setDecodedText(e.data || 'No QR code found');
      };
    }
  };

  const prepareCameras = async () => {
    try {
      setScanMessage('Requesting camera permission...');
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter((d) => d.kind === 'videoinput');
      tempStream.getTracks().forEach((t) => t.stop());
      if (cams.length === 0) {
        setScanMessage('No camera devices found. Upload an image instead.');
        return false;
      }
      setDevices(cams);
      setDeviceId(cams[0].deviceId);
      setScanMessage('Select a camera and press Start');
      return true;
    } catch {
      setScanMessage('Camera permission denied or unavailable. Upload an image instead.');
      return false;
    }
  };

  const scan = () => {
    const canvas = scanCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    workerRef.current.postMessage({ data: imageData.data, width: imageData.width, height: imageData.height });
    if (streaming) requestAnimationFrame(scan);
  };

  const startCamera = async () => {
    if (!devices.length) {
      const ok = await prepareCameras();
      if (!ok) return;
      if (devices.length === 0) return; // state not yet updated
    }
    if (!deviceId) {
      setScanMessage('Select a camera first.');
      return;
    }
    try {
      initWorker();
      setScanMessage('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStreaming(true);
      setScanMessage('Place the QR code within the square');
      scan();
    } catch {
      setScanMessage('Unable to access selected camera.');
    }
  };

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleFile = (e) => {
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
      workerRef.current.postMessage({ data: imageData.data, width: imageData.width, height: imageData.height });
    };
    img.onerror = () => setScanMessage('Could not load image');
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="flex mb-4 space-x-4">
        <button
          type="button"
          onClick={() => setTab('generate')}
          className={`px-4 py-2 rounded ${tab === 'generate' ? 'bg-blue-700' : 'bg-gray-700'}`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setTab('scan')}
          className={`px-4 py-2 rounded ${tab === 'scan' ? 'bg-blue-700' : 'bg-gray-700'}`}
        >
          Scan
        </button>
      </div>
      {tab === 'generate' ? (
        <div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 mb-2 rounded text-black"
            placeholder="Enter text"
            aria-label="Text to encode"
            maxLength={1024}
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
          <div className="mb-2">
            <button
              type="button"
              onClick={generate}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded"
              aria-label="Generate QR code"
            >
              Generate
            </button>
          </div>
          {genError && (
            <p className="text-sm text-red-500" aria-live="polite">
              {genError}
            </p>
          )}
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            aria-label="Generated QR code"
            className="bg-white"
          />
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="mb-2"
            aria-label="Upload image to scan"
          />
          <div className="mb-2 flex flex-wrap gap-2 items-center">
            {devices.length > 0 && (
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="text-black p-1 rounded"
                aria-label="Select camera"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded"
              aria-label="Start camera for scanning"
            >
              Start
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
              aria-label="Stop camera"
            >
              Stop
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
          {scanMessage && (
            <p className="mt-2" aria-live="polite" role="status">
              {scanMessage}
            </p>
          )}
          {decodedText && (
            <div
              className="mt-2 flex items-center gap-2 break-all"
              aria-live="polite"
              role="status"
            >
              <span>Decoded: {decodedText}</span>
              <button
                type="button"
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
          )}
          <canvas ref={scanCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default QRTool;

