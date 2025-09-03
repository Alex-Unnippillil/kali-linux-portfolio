'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const fontList = ['Standard', 'Slant', 'Big'];
const fontSizes = [10, 12, 14];

const ramp = '@%#*+=-:. ';

const ESC = '\u001b';

const samples = [
  '¯\\_(ツ)_/¯',
  '(╯°□°）╯︵ ┻━┻',
  '┌─┐\n│ │\n└─┘',
];

const palette = {
  black: {
    label: 'Black',
    fgAnsi: `${ESC}[30m`,
    bgAnsi: `${ESC}[40m`,
    fgClass: 'text-black',
    bgClass: 'bg-black',
  },
  red: {
    label: 'Red',
    fgAnsi: `${ESC}[31m`,
    bgAnsi: `${ESC}[41m`,
    fgClass: 'text-red-400',
    bgClass: 'bg-red-800',
  },
  green: {
    label: 'Green',
    fgAnsi: `${ESC}[32m`,
    bgAnsi: `${ESC}[42m`,
    fgClass: 'text-green-400',
    bgClass: 'bg-green-800',
  },
  yellow: {
    label: 'Yellow',
    fgAnsi: `${ESC}[33m`,
    bgAnsi: `${ESC}[43m`,
    fgClass: 'text-yellow-400',
    bgClass: 'bg-yellow-800',
  },
  blue: {
    label: 'Blue',
    fgAnsi: `${ESC}[34m`,
    bgAnsi: `${ESC}[44m`,
    fgClass: 'text-blue-400',
    bgClass: 'bg-blue-800',
  },
  magenta: {
    label: 'Magenta',
    fgAnsi: `${ESC}[35m`,
    bgAnsi: `${ESC}[45m`,
    fgClass: 'text-fuchsia-400',
    bgClass: 'bg-fuchsia-800',
  },
  cyan: {
    label: 'Cyan',
    fgAnsi: `${ESC}[36m`,
    bgAnsi: `${ESC}[46m`,
    fgClass: 'text-cyan-400',
    bgClass: 'bg-cyan-800',
  },
  white: {
    label: 'White',
    fgAnsi: `${ESC}[37m`,
    bgAnsi: `${ESC}[47m`,
    fgClass: 'text-white',
    bgClass: 'bg-white',
  },
};

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2"
    />
  </svg>
);

