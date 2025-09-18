'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type SupportedFormat = 'image/jpeg' | 'image/webp';

type CompressWorkerRequest = {
  id: string;
  type: 'compress';
  file: File;
  format: SupportedFormat;
  quality: number;
  maxDimension: number;
};

type CompressWorkerProgress = {
  id: string;
  type: 'progress';
  progress: number;
  originalWidth: number;
  originalHeight: number;
  targetWidth: number;
  targetHeight: number;
  scaleFactor: number;
};

type CompressWorkerComplete = {
  id: string;
  type: 'complete';
  buffer: ArrayBuffer;
  size: number;
  targetWidth: number;
  targetHeight: number;
  format: SupportedFormat;
};

type CompressWorkerError = {
  id: string;
  type: 'error';
  message: string;
};

type CompressWorkerMessage =
  | CompressWorkerProgress
  | CompressWorkerComplete
  | CompressWorkerError;

const DEFAULT_QUALITY = 55;
const MIN_QUALITY = 25;
const MAX_QUALITY = 90;
const MAX_DIMENSION = 1920;

const clampQuality = (value: number) => {
  const clamped = Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, value));
  return clamped / 100;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

const estimateCompressedSize = (
  originalSize: number,
  quality: number,
  scaleFactor: number,
  format: SupportedFormat,
) => {
  const normalizedQuality = clampQuality(quality);
  const qualityWeight = 0.3 + normalizedQuality * 0.4;
  const scaledArea = Math.pow(Math.max(scaleFactor, 0.01), 1.7);
  const formatModifier = format === 'image/webp' ? 0.78 : 1;
  const estimate = originalSize * qualityWeight * scaledArea * formatModifier;
  return Math.max(Math.round(estimate), 32 * 1024);
};

const qualityHelpText =
  'Lower quality and smaller dimensions produce lighter files. The worker resizes large images to 1920px on the longest edge.';

