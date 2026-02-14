"use client";

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CanvasConversionResult,
  ConversionTarget,
  convertFile,
} from "../utils/canvas";

const formatOptions: { label: string; value: ConversionTarget }[] = [
  { label: "PNG (.png)", value: "image/png" },
  { label: "JPEG (.jpg)", value: "image/jpeg" },
  { label: "WebP (.webp)", value: "image/webp" },
];

export async function checkAvifSupport(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (typeof window.createImageBitmap !== "function") return false;
  try {
    const blob = new Blob([new Uint8Array([0])], { type: "image/avif" });
    const bitmap = await window.createImageBitmap(blob);
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }
    return true;
  } catch (err) {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex === 0 ? 0 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

type ConvertedItem = CanvasConversionResult & { url: string };

type Status = "idle" | "working";

export default function FormatConvert() {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<ConversionTarget>("image/png");
  const [quality, setQuality] = useState(92);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ConvertedItem[]>([]);
  const [supportsAvif, setSupportsAvif] = useState<boolean | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    let active = true;
    checkAvifSupport().then((supported) => {
      if (active) {
        setSupportsAvif(supported);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = results.map((item) => item.url);
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = [];
    };
  }, [results]);

  const qualityAsFloat = useMemo(() => {
    if (format === "image/png") return 1;
    return Math.min(1, Math.max(0.1, quality / 100));
  }, [format, quality]);

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    setError(null);
    setResults([]);
    if (!list || list.length === 0) {
      setFiles([]);
      return;
    }
    setFiles(Array.from(list));
  };

  const convert = async () => {
    if (!files.length || status === "working") return;
    setStatus("working");
    setError(null);
    try {
      const newResults: ConvertedItem[] = [];
      for (const file of files) {
        const converted = await convertFile(file, format, qualityAsFloat);
        const url = URL.createObjectURL(converted.blob);
        newResults.push({ ...converted, url });
      }
      setResults(newResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  const downloadAll = () => {
    results.forEach((item) => {
      const anchor = document.createElement("a");
      anchor.href = item.url;
      anchor.download = item.name;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    });
  };

  const avifMessage = supportsAvif
    ? "AVIF decoding via createImageBitmap is available."
    : supportsAvif === false
    ? "Your browser does not support AVIF via createImageBitmap. Conversions will stay in JPG/PNG/WebP."
    : "Checking AVIF decode capability...";

  return (
    <div className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto">
      <h2 className="text-xl font-semibold mb-3">Image format converter</h2>
      <p className="text-sm text-gray-300 mb-4" role="status">
        {avifMessage}
      </p>
      <div className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="image-format-input">
          Upload images
        </label>
        <input
          id="image-format-input"
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          aria-label="Upload images"
          className="block w-full text-sm text-gray-200"
        />
        {files.length > 0 && (
          <p className="text-xs text-gray-300">{files.length} file(s) ready</p>
        )}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col text-sm font-medium">
            <label htmlFor="image-format-output">Output format</label>
            <select
              id="image-format-output"
              className="mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1"
              value={format}
              onChange={(event) => setFormat(event.target.value as ConversionTarget)}
            >
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col text-sm font-medium">
            <label htmlFor="image-format-quality">Quality</label>
            <input
              id="image-format-quality"
              type="range"
              min={50}
              max={100}
              step={5}
              value={quality}
              disabled={format === "image/png"}
              onChange={(event) => setQuality(Number(event.target.value))}
              aria-label="Output quality"
              className="mt-1"
            />
            <span className="text-xs text-gray-300 mt-1">
              {format === "image/png"
                ? "Lossless"
                : `${quality}% visual quality`}
            </span>
          </div>
          <button
            type="button"
            onClick={convert}
            disabled={!files.length || status === "working"}
            className="bg-ub-blue px-3 py-2 rounded disabled:opacity-50"
          >
            {status === "working" ? "Converting..." : "Convert images"}
          </button>
          <button
            type="button"
            onClick={downloadAll}
            disabled={!results.length}
            className="bg-gray-700 px-3 py-2 rounded disabled:opacity-50"
          >
            Download batch
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {results.length > 0 && (
          <ul className="mt-4 space-y-3" aria-label="Converted images">
            {results.map((item) => (
              <li
                key={item.url}
                className="border border-gray-700 rounded p-3 bg-gray-800"
              >
                <div className="flex justify-between gap-2 flex-wrap text-sm">
                  <span className="font-medium">{item.name}</span>
                  <a
                    href={item.url}
                    download={item.name}
                    className="text-ubt-blue hover:underline"
                  >
                    Download
                  </a>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  {`Original: ${formatBytes(item.originalBytes)} → Converted: ${formatBytes(item.convertedBytes)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
