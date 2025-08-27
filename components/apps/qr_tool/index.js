import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

const QRTool = () => {
  const [text, setText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [canDownload, setCanDownload] = useState(false);
  const generateCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  const generate = () => {
    if (!text) return;
    QRCode.toCanvas(generateCanvasRef.current, text, { width: 256 }, (err) => {
      if (err) console.error(err);
      else setCanDownload(true);
    });
  };

  const download = () => {
    if (!canDownload) return;
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
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      QrScanner.scanImage(canvas)
        .then((result) => setDecodedText(result.data || result))
        .catch(() => setDecodedText('No QR code found'));
    };
    img.onerror = () => setDecodedText('Could not load image');
    img.src = URL.createObjectURL(file);
  };
  const startCamera = async () => {
    try {
      setMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      qrScannerRef.current = new QrScanner(videoRef.current, (result) => {
        setDecodedText(result.data);
      });
      await qrScannerRef.current.start();
      setMessage('Place the QR code within the square');
    } catch (err) {
      setMessage('Camera permission denied or unavailable');
    }
  };

  const stopCamera = () => {
    qrScannerRef.current?.stop();
    qrScannerRef.current?.destroy();
    qrScannerRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setMessage('');
  };

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        const vids = devices.filter((d) => d.kind === 'videoinput');
        setCameras(vids);
        if (vids[0]) setSelectedCamera(vids[0].deviceId);
      })
      .catch(() => {});
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
          {canDownload && (
            <button
              onClick={download}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
              aria-label="Download QR code"
            >
              Download
            </button>
          )}
        </div>
        <canvas ref={generateCanvasRef} className="bg-white w-full h-full" />

      </div>

      <div>
        <h2 className="text-lg mb-2">Scan QR Code</h2>
        <input type="file" accept="image/*" onChange={handleFile} className="mb-2" aria-label="Upload image to scan" />
        {cameras.length > 0 && (
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="mb-2 p-2 rounded text-black"
            aria-label="Select camera"
          >
            {cameras.map((cam, i) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
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
        {decodedText && <p className="mt-2 break-all">Decoded: {decodedText}</p>}
      </div>
    </div>
  );
};

export default QRTool;