export default function ImageToolsApp() {
  const workerRef = useRef<Worker | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const jobCounterRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<SupportedFormat>('image/jpeg');
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<
    | {
        scaleFactor: number;
        targetWidth: number;
        targetHeight: number;
        originalWidth: number;
        originalHeight: number;
      }
    | null
  >(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../../workers/image-compress.worker.ts', import.meta.url),
    );
    workerRef.current = worker;
    const handleMessage = ({ data }: MessageEvent<CompressWorkerMessage>) => {
      if (!data || data.id !== activeJobIdRef.current) return;
      if (data.type === 'progress') {
        setProgress(Math.min(Math.max(data.progress, 0), 1));
        if (data.originalWidth > 0 && data.originalHeight > 0) {
          setMetadata({
            scaleFactor: data.scaleFactor,
            targetWidth: data.targetWidth,
            targetHeight: data.targetHeight,
            originalWidth: data.originalWidth,
            originalHeight: data.originalHeight,
          });
        }
        setStatus('working');
      } else if (data.type === 'complete') {
        setProgress(1);
        setCompressedSize(data.size);
        setStatus('done');
        setError(null);
        setDownloadUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          const blob = new Blob([data.buffer], { type: data.format });
          return URL.createObjectURL(blob);
        });
      } else if (data.type === 'error') {
        setStatus('error');
        setError(data.message || 'Compression failed');
      }
    };
    worker.addEventListener('message', handleMessage);
    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [previewUrl, downloadUrl]);

  useEffect(() => {
    if (!file || !workerRef.current) return;
    const worker = workerRef.current;
    const jobId = `compress-${++jobCounterRef.current}`;
    activeJobIdRef.current = jobId;
    setStatus('working');
    setProgress(0);
    setCompressedSize(null);
    setError(null);
    const message: CompressWorkerRequest = {
      id: jobId,
      type: 'compress',
      file,
      format,
      quality: clampQuality(quality),
      maxDimension: MAX_DIMENSION,
    };
    worker.postMessage(message);
  }, [file, quality, format]);

  const estimatedSize = useMemo(() => {
    if (!file || !metadata) return null;
    return estimateCompressedSize(
      file.size,
      quality,
      metadata.scaleFactor,
      format,
    );
  }, [file, metadata, quality, format]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    activeJobIdRef.current = null;
    setFile(nextFile);
    setOriginalSize(nextFile.size);
    setQuality(DEFAULT_QUALITY);
    setMetadata(null);
    setCompressedSize(null);
    setProgress(0);
    setStatus('idle');
    setError(null);
    setFormat(nextFile.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
    setDownloadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(nextFile);
    });
  };

  const clearSelection = () => {
    activeJobIdRef.current = null;
    setFile(null);
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setDownloadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setMetadata(null);
    setCompressedSize(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setOriginalSize(0);
    setQuality(DEFAULT_QUALITY);
    setFormat('image/jpeg');
  };

  const progressPercent = Math.round(progress * 100);
  const compressionRatio =
    compressedSize && originalSize
      ? ((compressedSize / originalSize) * 100).toFixed(0)
      : null;
  const estimatedRatio =
    estimatedSize && originalSize
      ? ((estimatedSize / originalSize) * 100).toFixed(0)
      : null;

  return (
    <div className="h-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Image Compression Lab</h1>
          <p className="text-sm text-white/70">
            Offload heavy JPEG and WebP compression work to a background worker,
            tweak quality, and preview the results without blocking the UI.
          </p>
        </header>

        <section className="rounded-lg border border-white/10 bg-black/30 p-4">
          <label
            htmlFor="image-tools-input"
            className="mb-2 block text-sm font-medium"
          >
            Select an image to compress
          </label>
          <input
            id="image-tools-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-sm text-white"
            onChange={handleFileChange}
          />
          <p className="mt-2 text-xs text-white/60">
            Large sources are resized to keep the download near one megabyte
            when using default quality.
          </p>
        </section>

        {file ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px),1fr]">
            <aside className="space-y-3">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-white/60">Preview unavailable</span>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-white/70">Original size</dt>
                  <dd>{formatBytes(originalSize)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/70">Estimated output</dt>
                  <dd data-testid="estimated-size">
                    {estimatedSize ? (
                      <>
                        ~{formatBytes(estimatedSize)}
                        {estimatedRatio ? ` (${estimatedRatio}%)` : ''}
                      </>
                    ) : (
                      'Calculating…'
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/70">Compressed file</dt>
                  <dd data-testid="compressed-size">
                    {status === 'working'
                      ? `${progressPercent}%`
                      : compressedSize
                        ? `${formatBytes(compressedSize)}${
                            compressionRatio ? ` (${compressionRatio}%)` : ''
                          }`
                        : 'Pending'}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove image
              </button>
            </aside>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="image-quality-slider"
                  className="mb-2 flex items-center justify-between text-sm font-medium"
                >
                  <span>Quality</span>
                  <span>{quality}%</span>
                </label>
                <input
                  id="image-quality-slider"
                  type="range"
                  min={MIN_QUALITY}
                  max={MAX_QUALITY}
                  value={quality}
                  onChange={(event) => setQuality(parseInt(event.target.value, 10))}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-white/60">{qualityHelpText}</p>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Format</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="image-tools-format"
                    value="image/jpeg"
                    checked={format === 'image/jpeg'}
                    onChange={() => setFormat('image/jpeg')}
                  />
                  JPEG (best compatibility)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="image-tools-format"
                    value="image/webp"
                    checked={format === 'image/webp'}
                    onChange={() => setFormat('image/webp')}
                  />
                  WebP (smallest size)
                </label>
              </fieldset>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <progress
                    className="h-2 w-full"
                    max={1}
                    value={progress}
                    aria-label="Compression progress"
                  />
                  <span
                    className="w-12 text-right text-sm tabular-nums"
                    data-testid="compression-progress"
                  >
                    {progressPercent}%
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  {status === 'error'
                    ? error || 'Compression failed.'
                    : status === 'working'
                      ? 'Crunching pixels in a worker thread…'
                      : 'Adjust the settings to re-run the worker.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={downloadUrl ?? '#'}
                  download={
                    file
                      ? `compressed-${file.name.replace(/\.[^.]+$/, '')}.${
                          format === 'image/webp' ? 'webp' : 'jpg'
                        }`
                      : undefined
                  }
                  className={`rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 ${
                    downloadUrl ? '' : 'pointer-events-none opacity-60'
                  }`}
                  aria-disabled={!downloadUrl}
                >
                  Download compressed
                </a>
                {metadata ? (
                  <p className="text-xs text-white/60">
                    Output {metadata.targetWidth}×{metadata.targetHeight}px from
                    {metadata.originalWidth}×{metadata.originalHeight}px
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-white/60">
            Drop an image or pick one above to inspect compression savings.
          </div>
        )}
      </div>
    </div>
  );
}
