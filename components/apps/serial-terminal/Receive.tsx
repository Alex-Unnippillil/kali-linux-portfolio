import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../../ui/FormError';
import type { SerialPortLike } from './types';

interface FileSignature {
  id: string;
  name: string;
  extension: string;
  header: number[];
  footer?: number[];
  note: string;
}

interface DetectedFile {
  id: string;
  label: string;
  extension: string;
  startOffset: number;
  endOffset: number;
  size: number;
  heuristics: string;
  footerFound: boolean;
  verifying: boolean;
  checksum?: {
    crc32: string;
    sha256?: string;
  };
}

type FinalizeReason = 'footer' | 'new-header' | 'stop';

interface ActiveCandidate {
  signature: FileSignature;
  startOffset: number;
  heuristics: string;
  nextFooterSearchFrom: number;
}

interface ReceiveProps {
  port: SerialPortLike | null;
}

const FILE_SIGNATURES: FileSignature[] = [
  {
    id: 'png',
    name: 'PNG image',
    extension: 'png',
    header: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    footer: [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82],
    note: 'Standard PNG signature detected',
  },
  {
    id: 'jpeg',
    name: 'JPEG image',
    extension: 'jpg',
    header: [0xff, 0xd8, 0xff],
    footer: [0xff, 0xd9],
    note: 'JPEG SOI marker found',
  },
  {
    id: 'gif87a',
    name: 'GIF image',
    extension: 'gif',
    header: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    footer: [0x3b],
    note: 'GIF87a header located',
  },
  {
    id: 'gif89a',
    name: 'GIF image',
    extension: 'gif',
    header: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    footer: [0x3b],
    note: 'GIF89a header located',
  },
  {
    id: 'pdf',
    name: 'PDF document',
    extension: 'pdf',
    header: [0x25, 0x50, 0x44, 0x46, 0x2d],
    footer: [0x25, 0x25, 0x45, 0x4f, 0x46],
    note: 'PDF header detected',
  },
  {
    id: 'zip',
    name: 'ZIP archive',
    extension: 'zip',
    header: [0x50, 0x4b, 0x03, 0x04],
    footer: [0x50, 0x4b, 0x05, 0x06],
    note: 'PKZIP header detected',
  },
  {
    id: 'gzip',
    name: 'GZIP archive',
    extension: 'gz',
    header: [0x1f, 0x8b, 0x08],
    note: 'GZIP header detected',
  },
  {
    id: 'elf',
    name: 'ELF binary',
    extension: 'elf',
    header: [0x7f, 0x45, 0x4c, 0x46],
    note: 'ELF magic bytes located',
  },
];

const MAX_HEADER_LENGTH = FILE_SIGNATURES.reduce((max, signature) => Math.max(max, signature.header.length), 0) || 1;
const MAX_FOOTER_LENGTH = FILE_SIGNATURES.reduce((max, signature) => Math.max(max, signature.footer?.length ?? 0, max), 0);
const MIN_HEADER_LENGTH = FILE_SIGNATURES.reduce((min, signature) => Math.min(min, signature.header.length), Number.MAX_SAFE_INTEGER) || 1;
const SEARCH_BACK = Math.max(MAX_HEADER_LENGTH, MAX_FOOTER_LENGTH, 32) * 2;

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const matchesAt = (buffer: Uint8Array, pattern: number[], index: number) => {
  if (index + pattern.length > buffer.length) return false;
  for (let i = 0; i < pattern.length; i += 1) {
    if (buffer[index + i] !== pattern[i]) {
      return false;
    }
  }
  return true;
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const num = value / 1024 ** exponent;
  return `${num.toFixed(num >= 100 || exponent === 0 ? 0 : 2)} ${units[exponent]}`;
};

const formatElapsed = (timestamp: number | null) => {
  if (!timestamp) return 'No activity';
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
};

const computeCRC32 = (views: Uint8Array[]) => {
  let crc = 0 ^ -1;
  views.forEach((view) => {
    for (let i = 0; i < view.length; i += 1) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ view[i]) & 0xff];
    }
  });
  return (crc ^ -1) >>> 0;
};

const toHex = (value: number, length: number) => value.toString(16).toUpperCase().padStart(length, '0');

