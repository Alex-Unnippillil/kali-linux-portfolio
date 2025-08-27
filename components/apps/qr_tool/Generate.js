import React, { useRef, useState } from 'react';
import QRCode from 'qrcode';

const Generate = () => {
  const [text, setText] = useState('');
  const canvasRef = useRef(null);

  const handleGenerate = async () => {
    if (!text) return;
    try {
      await QRCode.toCanvas(canvasRef.current, text, { width: 256 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
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
          onClick={handleGenerate}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Generate QR code"
        >
          Generate
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-white"
          aria-label="Download QR code"
        >
          Download
        </button>
      </div>
      <canvas ref={canvasRef} className="bg-white w-full h-full" />
    </div>
  );
};

export default Generate;
