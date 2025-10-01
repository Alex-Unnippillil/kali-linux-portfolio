'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ImageSource = string | Blob;

type OrientationTransform = {
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
};

export interface ImageMetadataSummary {
  make?: string;
  model?: string;
  lens?: string;
  iso?: number;
  exposureTime?: string;
  fNumber?: number;
  focalLength?: number;
  takenAt?: string;
  orientation?: number;
}

export interface ImageViewerProps {
  source: ImageSource;
  alt?: string;
  className?: string;
  lazy?: boolean;
  showMetadataByDefault?: boolean;
  fallbackMessage?: string;
}

const RAW_EXTENSIONS = [
  '.cr2',
  '.cr3',
  '.nef',
  '.arw',
  '.dng',
  '.raf',
  '.rw2',
  '.orf',
  '.srw',
  '.pef',
];

const formatExposure = (value?: number): string | undefined => {
  if (!value || Number.isNaN(value)) return undefined;
  if (value >= 1) {
    return `${value.toFixed(2)}s`;
  }
  const denominator = Math.round(1 / value);
  return `1/${denominator}`;
};

const formatFocalLength = (value?: number): string | undefined => {
  if (!value || Number.isNaN(value)) return undefined;
  return `${value.toFixed(0)}mm`;
};

const formatFNumber = (value?: number): string | undefined => {
  if (!value || Number.isNaN(value)) return undefined;
  return `f/${value.toFixed(1).replace(/\.0$/, '')}`;
};

const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  if ('arrayBuffer' in blob) {
    return (blob as Blob & { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsArrayBuffer(blob);
  });
};

const detectRaw = (source: ImageSource): boolean => {
  if (typeof source === 'string') {
    const lower = source.toLowerCase();
    return RAW_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }
  const name = (source as File)?.name?.toLowerCase?.() ?? '';
  if (name) {
    return RAW_EXTENSIONS.some((ext) => name.endsWith(ext));
  }
  const type = source.type?.toLowerCase?.() ?? '';
  return type.includes('image/x-raw') || type.includes('image/raw') || type.includes('application/octet-stream');
};

const isWorkerSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return typeof window.Worker !== 'undefined';
};

const buildTransform = (orientation: OrientationTransform | null, zoom: number): React.CSSProperties => {
  const transforms: string[] = [];
  if (orientation?.rotate) transforms.push(`rotate(${orientation.rotate}deg)`);
  if (orientation?.scaleX) transforms.push(`scaleX(${orientation.scaleX})`);
  if (orientation?.scaleY) transforms.push(`scaleY(${orientation.scaleY})`);
  if (!transforms.length) transforms.push('rotate(0deg)');
  transforms.push(`scale(${zoom})`);
  return {
    transform: transforms.join(' '),
  };
};

const mapExifToMetadata = (input: Record<string, any> | undefined): Partial<ImageMetadataSummary> => {
  if (!input) return {};
  const make = input.Make ?? input.make;
  const model = input.Model ?? input.model;
  const lens = input.LensModel ?? input.lensModel ?? input.Lens ?? input.lens;
  const isoRaw = input.ISO ?? input.iso ?? input['ISO Speed Ratings'];
  const iso = Number.isFinite(Number(isoRaw)) ? Number(isoRaw) : undefined;
  const exposureTime = formatExposure(input.ExposureTime ?? input.exposureTime ?? input['Exposure Time']);
  const fNumberRaw = input.FNumber ?? input.fNumber ?? input['F Number'];
  const fNumberValue = Number.isFinite(Number(fNumberRaw)) ? Number(fNumberRaw) : undefined;
  const focalLengthRaw = input.FocalLength ?? input.focalLength ?? input['Focal Length'];
  const focalLengthValue = Number.isFinite(Number(focalLengthRaw)) ? Number(focalLengthRaw) : undefined;
  const takenAt = input.DateTimeOriginal ?? input.DateCreated ?? input.CreateDate ?? input['Date/Time Original'];
  const orientation = input.Orientation ?? input.orientation;
  return {
    make,
    model,
    lens,
    iso,
    exposureTime,
    fNumber: fNumberValue,
    focalLength: focalLengthValue,
    takenAt,
    orientation,
  };
};

const mergeMetadata = (
  base: Partial<ImageMetadataSummary>,
  next: Partial<ImageMetadataSummary>,
): Partial<ImageMetadataSummary> => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      if (value === undefined || value === null || value === '') return false;
      const existing = (base as Record<string, unknown>)[key];
      return existing === undefined || existing === null || existing === '';
    }),
  ),
});

const orientationFromRotation = (rotation: { deg: number; scaleX: number; scaleY: number } | null): OrientationTransform | null => {
  if (!rotation) return null;
  return {
    rotate: rotation.deg,
    scaleX: rotation.scaleX,
    scaleY: rotation.scaleY,
  };
};

