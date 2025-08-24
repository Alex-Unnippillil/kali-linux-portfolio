import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

const QRTool = () => {
  const MAX_TEXT_LENGTH = 1000;

  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [size, setSize] = useState(256);
  const [svgData, setSvgData] = useState('');
  const [error, setError] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [logoSrc, setLogoSrc] = useState(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const debounceRef = useRef(null);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setSvgData('');
  };

  const generate = useCallback(async () => {
    if (!text) {
      clearCanvas();
      return;
    }
    try {
      await QRCode.toCanvas(canvasRef.current, text, {
        width: size,
        errorCorrectionLevel: errorCorrection,
        color: { dark: fgColor, light: bgColor },
      });

      if (logoSrc) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current.getContext('2d');
            const logoSize = size * 0.2;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            ctx.drawImage(img, x, y, logoSize, logoSize);
            resolve();
          };
          img.src = logoSrc;
        });
      }

      let svg = await QRCode.toString(text, {
        type: 'svg',
        width: size,
        errorCorrectionLevel: errorCorrection,
        color: { dark: fgColor, light: bgColor },
      });

      if (logoSrc) {
        const logoSize = size * 0.2;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        svg = svg.replace(
          '</svg>',
          `<image href="${logoSrc}" x="${x}" y="${y}" height="${logoSize}" width="${logoSize}"/></svg>`
        );
      }

      setSvgData(svg);
    } catch (err) {
      console.error(err);
    }
  }, [text, size, errorCorrection, fgColor, bgColor, logoSrc]);

  const downloadPng = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const downloadSvg = () => {
    if (!svgData) return;
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = 'qr.svg';
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setLogoSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // Attempt to decode using a canvas for better compatibility
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const ctx = offCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const result = await QrScanner.scanImage(offCanvas, {
        returnDetailedScanResult: true,
      });
      setDecodedText(result.data);
    } catch (err) {
      try {
        const result = await QrScanner.scanImage(file, {
          returnDetailedScanResult: true,
        });
        setDecodedText(result.data);
      } catch {
        setDecodedText('No QR code found');
      }
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

  const copyDecoded = async () => {
    if (!decodedText) return;
    try {
      await navigator.clipboard?.writeText(decodedText);
    } catch (_) {
      // ignore
    }
  };

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (text.length > MAX_TEXT_LENGTH) {
      setError(`Text exceeds ${MAX_TEXT_LENGTH} characters`);
      clearCanvas();
      return;
    }
    setError('');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generate();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [text, errorCorrection, size, fgColor, bgColor, logoSrc, generate]);

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
        <select
          value={errorCorrection}
          onChange={(e) => setErrorCorrection(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
        >
          <option value="L">L - 7% redundancy</option>
          <option value="M">M - 15% redundancy</option>
          <option value="Q">Q - 25% redundancy</option>
          <option value="H">H - 30% redundancy</option>
        </select>
        <div className="mb-2">
          <label className="block mb-1">Size: {size}px</label>
          <input
            type="range"
            min="64"
            max="1024"
            step="32"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
        <div className="flex space-x-4 mb-2">
          <div>
            <label htmlFor="fgColor" className="block text-sm">
              Foreground
            </label>
            <input
              id="fgColor"
              aria-label="Foreground"
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bgColor" className="block text-sm">
              Background
            </label>
            <input
              id="bgColor"
              aria-label="Background"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="logoInput" className="block text-sm">
              Logo
            </label>
            <input
              id="logoInput"
              aria-label="Logo file"
              type="file"
              accept="image/*"
              onChange={handleLogo}
            />
          </div>
        </div>
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <div className="flex space-x-2 mb-2">
          <button
            onClick={downloadPng}
            className="px-4 py-2 bg-green-600 rounded"
          >
            Download PNG
          </button>
          <button
            onClick={downloadSvg}
            className="px-4 py-2 bg-green-600 rounded"
          >
            Download SVG
          </button>
        </div>
        <canvas ref={canvasRef} className="bg-white" />
      </div>

      <div>
        <h2 className="text-lg mb-2">Scan QR Code</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="mb-2"
          aria-label="QR file"
        />
        <div className="flex space-x-2 mb-2">
          <button
            onClick={startCamera}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Start Camera
          </button>
          <button onClick={stopCamera} className="px-4 py-2 bg-red-600 rounded">
            Stop Camera
          </button>
        </div>
        <video ref={videoRef} className="w-64 h-64 bg-black" />
        {decodedText && (
          <div className="mt-2 break-all flex items-center space-x-2">
            <p className="flex-1">Decoded: {decodedText}</p>
            <button
              onClick={copyDecoded}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRTool;

export const displayQrTool = () => {
  return <QRTool />;
};
