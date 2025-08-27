import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const generateCanvasRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const generate = () => {
    if (!text) return;
    QRCode.toCanvas(
      generateCanvasRef.current,
      text,
      { width: 256, color: { dark: fgColor, light: bgColor } },
      (err) => {
        if (err) {
          console.error(err);
        } else if (logo) {
          const ctx = generateCanvasRef.current.getContext('2d');
          const img = new Image();
          img.onload = () => {
            const size = generateCanvasRef.current.width * 0.2;
            const x =
              (generateCanvasRef.current.width - size) / 2;
            const y =
              (generateCanvasRef.current.height - size) / 2;
            ctx.drawImage(img, x, y, size, size);
          };
          img.src = logo;
        }
      },
    );
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = generateCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
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
      setDecodedText(code ? code.data : 'No QR code found');
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
          <label className="flex items-center space-x-1">
            <span>FG</span>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="color-picker"
              aria-label="Foreground color"
            />
          </label>
          <label className="flex items-center space-x-1">
            <span>BG</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="color-picker"
              aria-label="Background color"
            />
          </label>
        </div>
        <div className="mb-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleLogo}
            aria-label="Logo image"
          />
          {logoPreview && (
            <div className="logo-preview mt-2">
              <img src={logoPreview} alt="Logo preview" />
            </div>
          )}
        </div>
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

export default QRTool;

export const displayQrTool = () => {
  return <QRTool />;
};