const Receive: React.FC<ReceiveProps> = ({ port }) => {
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [bytesRecorded, setBytesRecorded] = useState(0);
  const [bytesPerSecond, setBytesPerSecond] = useState(0);
  const [detectedFiles, setDetectedFiles] = useState<DetectedFile[]>([]);
  const [activeSignature, setActiveSignature] = useState<ActiveCandidate | null>(null);
  const [activeBytes, setActiveBytes] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastActivity, setLastActivity] = useState<number | null>(null);

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const recordedChunksRef = useRef<Uint8Array[]>([]);
  const processedBytesRef = useRef(0);
  const searchBufferRef = useRef(new Uint8Array());
  const headerScanOffsetRef = useRef(0);
  const activeCandidateRef = useRef<ActiveCandidate | null>(null);
  const lastBoundaryOffsetRef = useRef(0);
  const isRecordingRef = useRef(false);
  const rateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRateTickBytesRef = useRef(0);
  const lastRateTickTimeRef = useRef<number | null>(null);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (port) {
      setError('');
    }
  }, [port]);

  const collectChunkViews = useCallback((start: number, end: number) => {
    const views: Uint8Array[] = [];
    if (end <= start) return views;
    let offset = 0;
    for (const chunk of recordedChunksRef.current) {
      const nextOffset = offset + chunk.length;
      if (nextOffset <= start) {
        offset = nextOffset;
        continue;
      }
      if (offset >= end) break;
      const sliceStart = Math.max(0, start - offset);
      const sliceEnd = Math.min(chunk.length, end - offset);
      views.push(chunk.subarray(sliceStart, sliceEnd));
      offset = nextOffset;
    }
    return views;
  }, []);

  const computeChecksums = useCallback(
    async (id: string, startOffset: number, endOffset: number) => {
      const views = collectChunkViews(startOffset, endOffset);
      const crc32Value = computeCRC32(views);
      let sha256Hex: string | undefined;
      if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
        try {
          await new Promise((resolve) => setTimeout(resolve, 0));
          const blob = new Blob(views, { type: 'application/octet-stream' });
          const buffer = await blob.arrayBuffer();
          const digest = await crypto.subtle.digest('SHA-256', buffer);
          sha256Hex = Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        } catch (err) {
          console.warn('SHA-256 computation failed', err);
        }
      }
      setDetectedFiles((prev) =>
        prev.map((file) =>
          file.id === id
            ? {
                ...file,
                verifying: false,
                checksum: {
                  crc32: `0x${toHex(crc32Value, 8)}`,
                  sha256: sha256Hex,
                },
              }
            : file,
        ),
      );
    },
    [collectChunkViews],
  );

  const registerDetectedFile = useCallback(
    (
      entry: Omit<DetectedFile, 'id' | 'checksum' | 'verifying' | 'size'> & {
        footerFound: boolean;
      },
    ) => {
      const size = entry.endOffset - entry.startOffset;
      if (size <= 0) return;
      const id = `${entry.label}-${entry.startOffset}-${entry.endOffset}-${Date.now()}`;
      const record: DetectedFile = {
        ...entry,
        id,
        size,
        verifying: true,
      };
      setDetectedFiles((prev) => [...prev, record]);
      computeChecksums(id, entry.startOffset, entry.endOffset);
    },
    [computeChecksums],
  );

  const finalizeActiveCandidate = useCallback(
    (endOffset: number, reason: FinalizeReason) => {
      const active = activeCandidateRef.current;
      if (!active) return;
      const heuristics =
        reason === 'footer'
          ? `${active.signature.name} footer located`
          : reason === 'new-header'
          ? `${active.signature.name} truncated by new header`
          : `${active.signature.name} capture stopped before footer`;
      registerDetectedFile({
        label: active.signature.name,
        extension: active.signature.extension,
        startOffset: active.startOffset,
        endOffset,
        heuristics,
        footerFound: reason === 'footer',
      });
      lastBoundaryOffsetRef.current = endOffset;
      activeCandidateRef.current = null;
      setActiveSignature(null);
      setStatusMessage(heuristics);
    },
    [registerDetectedFile],
  );

  const finalizeUnknownSegment = useCallback(
    (endOffset: number) => {
      const startOffset = lastBoundaryOffsetRef.current;
      if (endOffset <= startOffset) return;
      registerDetectedFile({
        label: 'Binary segment',
        extension: 'bin',
        startOffset,
        endOffset,
        heuristics: 'Captured bytes without a known file signature',
        footerFound: false,
      });
      lastBoundaryOffsetRef.current = endOffset;
      setStatusMessage('Raw binary segment captured');
    },
    [registerDetectedFile],
  );

  const handleNewHeader = useCallback(
    (signature: FileSignature, startOffset: number) => {
      const active = activeCandidateRef.current;
      if (active && startOffset > active.startOffset) {
        finalizeActiveCandidate(startOffset, 'new-header');
      } else if (!active && startOffset > lastBoundaryOffsetRef.current) {
        finalizeUnknownSegment(startOffset);
      }
      const candidate: ActiveCandidate = {
        signature,
        startOffset,
        heuristics: signature.note,
        nextFooterSearchFrom: startOffset,
      };
      activeCandidateRef.current = candidate;
      setActiveSignature(candidate);
      setActiveBytes(0);
      setStatusMessage(`${signature.name} header detected at offset ${startOffset}`);
    },
    [finalizeActiveCandidate, finalizeUnknownSegment],
  );

  const checkFooterForActive = useCallback(
    (buffer: Uint8Array, rangeStart: number) => {
      const active = activeCandidateRef.current;
      if (!active || !active.signature.footer) return;
      const footer = active.signature.footer;
      const startIndex = Math.max(0, active.nextFooterSearchFrom - rangeStart);
      for (let idx = startIndex; idx <= buffer.length - footer.length; idx += 1) {
        if (matchesAt(buffer, footer, idx)) {
          const endOffset = rangeStart + idx + footer.length;
          finalizeActiveCandidate(endOffset, 'footer');
          return;
        }
      }
      active.nextFooterSearchFrom = Math.max(
        active.nextFooterSearchFrom,
        rangeStart + Math.max(0, buffer.length - footer.length + 1),
      );
    },
    [finalizeActiveCandidate],
  );

  const processRecordingChunk = useCallback(
    (chunk: Uint8Array) => {
      const chunkCopy = chunk.slice();
      recordedChunksRef.current.push(chunkCopy);
      const previousBytes = processedBytesRef.current;
      const nextBytes = previousBytes + chunkCopy.length;
      const tail = searchBufferRef.current;
      const combined = new Uint8Array(tail.length + chunkCopy.length);
      combined.set(tail, 0);
      combined.set(chunkCopy, tail.length);
      const rangeStart = previousBytes - tail.length;

      checkFooterForActive(combined, rangeStart);

      const scanStartAbs = Math.max(headerScanOffsetRef.current, rangeStart);
      const startIndex = Math.max(0, scanStartAbs - rangeStart);
      let idx = startIndex;
      const maxIndex = Math.max(0, combined.length - MIN_HEADER_LENGTH);
      while (idx <= maxIndex) {
        let matched: FileSignature | null = null;
        for (const signature of FILE_SIGNATURES) {
          if (matchesAt(combined, signature.header, idx)) {
            matched = signature;
            break;
          }
        }
        if (matched) {
          const absoluteOffset = rangeStart + idx;
          handleNewHeader(matched, absoluteOffset);
          idx += Math.max(1, matched.header.length);
        } else {
          idx += 1;
        }
      }
      headerScanOffsetRef.current = Math.max(
        headerScanOffsetRef.current,
        rangeStart + Math.max(0, combined.length - (MAX_HEADER_LENGTH - 1)),
      );

      const keepFrom = Math.max(0, combined.length - SEARCH_BACK);
      searchBufferRef.current = combined.slice(keepFrom);
      processedBytesRef.current = nextBytes;
      setBytesRecorded(nextBytes);
      setLastActivity(Date.now());
      setActiveBytes((prev) => {
        const active = activeCandidateRef.current;
        if (!active) return 0;
        const progress = Math.max(0, nextBytes - active.startOffset);
        return progress === prev ? prev : progress;
      });
    },
    [checkFooterForActive, handleNewHeader],
  );

  const resetRecordingState = useCallback(() => {
    recordedChunksRef.current = [];
    processedBytesRef.current = 0;
    searchBufferRef.current = new Uint8Array();
    headerScanOffsetRef.current = 0;
    activeCandidateRef.current = null;
    lastBoundaryOffsetRef.current = 0;
    setDetectedFiles([]);
    setBytesRecorded(0);
    setActiveBytes(0);
    setActiveSignature(null);
    setStatusMessage('');
  }, []);

  const startRecording = useCallback(() => {
    if (!port?.readable) {
      setError('Open a serial port before recording.');
      return;
    }
    setError('');
    resetRecordingState();
    setIsRecording(true);
    setStatusMessage('Recording started');
    lastRateTickBytesRef.current = 0;
    lastRateTickTimeRef.current = Date.now();
    if (rateTimerRef.current) {
      clearInterval(rateTimerRef.current);
    }
    rateTimerRef.current = setInterval(() => {
      const now = Date.now();
      const previousTime = lastRateTickTimeRef.current ?? now;
      const elapsed = (now - previousTime) / 1000;
      if (elapsed <= 0) return;
      const bytes = processedBytesRef.current;
      const diff = bytes - lastRateTickBytesRef.current;
      lastRateTickBytesRef.current = bytes;
      lastRateTickTimeRef.current = now;
      setBytesPerSecond(diff / elapsed);
    }, 1000);
  }, [port, resetRecordingState]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    setIsRecording(false);
    if (rateTimerRef.current) {
      clearInterval(rateTimerRef.current);
      rateTimerRef.current = null;
    }
    lastRateTickTimeRef.current = null;
    setBytesPerSecond(0);
    const endOffset = processedBytesRef.current;
    if (activeCandidateRef.current) {
      finalizeActiveCandidate(endOffset, 'stop');
    }
    if (endOffset > lastBoundaryOffsetRef.current) {
      finalizeUnknownSegment(endOffset);
    }
    setStatusMessage('Recording stopped');
  }, [finalizeActiveCandidate, finalizeUnknownSegment]);

  useEffect(() => {
    if (!port && isRecordingRef.current) {
      stopRecording();
    }
  }, [port, stopRecording]);

  useEffect(() => {
    if (!isRecording) {
      if (rateTimerRef.current) {
        clearInterval(rateTimerRef.current);
        rateTimerRef.current = null;
      }
      setBytesPerSecond(0);
    }
    return () => {
      if (rateTimerRef.current) {
        clearInterval(rateTimerRef.current);
        rateTimerRef.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (!port?.readable) {
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => undefined);
        readerRef.current = null;
      }
      setError('');
      setStatusMessage('');
      return () => undefined;
    }

    let cancelled = false;
    const reader = port.readable.getReader();
    readerRef.current = reader;

    (async () => {
      try {
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          setLastActivity(Date.now());
          if (isRecordingRef.current) {
            processRecordingChunk(value);
          }
        }
      } catch (err) {
        console.error('Serial receive error', err);
        if (!cancelled) {
          setError('Failed while reading from the serial stream.');
        }
      } finally {
        reader.releaseLock();
        readerRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      reader.cancel().catch(() => undefined);
    };
  }, [port, processRecordingChunk]);

  useEffect(() => () => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => undefined);
      readerRef.current = null;
    }
  }, []);

  const downloadRange = useCallback((startOffset: number, endOffset: number, fileName: string) => {
    const views = collectChunkViews(startOffset, endOffset);
    if (!views.length) return;
    const blob = new Blob(views, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [collectChunkViews]);

  const handleDownloadFile = useCallback(
    (file: DetectedFile) => {
      const safeName = file.label.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
      downloadRange(
        file.startOffset,
        file.endOffset,
        `${safeName || 'capture'}_${toHex(file.startOffset, 8)}.${file.extension}`,
      );
    },
    [downloadRange],
  );

  const handleDownloadAll = useCallback(() => {
    if (!bytesRecorded) return;
    downloadRange(0, bytesRecorded, `serial_capture_${Date.now()}.bin`);
  }, [bytesRecorded, downloadRange]);

  useEffect(() => {
    if (!isRecording) {
      activeCandidateRef.current = null;
      setActiveSignature(null);
      setActiveBytes(0);
    }
  }, [isRecording]);

  const stats = useMemo(
    () => [
      { label: 'Bytes recorded', value: formatBytes(bytesRecorded) },
      { label: 'Transfer rate', value: `${formatBytes(bytesPerSecond)}/s` },
      { label: 'Segments detected', value: detectedFiles.length.toString() },
    ],
    [bytesRecorded, bytesPerSecond, detectedFiles.length],
  );

  return (
    <section className="rounded border border-slate-700 bg-slate-900/70 p-4 text-slate-100">
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-sky-300">Binary capture monitor</h3>
          <p className="text-xs text-slate-400">
            Detect incoming files heuristically while manually controlling capture sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={startRecording}
            disabled={!port || isRecording}
            className="rounded border border-sky-500 bg-sky-500/20 px-3 py-1 font-semibold text-sky-100 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700/40 disabled:text-slate-400"
          >
            Start recording
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={!isRecording}
            className="rounded border border-rose-500 bg-rose-500/20 px-3 py-1 font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700/40 disabled:text-slate-400"
          >
            Stop recording
          </button>
        </div>
      </header>
      {error && <FormError className="mb-3 mt-0">{error}</FormError>}
      <div className="grid gap-3 text-xs sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-slate-700/60 bg-slate-800/40 p-3">
            <div className="text-slate-400">{stat.label}</div>
            <div className="mt-1 font-mono text-sm text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>Status: {isRecording ? 'Recording' : 'Idle'}</span>
        <span>Last activity: {formatElapsed(lastActivity)}</span>
      </div>
      {isRecording && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-slate-400">
            <span>Recording in progress</span>
            <span>{formatBytes(bytesRecorded)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-sky-500/40 via-sky-400/60 to-sky-500/40" />
          </div>
        </div>
      )}
      {activeSignature && (
        <div className="mt-4 rounded border border-sky-700/40 bg-sky-900/20 p-3 text-xs">
          <div className="flex items-center justify-between text-sky-200">
            <span className="font-semibold">Active file: {activeSignature.signature.name}</span>
            <span className="font-mono">{formatBytes(activeBytes)}</span>
          </div>
          <p className="mt-1 text-[0.7rem] text-sky-300">{activeSignature.heuristics}</p>
        </div>
      )}
      {statusMessage && (
        <p className="mt-3 text-[0.7rem] text-slate-300">{statusMessage}</p>
      )}
      <div className="mt-4 border-t border-slate-700/60 pt-4 text-xs">
        <h4 className="text-sm font-semibold text-slate-200">Detected segments</h4>
        {detectedFiles.length === 0 ? (
          <p className="mt-2 text-slate-400">No file boundaries detected yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {detectedFiles.map((file) => (
              <li key={file.id} className="rounded border border-slate-700 bg-slate-800/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-100">
                  <span className="font-semibold">{file.label}</span>
                  <span className="font-mono text-xs text-slate-300">{formatBytes(file.size)}</span>
                </div>
                <p className="mt-1 text-[0.7rem] text-slate-400">{file.heuristics}</p>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wide text-slate-500">Offsets</dt>
                    <dd className="font-mono text-xs text-slate-200">
                      {toHex(file.startOffset, 8)}h – {toHex(file.endOffset, 8)}h
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-wide text-slate-500">Checksums</dt>
                    <dd className="font-mono text-xs text-slate-200">
                      {file.verifying
                        ? 'Computing…'
                        : file.checksum
                        ? `${file.checksum.crc32}${file.checksum.sha256 ? ` · SHA-256 ${file.checksum.sha256}` : ''}`
                        : 'Unavailable'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file)}
                    className="rounded border border-emerald-500 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    Save segment
                  </button>
                  {!file.footerFound && (
                    <span className="text-[0.65rem] uppercase tracking-wide text-amber-300">
                      Footer not observed
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {bytesRecorded > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleDownloadAll}
            className="rounded border border-indigo-500 bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
          >
            Save full capture
          </button>
        </div>
      )}
    </section>
  );
};

export default Receive;
