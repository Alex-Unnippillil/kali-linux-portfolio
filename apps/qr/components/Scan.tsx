import React, { useCallback, useEffect, useState } from 'react';

interface Props {
  onResult: (text: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const Scan: React.FC<Props> = ({ onResult }) => {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) {
        setError('Drop a valid image file.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Limit is 5 MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setError('');
      try {
        if ('BarcodeDetector' in window) {
          const img = new Image();
          img.src = url;
          await img.decode();
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code'],
          });
          const codes = await detector.detect(img);
          if (codes[0]) onResult(codes[0].rawValue);
        } else {
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const reader = new BrowserQRCodeReader();
          const res = await reader.decodeFromImageUrl(url);
          onResult(res.getText());
        }
      } catch {
        setError('No QR code found');
      }
    },
    [onResult],
  );

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="w-full h-full relative flex items-center justify-center border-2 border-dashed border-gray-500 text-gray-400"
    >
      {preview ? (
        <img src={preview} alt="Dropped" className="max-w-full max-h-full" />
      ) : (
        <p>Drop image</p>
      )}
      {/* corner anchors */}
      <svg
        className="w-6 h-6 absolute top-0 left-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 9V3h6" />
      </svg>
      <svg
        className="w-6 h-6 absolute top-0 right-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 9V3h-6" />
      </svg>
      <svg
        className="w-6 h-6 absolute bottom-0 left-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 15v6h6" />
      </svg>
      <svg
        className="w-6 h-6 absolute bottom-0 right-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15v6h-6" />
      </svg>
      {error && (
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default Scan;