const orientationFromExif = (orientation?: number): OrientationTransform | null => {
  switch (orientation) {
    case 2:
      return { scaleX: -1 };
    case 3:
      return { rotate: 180 };
    case 4:
      return { scaleY: -1 };
    case 5:
      return { rotate: 90, scaleX: -1 };
    case 6:
      return { rotate: 90 };
    case 7:
      return { rotate: 270, scaleX: -1 };
    case 8:
      return { rotate: 270 };
    default:
      return null;
  }
};

const ImageViewer: React.FC<ImageViewerProps> = ({
  source,
  alt = 'Image preview',
  className,
  lazy = true,
  showMetadataByDefault = false,
  fallbackMessage = 'RAW preview is unavailable in this environment. Download the file to inspect it.',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!lazy);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Partial<ImageMetadataSummary>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showMetadata, setShowMetadata] = useState(showMetadataByDefault);
  const rotationRef = useRef<OrientationTransform | null>(null);

  useEffect(() => {
    if (!lazy) return;
    const target = containerRef.current;
    if (!target) {
      setVisible(true);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [lazy]);

  const applyMetadata = useCallback((incoming: Partial<ImageMetadataSummary>) => {
    if (!incoming || Object.keys(incoming).length === 0) return;
    setMetadata((prev) => mergeMetadata(prev, incoming));
  }, []);

  const loadExif = useCallback(async (blob: Blob) => {
    try {
      const exifr = await import('exifr');
      const [tags, rotation] = await Promise.all([
        exifr.parse(blob, {
          mergeOutput: true,
          translateKeys: true,
          reviveValues: true,
        }),
        typeof exifr.rotation === 'function' ? exifr.rotation(blob) : Promise.resolve(null),
      ]);
      applyMetadata(mapExifToMetadata(tags));
      rotationRef.current = orientationFromRotation(rotation ?? null) ?? orientationFromExif(tags?.Orientation ?? tags?.orientation);
    } catch (ex) {
      console.warn('Unable to parse EXIF metadata', ex);
    }
  }, [applyMetadata]);

  const decodeRaw = useCallback(async (buffer: ArrayBuffer) => {
    if (!isWorkerSupported()) {
      throw new Error('Web Workers are required for RAW decoding');
    }
    try {
      const lib = await import('libraw-wasm');
      const Decoder = lib.default;
      const instance = new Decoder();
      await instance.open(new Uint8Array(buffer), {
        outputBps: 8,
        outputColor: 1,
        halfSize: false,
      });
      const rawMeta = await instance.metadata();
      if (rawMeta && typeof rawMeta === 'object') {
        applyMetadata(
          mapExifToMetadata({
            Make: rawMeta?.idata?.make,
            Model: rawMeta?.idata?.model,
            LensModel: rawMeta?.lens?.lens,
            ISO: rawMeta?.idata?.iso_speed,
            ExposureTime: rawMeta?.idata?.shutter,
            FNumber: rawMeta?.idata?.aperture,
            FocalLength: rawMeta?.lens?.focal,
            Orientation: rawMeta?.idata?.orientation,
          }),
        );
      }
      const rawImage = await instance.imageData();
      let pixelBuffer: Uint8Array | Uint8ClampedArray | null = null;
      let width: number | undefined;
      let height: number | undefined;

      if (rawImage && typeof rawImage === 'object' && 'data' in rawImage) {
        const data = (rawImage as { data?: unknown }).data as ArrayBufferView | ArrayBuffer | undefined;
        if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
          pixelBuffer = data;
        } else if (data instanceof Uint16Array) {
          const converted = new Uint8Array(data.length);
          for (let i = 0; i < data.length; i += 1) {
            converted[i] = data[i] >> 8;
          }
          pixelBuffer = converted;
        } else if (data && data instanceof ArrayBuffer) {
          pixelBuffer = new Uint8Array(data);
        }
        width = (rawImage as { width?: number }).width;
        height = (rawImage as { height?: number }).height;
      } else if (rawImage instanceof Uint8Array || rawImage instanceof Uint8ClampedArray) {
        pixelBuffer = rawImage;
      }

      const sizes = rawMeta?.sizes ?? rawMeta?.rawparams ?? rawMeta?.params;
      if (!width) width = sizes?.width ?? sizes?.iwidth ?? sizes?.raw_width;
      if (!height) height = sizes?.height ?? sizes?.iheight ?? sizes?.raw_height;

      if (!pixelBuffer || !width || !height) {
        throw new Error('Unsupported RAW payload');
      }

      let rgba: Uint8ClampedArray;
      if (pixelBuffer instanceof Uint8ClampedArray) {
        rgba = pixelBuffer;
      } else if (pixelBuffer.length === width * height * 4) {
        rgba = new Uint8ClampedArray(pixelBuffer.buffer.slice(0, width * height * 4));
      } else if (pixelBuffer.length === width * height * 3) {
        rgba = new Uint8ClampedArray(width * height * 4);
        for (let i = 0, j = 0; i < pixelBuffer.length; i += 3, j += 4) {
          rgba[j] = pixelBuffer[i];
          rgba[j + 1] = pixelBuffer[i + 1];
          rgba[j + 2] = pixelBuffer[i + 2];
          rgba[j + 3] = 255;
        }
      } else {
        throw new Error('Unexpected RAW channel layout');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not supported');
      }
      const imageData = new ImageData(rgba, width, height);
      context.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    } catch (error) {
      throw error instanceof Error ? error : new Error('RAW decoding failed');
    }
  }, [applyMetadata]);

  useEffect(() => {
    if (!visible) return;
    let isActive = true;
    let revokeUrl: string | null = null;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

    const load = async () => {
      setLoading(true);
      setError(null);
      rotationRef.current = null;
      try {
        let blob: Blob;
        let buffer: ArrayBuffer | null = null;
        let candidateUrl: string | null = null;
        if (typeof source === 'string') {
          const response = await fetch(source, { signal: controller?.signal });
          if (!response.ok) throw new Error('Failed to load image');
          blob = await response.blob();
          candidateUrl = source;
        } else {
          blob = source;
          candidateUrl = URL.createObjectURL(source);
          revokeUrl = candidateUrl;
        }

        buffer = await blobToArrayBuffer(blob);
        await loadExif(blob);

        if (detectRaw(source)) {
          try {
            const rawUrl = await decodeRaw(buffer);
            candidateUrl = rawUrl;
          } catch (rawError) {
            console.warn('RAW decoding failed', rawError);
            candidateUrl = null;
            setError(fallbackMessage);
          }
        }

        if (isActive) {
          setImageUrl(candidateUrl);
        }
      } catch (err) {
        if (!isActive) return;
        if ((err as { name?: string }).name === 'AbortError') return;
        console.error('Failed to load image', err);
        setError('Unable to load image.');
        setImageUrl(null);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
      if (controller) controller.abort();
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [decodeRaw, fallbackMessage, loadExif, source, visible]);

  const orientation = rotationRef.current ?? orientationFromExif(metadata.orientation);

  const transformStyle = useMemo(() => buildTransform(orientation, zoom), [orientation, zoom]);

  const toolbarId = useMemo(() => `image-viewer-toolbar-${Math.random().toString(36).slice(2)}`, []);
  const metadataId = useMemo(() => `image-viewer-meta-${Math.random().toString(36).slice(2)}`, []);

  const cameraDetails = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (metadata.make || metadata.model) {
      items.push({
        label: 'Camera',
        value: [metadata.make, metadata.model].filter(Boolean).join(' '),
      });
    }
    if (metadata.lens) items.push({ label: 'Lens', value: metadata.lens });
    if (typeof metadata.iso === 'number') items.push({ label: 'ISO', value: metadata.iso.toString() });
    if (metadata.exposureTime) items.push({ label: 'Shutter', value: metadata.exposureTime });
    if (metadata.fNumber) items.push({ label: 'Aperture', value: formatFNumber(metadata.fNumber) ?? '' });
    if (metadata.focalLength) items.push({ label: 'Focal Length', value: formatFocalLength(metadata.focalLength) ?? '' });
    if (metadata.takenAt) items.push({ label: 'Captured', value: metadata.takenAt });
    return items;
  }, [metadata]);

  const zoomIn = useCallback(() => setZoom((value) => Math.min(5, Number((value + 0.25).toFixed(2)))), []);
  const zoomOut = useCallback(() => setZoom((value) => Math.max(0.25, Number((value - 0.25).toFixed(2)))), []);
  const resetZoom = useCallback(() => setZoom(1), []);

  return (
    <figure className={className} ref={containerRef} aria-labelledby={toolbarId}>
      <div
        id={toolbarId}
        role="toolbar"
        aria-label="Image controls"
        className="flex items-center gap-2 mb-2"
      >
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          className="rounded border px-2 py-1"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          className="rounded border px-2 py-1"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={resetZoom}
          className="rounded border px-2 py-1"
        >
          Reset
        </button>
        <button
          type="button"
          aria-label="Toggle metadata"
          aria-pressed={showMetadata}
          onClick={() => setShowMetadata((value) => !value)}
          className="rounded border px-2 py-1"
        >
          Info
        </button>
      </div>
      {loading && (
        <div role="status" aria-live="polite" className="mb-2">
          Loading image…
        </div>
      )}
      {error && (
        <div role="alert" className="mb-2 text-red-500">
          {error}
        </div>
      )}
      {imageUrl && (
        <div className="overflow-hidden rounded border" aria-live="polite">
          <img
            src={imageUrl}
            alt={alt}
            loading="lazy"
            style={{ ...transformStyle, transition: 'transform 0.2s ease', transformOrigin: 'center center' }}
            className="max-h-[70vh] w-full object-contain"
            data-testid="image-viewer-image"
          />
        </div>
      )}
      {showMetadata && cameraDetails.length > 0 && (
        <dl
          id={metadataId}
          aria-label="Camera metadata"
          className="mt-3 grid grid-cols-1 gap-1 text-sm"
        >
          {cameraDetails.map((item) => (
            <div key={item.label} className="flex justify-between gap-4">
              <dt className="font-medium">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </figure>
  );
};

export default ImageViewer;
