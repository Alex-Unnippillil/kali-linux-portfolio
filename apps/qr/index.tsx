'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  ChangeEvent,
  useMemo,
} from 'react';
import QRCode from 'qrcode';
import Presets from './components/Presets';
import Scan from './components/Scan';
import {
  loadLastGeneration,
  loadLastScan,
  saveLastGeneration,
  saveLastScan,
} from '../../utils/qrStorage';
import { safeLocalStorage } from '../../utils/safeStorage';

type StylePreferences = {
  size: number;
  margin: number;
  ecc: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
};

const STYLE_STORAGE_KEY = 'qr-style-preferences';

const defaultStylePreferences: StylePreferences = {
  size: 256,
  margin: 1,
  ecc: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
};

const parseHexChannel = (value: string) => {
  const channel = Number.parseInt(value, 16);
  return Number.isNaN(channel) ? 0 : channel;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = parseHexChannel(normalized[0] + normalized[0]);
    const g = parseHexChannel(normalized[1] + normalized[1]);
    const b = parseHexChannel(normalized[2] + normalized[2]);
    return [r, g, b];
  }

  if (normalized.length === 6) {
    const r = parseHexChannel(normalized.slice(0, 2));
    const g = parseHexChannel(normalized.slice(2, 4));
    const b = parseHexChannel(normalized.slice(4, 6));
    return [r, g, b];
  }

  return [0, 0, 0];
};

const relativeLuminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const calculateContrastRatio = (foreground: string, background: string) => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number.isFinite(ratio) ? ratio : 1;
};

const readStylePreferences = (): StylePreferences => {
  if (!safeLocalStorage) return defaultStylePreferences;

  try {
    const stored = safeLocalStorage.getItem(STYLE_STORAGE_KEY);
    if (!stored) return defaultStylePreferences;

    const parsed = JSON.parse(stored) as Partial<StylePreferences>;
    const eccValues: StylePreferences['ecc'][] = ['L', 'M', 'Q', 'H'];

    return {
      size:
        typeof parsed.size === 'number' ? parsed.size : defaultStylePreferences.size,
      margin:
        typeof parsed.margin === 'number' ? parsed.margin : defaultStylePreferences.margin,
      ecc: eccValues.includes(parsed.ecc as StylePreferences['ecc'])
        ? (parsed.ecc as StylePreferences['ecc'])
        : defaultStylePreferences.ecc,
      foregroundColor:
        typeof parsed.foregroundColor === 'string'
          ? parsed.foregroundColor
          : defaultStylePreferences.foregroundColor,
      backgroundColor:
        typeof parsed.backgroundColor === 'string'
          ? parsed.backgroundColor
          : defaultStylePreferences.backgroundColor,
    };
  } catch {
    return defaultStylePreferences;
  }
};

