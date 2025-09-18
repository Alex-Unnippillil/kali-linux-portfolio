import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  onResult: (text: string) => void;
}

type ScanStatus = 'idle' | 'requesting' | 'scanning';

const Scan: React.FC<Props> = ({ onResult }) => {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    return Boolean(navigator.mediaDevices?.getUserMedia);
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const barcodeDetectorRef = useRef<any>();
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const objectUrlRef = useRef<string>();
  const scanningRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }
    setCameraAvailable(Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = undefined;
    }
  }, []);

  const clearPreview = useCallback(() => {
    revokePreviewUrl();
    setPreview('');
  }, [revokePreviewUrl]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;

    if (typeof cancelAnimationFrame === 'function' && animationRef.current !== undefined) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // ignore errors stopping the ZXing controls
      }
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore stop errors
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore pause failures
      }
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignore cleanup failures
      }
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const finishScan = useCallback(
    (value: string) => {
      setError('');
      onResult(value);
      setIsScanning(false);
    },
    [onResult],
  );

  const startBarcodeLoop = useCallback(() => {
    if (typeof window === 'undefined' || !(window as any).BarcodeDetector || typeof requestAnimationFrame !== 'function') {
      return false;
    }

    try {
      const detector =
        barcodeDetectorRef.current ||
        new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });
      barcodeDetectorRef.current = detector;

      const runDetection = async () => {
        if (!scanningRef.current) return;
        if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(runDetection);
          return;
        }

        try {
          const codes = await detector.detect(videoRef.current);
          const match = codes?.[0]?.rawValue;
          if (match) {
            finishScan(match);
            return;
          }
        } catch {
          // ignore frame detection errors
        }

        animationRef.current = requestAnimationFrame(runDetection);
      };

      animationRef.current = requestAnimationFrame(runDetection);
      return true;
    } catch {
      return false;
    }
  }, [finishScan]);

  const startZxingLoop = useCallback(async () => {
    if (!videoRef.current || !scanningRef.current) {
      return false;
    }

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (!scanningRef.current) {
        return false;
      }

      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          const text = result?.getText();
          if (text) {
            finishScan(text);
          }
        },
      );

      if (!scanningRef.current) {
        controls.stop();
        return false;
      }

      zxingControlsRef.current = controls;
      return true;
    } catch {
      if (scanningRef.current) {
        setError('Unable to start QR reader');
        setStatus('idle');
        setIsScanning(false);
      }
      return false;
    }
  }, [finishScan]);

  useEffect(() => {
    if (!isScanning) {
      setStatus('idle');
      stopCamera();
      return;
    }

    clearPreview();
    setError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('idle');
      setError('Camera access is not available in this browser');
      setIsScanning(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        scanningRef.current = true;

        if (videoRef.current) {
          try {
            videoRef.current.srcObject = stream;
          } catch {
            // ignore assignment errors
          }

          try {
            await videoRef.current.play();
          } catch {
            // ignore autoplay failures
          }
        }

        if (!scanningRef.current) {
          stopCamera();
          return;
        }

        setStatus('scanning');

        const barcodeStarted = startBarcodeLoop();
        if (!barcodeStarted) {
          const fallbackStarted = await startZxingLoop();
          if (!fallbackStarted && scanningRef.current) {
            setError('Unable to scan from camera feed');
            setStatus('idle');
            setIsScanning(false);
          }
        }
      } catch {
        if (!cancelled) {
          setStatus('idle');
          setError('Unable to access camera');
          setIsScanning(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [clearPreview, isScanning, startBarcodeLoop, startZxingLoop, stopCamera]);

  const processImageFile = useCallback(
    async (file: File) => {
      if (!file) {
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Unsupported file type');
        return;
      }

      setIsScanning(false);
      setStatus('idle');
      stopCamera();
      setError('');

      clearPreview();
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreview(url);

      try {
        if (typeof window !== 'undefined' && (window as any).BarcodeDetector) {
          try {
            const detector =
              barcodeDetectorRef.current ||
              new (window as any).BarcodeDetector({
                formats: ['qr_code'],
              });
            barcodeDetectorRef.current = detector;

            const img = new Image();
            img.src = url;
            await img.decode();
            const codes = await detector.detect(img);
            const match = codes?.[0]?.rawValue;
            if (match) {
              finishScan(match);
              return;
            }
          } catch {
            // fall back to ZXing
          }
        }

        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        const res = await reader.decodeFromImageUrl(url);
        finishScan(res.getText());
      } catch {
        setError('No QR code found');
      }
    },
    [clearPreview, finishScan, stopCamera],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) {
        return;
      }
      void processImageFile(file);
    },
    [processImageFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      void processImageFile(file);
      e.target.value = '';
    },
    [processImageFile],
  );

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'requesting':
        return 'Requesting camera access...';
      case 'scanning':
        return 'Scanning for QR codes...';
      default:
        return 'Camera idle';
    }
  }, [status]);

  return (
    <div className="flex h-full flex-col gap-4 text-gray-200">
      {cameraAvailable ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsScanning((prev) => !prev)}
            className="rounded border border-gray-600 px-3 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-pressed={isScanning}
          >
            {isScanning ? 'Stop camera' : 'Start camera'}
          </button>
          <span className="text-xs text-gray-400" aria-live="polite">
            {statusMessage}
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-400" aria-live="polite">
          Live camera scanning isn&apos;t available here. Upload an image below instead.
        </p>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded border-2 border-dashed border-gray-500 text-gray-400"
      >
        {isScanning ? (
          <video
            ref={videoRef}
            data-testid="qr-video"
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : preview ? (
          <img src={preview} alt="QR preview" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="px-4 text-center text-sm">Drop an image or start the camera to scan a QR code.</p>
        )}

        <svg
          className="pointer-events-none absolute top-0 left-0 h-6 w-6 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 9V3h6" />
        </svg>
        <svg
          className="pointer-events-none absolute top-0 right-0 h-6 w-6 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 9V3h-6" />
        </svg>
        <svg
          className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 15v6h6" />
        </svg>
        <svg
          className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 text-gray-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v6h-6" />
        </svg>

        {error && (
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-gray-900/70 px-2 py-1 text-xs text-red-500">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
        <label className="cursor-pointer rounded border border-gray-600 px-3 py-1 text-sm text-gray-200 hover:border-gray-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 focus-within:ring-offset-gray-900">
          <span>Upload image</span>
          <input type="file" accept="image/*" onChange={handleFileInput} className="sr-only" />
        </label>
        <p>Drop an image above to scan without camera access.</p>
      </div>
    </div>
  );
};

export default Scan;
