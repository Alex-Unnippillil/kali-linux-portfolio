import React, { useEffect, useRef, useState } from 'react';
import { decodeImageData } from './utils';

const isSecure = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const Scan = () => {
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const scan = () => {
    if (paused || !videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = decodeImageData(imageData);
    if (code) {
      setDecodedText(code);
    }
    animationRef.current = requestAnimationFrame(scan);
  };

  const startCamera = async () => {
    if (!isSecure()) {
      setMessage('Camera requires HTTPS or localhost');
      return;
    }
    try {
      setMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMessage('Place the QR code within the square');
      setPaused(false);
      scan();
    } catch (err) {
      setMessage('Camera permission denied or unavailable');
    }
  };

  const pause = () => {
    setPaused(true);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const resume = () => {
    if (!paused) return;
    setPaused(false);
    scan();
  };

  const stop = () => {
    pause();
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setMessage('');
  };

  useEffect(() => () => stop(), []);

  return (
    <div>
      <h2 className="text-lg mb-2">Scan QR Code</h2>
      <div className="flex space-x-2 mb-2">
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Start camera for scanning"
        >
          Start
        </button>
        <button
          onClick={pause}
          disabled={paused}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded text-white disabled:opacity-50"
          aria-label="Pause scanning"
        >
          Pause
        </button>
        <button
          onClick={resume}
          disabled={!paused}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white disabled:opacity-50"
          aria-label="Resume scanning"
        >
          Resume
        </button>
        <button
          onClick={stop}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded text-white"
          aria-label="Stop camera"
        >
          Stop
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
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scan;
