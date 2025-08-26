import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [ecLevel, setEcLevel] = useState('L');
  const [batchText, setBatchText] = useState('');
  const [batchCodes, setBatchCodes] = useState([]);
  const [decodedList, setDecodedList] = useState([]);
  const generateCanvasRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const generate = async () => {
    if (!text) return;
    try {
      await QRCode.toCanvas(generateCanvasRef.current, text, {
        width: 256,
        errorCorrectionLevel: ecLevel,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const download = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = generateCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleBatchFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBatchText(ev.target.result);
    reader.readAsText(file);
  };

  const generateBatch = async () => {
    if (!batchText.trim()) return;
    const items = batchText
      .split(/[\r\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const codes = [];
    for (const item of items) {
      const canvas = document.createElement('canvas');
      try {
        await QRCode.toCanvas(canvas, item, {
          width: 256,
          errorCorrectionLevel: ecLevel,
        });
        let url = '';
        try {
          url = canvas.toDataURL('image/png');
        } catch (e) {
          url = '';
        }
        codes.push({ text: item, url });
      } catch (err) {
        console.error(err);
      }
    }
    setBatchCodes(codes);
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
        setDecodedList((prev) =>
          prev.includes(code.data) ? prev : [...prev, code.data]
        );
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
        <select
          value={ecLevel}
          onChange={(e) => setEcLevel(e.target.value)}
          className="p-2 mb-2 rounded text-black"
          aria-label="Error correction level"
        >
          <option value="L">L</option>
          <option value="M">M</option>
          <option value="Q">Q</option>
          <option value="H">H</option>
        </select>
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

        <h3 className="text-md mt-4 mb-2">Batch Generate</h3>
        <textarea
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
          placeholder="Enter values separated by new lines or commas"
          aria-label="Batch text"
        />
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleBatchFile}
          className="mb-2"
          aria-label="Upload CSV or text file"
        />
        <button
          onClick={generateBatch}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
        >
          Generate Batch
        </button>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {batchCodes.map(({ text: t, url }, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <img
                src={url}
                alt={`QR code for ${t}`}
                className="w-32 h-32 bg-white"
              />
              <p className="mt-1 break-all text-xs">{t}</p>
            </div>
          ))}
        </div>

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
        {decodedList.length > 0 && (
          <div className="mt-2">
            <h3 className="mb-1">Captured Codes:</h3>
            <ul className="list-disc list-inside break-all">
              {decodedList.map((code, idx) => (
                <li key={idx}>{code}</li>
              ))}
            </ul>
          </div>
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