type PaletteKey = keyof typeof palette;

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AsciiArtApp = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [font, setFont] = useState<figlet.Fonts>('Standard');
  const [output, setOutput] = useState('');
  const [fg, setFg] = useState<PaletteKey>('green');
  const [bg, setBg] = useState<PaletteKey>('black');
  const [fontSize, setFontSize] = useState<number>(12);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgOutput, setImgOutput] = useState('');
  const [brightness, setBrightness] = useState(0); // -1 to 1
  const [contrast, setContrast] = useState(1); // 0 to 2

  const searchParams = useSearchParams();
  const pathname = usePathname();

    useEffect(() => {
      figlet.parseFont('Standard', Standard);
      figlet.parseFont('Slant', Slant);
      figlet.parseFont('Big', Big);
    }, []);

    // load from query string on first render
    useEffect(() => {
    const t = searchParams.get('t');
    const f = searchParams.get('f');
    const b = searchParams.get('b');
    const c = searchParams.get('c');
    if (t) setText(t);
      if (f && fontList.includes(f)) setFont(f as figlet.Fonts);
    if (b) {
      const br = parseFloat(b);
      if (!Number.isNaN(br) && br >= -1 && br <= 1) setBrightness(br);
    }
    if (c) {
      const ct = parseFloat(c);
      if (!Number.isNaN(ct) && ct >= 0 && ct <= 2) setContrast(ct);
    }
  }, [searchParams]);

  // update query string permalink
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (text) params.set('t', text);
    if (font && font !== 'Standard') params.set('f', font);
    if (brightness !== 0) params.set('b', String(brightness));
    if (contrast !== 1) params.set('c', String(contrast));
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    router.replace(url);
  }, [router, pathname, text, font, brightness, contrast]);

  // auto resize textarea based on content
  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // render text ascii
  useEffect(() => {
    try {
      setOutput(figlet.textSync(text || '', { font }));
    } catch {
      setOutput('');
    }
  }, [text, font]);

  const copy = async (value: string) => {
    try {
      const colored = value
        ? `${palette[fg].fgAnsi}${palette[bg].bgAnsi}${value}${ESC}[0m`
        : '';
      await navigator.clipboard.writeText(colored);
    } catch {
      // ignore
    }
  };

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxWidth = 80;
      const scale = maxWidth / img.width;
      const w = maxWidth;
      const h = Math.floor(img.height * scale * 0.5); // adjust for font aspect
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      renderImageAscii();
    };
    img.src = URL.createObjectURL(file);
  };

  const renderImageAscii = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let result = '';
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        let val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255; // 0-1
        val = val + brightness; // apply brightness
        val = (val - 0.5) * contrast + 0.5; // apply contrast
        val = Math.min(1, Math.max(0, val));
        const charIdx = Math.floor((1 - val) * (ramp.length - 1));
        result += ramp[charIdx];
      }
      result += '\n';
    }
    setImgOutput(result);
  }, [brightness, contrast]);

  useEffect(() => {
    renderImageAscii();
  }, [renderImageAscii]);

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto font-mono">
      <div className="mb-4 flex gap-2">
        <button
          className={`px-2 py-1 rounded ${tab === 'text' ? 'bg-blue-700' : 'bg-gray-700'}`}
          onClick={() => setTab('text')}
        >
          Text
        </button>
        <button
          className={`px-2 py-1 rounded ${tab === 'image' ? 'bg-blue-700' : 'bg-gray-700'}`}
          onClick={() => setTab('image')}
        >
          Image
        </button>
      </div>
      {tab === 'text' && (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textAreaRef}
            rows={1}
            className="px-2 py-1 text-black rounded resize-none overflow-hidden font-mono leading-none"
            style={{ fontFamily: 'monospace', lineHeight: '1', fontSize: `${fontSize}px` }}
            placeholder="Enter text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <select
            value={font}
            onChange={(e) => setFont(e.target.value as figlet.Fonts)}
            className="px-2 py-1 text-black rounded"
          >
            {fontList.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="px-2 py-1 text-black rounded"
          >
            {fontSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={fg}
            onChange={(e) => setFg(e.target.value as PaletteKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(palette).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <select
            value={bg}
            onChange={(e) => setBg(e.target.value as PaletteKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(palette).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-blue-700 rounded flex items-center gap-1"
              onClick={() => copy(output)}
            >
              <CopyIcon />
              <span>Copy ASCII</span>
            </button>
            <button
              className="px-2 py-1 bg-green-700 rounded"
              onClick={() =>
                download(
                  `${palette[fg].fgAnsi}${palette[bg].bgAnsi}${output}${ESC}[0m`,
                  'ascii-art.txt',
                )
              }
            >
              Download
            </button>
          </div>
          <pre
            className="p-[6px] whitespace-pre overflow-auto font-mono leading-none bg-gray-900 text-white"
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px` }}
          >
            {output}
          </pre>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {samples.map((s, i) => (
              <pre
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                onMouseEnter={() => copy(s)}
                className="p-2 whitespace-pre cursor-pointer bg-black hover:bg-gray-800 font-mono leading-none"
                style={{ imageRendering: 'pixelated' }}
              >
                {s}
              </pre>
            ))}
          </div>
        </div>
      )}
      {tab === 'image' && (
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={handleImage} />
          <div className="flex items-center gap-2">
            <label className="text-sm">Brightness</label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />
            <label className="text-sm">Contrast</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />
          </div>
          <select
            value={fg}
            onChange={(e) => setFg(e.target.value as PaletteKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(palette).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <select
            value={bg}
            onChange={(e) => setBg(e.target.value as PaletteKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(palette).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="px-2 py-1 text-black rounded"
          >
            {fontSizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-blue-700 rounded flex items-center gap-1"
              onClick={() => copy(imgOutput)}
            >
              <CopyIcon />
              <span>Copy ASCII</span>
            </button>
            <button
              className="px-2 py-1 bg-green-700 rounded"
              onClick={() =>
                download(
                  `${palette[fg].fgAnsi}${palette[bg].bgAnsi}${imgOutput}${ESC}[0m`,
                  'image-ascii.txt',
                )
              }
            >
              Download
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <pre
            className="p-[6px] whitespace-pre overflow-auto font-mono leading-none bg-gray-900 text-white"
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px` }}
          >
            {imgOutput}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AsciiArtApp;
