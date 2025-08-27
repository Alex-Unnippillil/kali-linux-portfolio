import React, { useEffect, useRef, useState } from 'react';


const errorLevels = {
  L: { label: 'Low', percent: 7 },
  M: { label: 'Medium', percent: 15 },
  Q: { label: 'Quartile', percent: 25 },
  H: { label: 'High', percent: 30 },
};

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

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');
  const [errorLevel, setErrorLevel] = useState('M');
  const [size, setSize] = useState(256);
  const [contrastMsg, setContrastMsg] = useState('');
  const [contrastOk, setContrastOk] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');

  const generateRef = useRef(null);
  const qrRef = useRef(null);
  const qrClassRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const timeoutRef = useRef(null);
  const workerRef = useRef(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    import('qrcodejs2').then((mod) => {
      qrClassRef.current = mod.default;
    });
  }, []);

  useEffect(() => {
    const ratio = getContrast(darkColor, lightColor);
    const ok = ratio >= 4.5;
    setContrastOk(ok);
    setContrastMsg(`Contrast ratio: ${ratio.toFixed(2)}${ok ? '' : ' (needs ≥ 4.5)'}`);
  }, [darkColor, lightColor]);

  const generate = () => {
    if (!text || !contrastOk || !qrClassRef.current) return;
    generateRef.current.innerHTML = '';
    qrRef.current = new qrClassRef.current(generateRef.current, {
      text,
      width: size,
      height: size,
      colorDark: darkColor,
      colorLight: lightColor,
      correctLevel: qrClassRef.current.CorrectLevel[errorLevel],
    });
  };

  const download = () => {
    const canvas = generateRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qr.png';
    link.click();
  };

  const copyDecoded = () => {
    if (!isValid || !decodedText) return;
    navigator.clipboard.writeText(decodedText).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  const initWorker = () => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./scan.worker.js', import.meta.url)
      );
      workerRef.current.onmessage = (e) => {
        const val = e.data;
        setDecodedText(val || 'No QR code found');
        setIsValid(!!val);
        setCopyMsg('');
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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setMessage('');
    setDecodedText('');
    setIsValid(false);
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
            <span>Size</span>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Select size"
            />
            <span className="w-12 text-right">{size}px</span>
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
            onClick={download}
            className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
            aria-label="Download QR code"
          >
            Download
          </button>
        </div>
        <div
          ref={generateRef}
          className="bg-white"
          style={{ width: size, height: size }}
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
          <p className="mt-2" aria-live="polite">
            {message}
          </p>
        )}
        {decodedText && (
          <div
            className="mt-2 break-all flex items-center space-x-2"
            aria-live="polite"
          >
            <span>Decoded: {decodedText}</span>
            {isValid && (
              <button
                onClick={copyDecoded}
                className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white"
                aria-label="Copy decoded text"
              >
                {copyMsg || 'Copy'}
              </button>
            )}
            <span aria-label={isValid ? 'Valid QR code' : 'Invalid QR code'}>
              {isValid ? '✅' : '❌'}
            </span>
          </div>
        )}
        <canvas ref={scanCanvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default QRTool;

