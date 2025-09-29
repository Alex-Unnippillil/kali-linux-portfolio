'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type PacketSummary = {
  timestamp: string;
  len: number;
  src: string;
  dest: string;
  protocol: number;
  info: string;
  sport?: number;
  dport?: number;
};

interface PcapImporterProps {
  onPackets?: (packets: PacketSummary[]) => void;
}

type ImportStatus =
  | 'idle'
  | 'reading'
  | 'parsing'
  | 'done'
  | 'error'
  | 'cancelled';

const CHUNK_SIZE = 1024 * 1024; // 1MB

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${
    units[exponent]
  }`;
};

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(() => resolve(), 0);
    }
  });

const statusLabel: Record<ImportStatus, string> = {
  idle: 'No capture loaded yet.',
  reading: 'Reading capture into memory…',
  parsing: 'Parsing packets…',
  done: 'Import complete.',
  error: 'Import failed.',
  cancelled: 'Import cancelled.',
};

const protocolLookup: Record<number, string> = {
  6: 'TCP',
  17: 'UDP',
  1: 'ICMP',
};

const toUserMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Import cancelled. Choose a file to try again.';
  }
  if (error instanceof Error) {
    if (/unsupported pcap format/i.test(error.message)) {
      return 'Unsupported file format. Provide a classic PCAP or PCAPNG capture.';
    }
    if (/insufficient data/i.test(error.message)) {
      return 'The capture ended unexpectedly. Verify the file is not truncated.';
    }
    return error.message;
  }
  return 'Unexpected error while parsing the capture.';
};

const PcapImporter: React.FC<PcapImporterProps> = ({ onPackets }) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [bytesRead, setBytesRead] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [packets, setPackets] = useState<PacketSummary[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const isBusy = status === 'reading' || status === 'parsing';

  const percent = useMemo(
    () => (totalBytes > 0 ? Math.min(progress * 100, 100) : 0),
    [progress, totalBytes],
  );

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const resetState = () => {
    setStatus('idle');
    setError(null);
    setBytesRead(0);
    setTotalBytes(0);
    setProgress(0);
    setPackets([]);
    setFileName('');
    cancelledRef.current = false;
    resetInput();
  };

  const ensureWorker = () => {
    if (typeof Worker === 'undefined') return null;
    if (!workerRef.current) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/pcapParser.worker.ts', import.meta.url),
        );
      } catch {
        workerRef.current = null;
      }
    }
    return workerRef.current;
  };

  const parseInWorker = (buffer: ArrayBuffer) =>
    new Promise<PacketSummary[]>((resolve, reject) => {
      const worker = ensureWorker();
      if (!worker) {
        import('../../../utils/pcap')
          .then((mod) =>
            resolve(
              mod.parsePcap(buffer).map((pkt) => ({
                timestamp: pkt.timestamp,
                len: pkt.len,
                src: pkt.src,
                dest: pkt.dest,
                protocol: pkt.protocol,
                info: pkt.info,
                sport: pkt.sport,
                dport: pkt.dport,
              })),
            ),
          )
          .catch(reject);
        return;
      }

      const cleanup = () => {
        worker.onmessage = null;
        worker.onerror = null;
      };

      worker.onmessage = (event: MessageEvent<any>) => {
        const data = event.data;
        if (data?.type === 'parsed') {
          cleanup();
          resolve(data.packets as PacketSummary[]);
        } else if (data?.type === 'error') {
          cleanup();
          reject(new Error(data.message));
        }
      };

      worker.onerror = (evt) => {
        cleanup();
        reject(evt instanceof ErrorEvent ? evt.error : new Error('Worker error'));
      };

      worker.postMessage({ type: 'parse', buffer }, [buffer]);
    });

  const readUsingFileReader = (file: File, signal: AbortSignal) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      let offset = 0;
      const chunks: Uint8Array[] = [];
      const reader = new FileReader();

      const onAbort = () => {
        reader.abort();
        signal.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      const readNext = () => {
        if (signal.aborted) {
          onAbort();
          return;
        }
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
      };

      reader.onload = () => {
        if (!reader.result) {
          reject(new Error('Failed to read file chunk.'));
          return;
        }
        const chunk = new Uint8Array(reader.result as ArrayBuffer);
        chunks.push(chunk);
        offset += chunk.byteLength;
        setBytesRead(offset);
        setProgress(file.size ? offset / file.size : 0);
        if (offset < file.size) {
          setTimeout(readNext, 0);
        } else {
          signal.removeEventListener('abort', onAbort);
          const merged = new Uint8Array(offset);
          let cursor = 0;
          for (const part of chunks) {
            merged.set(part, cursor);
            cursor += part.byteLength;
          }
          setBytesRead(offset);
          setProgress(file.size ? offset / file.size : 0);
          resolve(merged.buffer);
        }
      };

      reader.onerror = () => {
        signal.removeEventListener('abort', onAbort);
        reject(reader.error || new Error('Unable to read file.'));
      };

      signal.addEventListener('abort', onAbort);
      readNext();
    });

  const readFile = async (file: File, signal: AbortSignal) => {
    const chunks: Uint8Array[] = [];
    let read = 0;
    if (!(file as any).stream) {
      return readUsingFileReader(file, signal);
    }

    const reader = (file as any).stream().getReader();
    let lastYieldAt = 0;

    try {
      for (;;) {
        signal.throwIfAborted();
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
          read += chunk.byteLength;
          chunks.push(chunk);
          setBytesRead(read);
          setProgress(file.size ? read / file.size : 0);
          if (read - lastYieldAt >= CHUNK_SIZE) {
            await yieldToBrowser();
            lastYieldAt = read;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    signal.throwIfAborted();

    const merged = new Uint8Array(read);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    setBytesRead(read);
    setProgress(file.size ? read / file.size : 0);
    return merged.buffer;
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    cancelledRef.current = false;
    setFileName(file.name);
    setTotalBytes(file.size);
    setPackets([]);
    setError(null);
    setBytesRead(0);
    setProgress(0);
    setStatus('reading');

    try {
      const buffer = await readFile(file, abortControllerRef.current.signal);
      if (cancelledRef.current) return;
      setStatus('parsing');
      const packetData = await parseInWorker(buffer);
      if (cancelledRef.current) return;
      setPackets(packetData);
      setStatus('done');
      onPackets?.(packetData);
    } catch (err) {
      if (cancelledRef.current) return;
      const message = toUserMessage(err);
      setError(message);
      setStatus(message.includes('cancelled') ? 'cancelled' : 'error');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (!isBusy) return;
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setStatus('cancelled');
    setError('Import cancelled. Choose a file to try again.');
  };

  const handleRetry = () => {
    if (isBusy) {
      handleCancel();
    }
    resetState();
  };

  const visiblePackets = packets.slice(0, 10);

  return (
    <div className="mt-4 rounded bg-ub-dark p-3 text-white">
      <h2 className="mb-2 text-lg font-semibold">PCAP importer</h2>
      <p className="mb-3 text-xs italic text-gray-300">
        Upload a demo capture to visualise sniffed credentials. Files never
        leave your browser.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex w-full flex-col gap-1 text-sm font-medium sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          <span>Capture file</span>
          <input
            ref={inputRef}
            id="pcap-file-input"
            type="file"
            accept=".pcap,.pcapng,application/vnd.tcpdump.pcap"
            onChange={handleFileChange}
            disabled={isBusy}
            className="w-full text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-ubt-blue file:px-3 file:py-1 file:text-sm file:font-semibold disabled:opacity-50 sm:w-auto"
          />
        </label>
        {isBusy && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Cancel
          </button>
        )}
        {status !== 'idle' && !isBusy && (
          <button
            type="button"
            onClick={handleRetry}
            className="rounded bg-ub-grey px-3 py-1 text-xs font-semibold text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
          >
            Reset
          </button>
        )}
      </div>
      <div className="mt-3 rounded border border-gray-700 bg-black p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{statusLabel[status]}</p>
            {fileName && (
              <p className="text-xs text-gray-400">{fileName}</p>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {formatBytes(bytesRead)} / {formatBytes(totalBytes)}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-800">
          <div
            className="h-full bg-ubt-blue transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {percent.toFixed(1)}% complete
        </p>
        {error && (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
        {!error && status === 'done' && (
          <p className="mt-2 text-xs text-green-400">
            Parsed {packets.length} packets. Showing first {visiblePackets.length}.
          </p>
        )}
      </div>
      {visiblePackets.length > 0 && (
        <div className="mt-3">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="text-green-400">
              <tr>
                <th className="w-24 px-2 py-1">Timestamp</th>
                <th className="w-24 px-2 py-1">Source</th>
                <th className="w-24 px-2 py-1">Destination</th>
                <th className="w-16 px-2 py-1">Protocol</th>
                <th className="px-2 py-1">Info</th>
              </tr>
            </thead>
            <tbody>
              {visiblePackets.map((pkt, index) => (
                <tr
                  key={`${pkt.timestamp}-${index}`}
                  className={index % 2 === 0 ? 'bg-black' : 'bg-ub-grey'}
                >
                  <td className="px-2 py-1 text-gray-300">{pkt.timestamp}</td>
                  <td className="px-2 py-1 text-white">{pkt.src || '—'}</td>
                  <td className="px-2 py-1 text-white">{pkt.dest || '—'}</td>
                  <td className="px-2 py-1 text-green-400">
                    {protocolLookup[pkt.protocol] || pkt.protocol || '—'}
                  </td>
                  <td className="px-2 py-1 text-green-300">
                    {pkt.info}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PcapImporter;