export default function QR() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialPreferencesRef = useRef<StylePreferences>();

  if (!initialPreferencesRef.current) {
    initialPreferencesRef.current = readStylePreferences();
  }

  const initialPreferences = initialPreferencesRef.current as StylePreferences;

  const [payload, setPayload] = useState('');
  const [mode, setMode] = useState<'generate' | 'scan'>('generate');
  const [size, setSize] = useState(initialPreferences.size);
  const [margin, setMargin] = useState(initialPreferences.margin);
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>(initialPreferences.ecc);
  const [foregroundColor, setForegroundColor] = useState(
    initialPreferences.foregroundColor,
  );
  const [backgroundColor, setBackgroundColor] = useState(
    initialPreferences.backgroundColor,
  );
  const [logo, setLogo] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState('');
  const [lastGen, setLastGen] = useState('');
  const [lastScan, setLastScan] = useState('');

  useEffect(() => {
    if (!safeLocalStorage) return;

    const preferences: StylePreferences = {
      size,
      margin,
      ecc,
      foregroundColor,
      backgroundColor,
    };

    safeLocalStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(preferences));
  }, [size, margin, ecc, foregroundColor, backgroundColor]);

  const contrastRatio = useMemo(
    () => calculateContrastRatio(foregroundColor, backgroundColor),
    [foregroundColor, backgroundColor],
  );
  const formattedContrast = contrastRatio.toFixed(2);
  const isLowContrast = contrastRatio < 4.5;

  useEffect(() => {
    setLastGen(loadLastGeneration());
    setLastScan(loadLastScan());
  }, []);

  useEffect(() => {
    if (payload) {
      saveLastGeneration(payload);
      setLastGen(payload);
    }
  }, [payload]);

  useEffect(() => {
    if (scanResult) {
      saveLastScan(scanResult);
      setLastScan(scanResult);
    }
  }, [scanResult]);

  const handleLogo = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    },
    [],
  );

  const downloadPng = useCallback(() => {
    if (!payload || !canvasRef.current) return;
    const data = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = data;
    link.download = `qr-${size}.png`;
    link.click();
  }, [payload, size]);

  const downloadSvg = useCallback(async () => {
    if (!payload) return;
    let svg = await QRCode.toString(payload, {
      margin,
      width: size,
      type: 'svg',
      errorCorrectionLevel: ecc,
      color: {
        dark: foregroundColor,
        light: backgroundColor,
      },
    });
    if (logo) {
      const imgSize = size * 0.2;
      const pos = (size - imgSize) / 2;
      const logoTag = `<image href="${logo}" x="${pos}" y="${pos}" width="${imgSize}" height="${imgSize}"/>`;
      svg = svg.replace('</svg>', `${logoTag}</svg>`);
    }
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${size}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [payload, size, margin, ecc, logo, foregroundColor, backgroundColor]);

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('generate')}
          className={`px-2 py-1 rounded ${
            mode === 'generate' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`px-2 py-1 rounded ${
            mode === 'scan' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          Scan
        </button>
      </div>

      <div className="w-64 aspect-square mx-auto">
        {mode === 'generate' ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded"
            style={{ backgroundColor }}
          />
        ) : (
          <Scan onResult={setScanResult} />
        )}
      </div>

      {mode === 'generate' && (
        <>
          <Presets
            canvasRef={canvasRef}
            onPayloadChange={setPayload}
            size={size}
            margin={margin}
            ecc={ecc}
            logo={logo}
            foregroundColor={foregroundColor}
            backgroundColor={backgroundColor}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="qr-size" className="text-sm flex items-center gap-1">
              Size
              <select
                id="qr-size"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
                className="ml-1 rounded p-1 text-black"
              >
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
              </select>
            </label>
            <label htmlFor="qr-margin" className="text-sm flex items-center gap-1">
              Margin
              <select
                id="qr-margin"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="ml-1 rounded p-1 text-black"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
              </select>
            </label>
            <label htmlFor="qr-ecc" className="text-sm flex items-center gap-1">
              ECC
              <select
                id="qr-ecc"
                value={ecc}
                onChange={(e) => setEcc(e.target.value as typeof ecc)}
                className="ml-1 rounded p-1 text-black"
              >
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H">H</option>
              </select>
            </label>
            <label htmlFor="qr-logo" className="text-sm flex items-center gap-1">
              Logo
              <input
                id="qr-logo"
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="ml-1 rounded p-1 text-black"
              />
            </label>
            <label
              htmlFor="qr-foreground"
              className="text-sm flex items-center gap-1"
            >
              Foreground color
              <input
                id="qr-foreground"
                type="color"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
                className="ml-1 h-8 w-12 cursor-pointer rounded border border-gray-500 bg-transparent"
              />
            </label>
            <label
              htmlFor="qr-background"
              className="text-sm flex items-center gap-1"
            >
              Background color
              <input
                id="qr-background"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="ml-1 h-8 w-12 cursor-pointer rounded border border-gray-500 bg-transparent"
              />
            </label>
            <div className="text-xs leading-tight text-gray-300 max-w-xs">
              <p>{`Contrast ratio ${formattedContrast}:1 (WCAG)`}</p>
              {isLowContrast && (
                <p className="text-yellow-300">
                  Warning: Low contrast may impact scanning. Aim for at least 4.5:1.
                </p>
              )}
            </div>
            {logo && (
              <button
                type="button"
                onClick={() => setLogo(null)}
                className="px-2 py-1 bg-gray-600 rounded text-sm"
              >
                Clear Logo
              </button>
            )}
            <button
              type="button"
              onClick={downloadPng}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download PNG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="p-1 bg-blue-600 rounded"
              aria-label="Download SVG"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <path d="M4 19h16" />
              </svg>
            </button>
          </div>
        </>
      )}

      {lastScan && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last scan</p>
          <p className="break-all text-sm">{lastScan}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastScan)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}

      {lastGen && (
        <div className="space-y-2">
          <p className="text-xs text-gray-300">Last generation</p>
          <p className="break-all text-sm">{lastGen}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(lastGen)}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}

