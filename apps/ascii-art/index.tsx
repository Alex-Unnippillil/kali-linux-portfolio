'use client';

import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import { useRouter } from 'next/router';

const fontList = ['Standard', 'Slant', 'Big'];
const fontSizes = [10, 12, 14];

const ramp = '@%#*+=-:. ';

const ESC = '\u001b';

const samples = [
  '¯\\_(ツ)_/¯',
  '(╯°□°）╯︵ ┻━┻',
  '┌─┐\n│ │\n└─┘',
];

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

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function wrapAnsi(text: string, fgHex: string, bgHex: string) {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bgc, bb] = hexToRgb(bgHex);
  const fgSeq = `${ESC}[38;2;${fr};${fg};${fb}m`;
  const bgSeq = `${ESC}[48;2;${br};${bgc};${bb}m`;
  return `${fgSeq}${bgSeq}${text}${ESC}[0m`;
}

const AsciiArtApp = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [font, setFont] = useState<figlet.Fonts>('Standard');
  const [output, setOutput] = useState('');
  const [fgColor, setFgColor] = useState('#00ff00');
  const [bgColor, setBgColor] = useState('#000000');
  const [fontSize, setFontSize] = useState<number>(12);

  const canvasRef = useRef<HTMLCanvasElement>(null); // for image processing
  const displayCanvasRef = useRef<HTMLCanvasElement>(null); // for final rendering
  const [imgOutput, setImgOutput] = useState('');
  const [brightness, setBrightness] = useState(0); // -1 to 1
  const [contrast, setContrast] = useState(1); // 0 to 2

    useEffect(() => {
      figlet.parseFont('Standard', Standard);
      figlet.parseFont('Slant', Slant);
      figlet.parseFont('Big', Big);
    }, []);

    // load from query string on first render
    useEffect(() => {
    if (!router.isReady) return;
    const { t, f, b, c } = router.query;
    if (typeof t === 'string') setText(t);
      if (typeof f === 'string' && fontList.includes(f)) setFont(f as figlet.Fonts);
    if (typeof b === 'string') {
      const br = parseFloat(b);
      if (!Number.isNaN(br) && br >= -1 && br <= 1) setBrightness(br);
    }
    if (typeof c === 'string') {
      const ct = parseFloat(c);
      if (!Number.isNaN(ct) && ct >= 0 && ct <= 2) setContrast(ct);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // update query string permalink
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (text) params.set('t', text);
    if (font && font !== 'Standard') params.set('f', font);
    if (brightness !== 0) params.set('b', String(brightness));
    if (contrast !== 1) params.set('c', String(contrast));
    const qs = params.toString();
    const url = qs ? `${router.pathname}?${qs}` : router.pathname;
    router.replace(url, undefined, { shallow: true });
  }, [router, text, font, brightness, contrast]);

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
      const colored = value ? wrapAnsi(value, fgColor, bgColor) : '';
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

  const renderCanvas = useCallback(
    (value: string) => {
      const canvas = displayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const lines = value.split('\n');
      const charWidth = fontSize * 0.6;
      const width = Math.max(...lines.map((l) => l.length)) * charWidth;
      const height = lines.length * fontSize;
      canvas.width = width;
      canvas.height = height;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = fgColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.textBaseline = 'top';
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, i * fontSize);
      });
    },
    [fgColor, bgColor, fontSize],
  );

  useEffect(() => {
    const value = tab === 'text' ? output : imgOutput;
    renderCanvas(value);
  }, [tab, output, imgOutput, renderCanvas]);

  const saveCanvas = (filename: string) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
  };

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
          <div className="flex gap-2">
            <label className="flex items-center gap-1">
              FG
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-10 h-6 p-0 border-0 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1">
              BG
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-6 p-0 border-0 bg-transparent"
              />
            </label>
          </div>
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
              onClick={() => download(wrapAnsi(output, fgColor, bgColor), 'ascii-art.txt')}
            >
              Download Text
            </button>
            <button
              className="px-2 py-1 bg-purple-700 rounded"
              onClick={() => saveCanvas('ascii-art.png')}
            >
              Save Image
            </button>
          </div>
          <pre
            className="p-[6px] whitespace-pre overflow-auto font-mono leading-none"
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px`, color: fgColor, backgroundColor: bgColor }}
          >
            {output}
          </pre>
          <canvas
            ref={displayCanvasRef}
            className="mt-2"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {samples.map((s, i) => (
              <pre
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
          <div className="flex gap-2">
            <label className="flex items-center gap-1">
              FG
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-10 h-6 p-0 border-0 bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1">
              BG
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-6 p-0 border-0 bg-transparent"
              />
            </label>
          </div>
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
              onClick={() => download(wrapAnsi(imgOutput, fgColor, bgColor), 'image-ascii.txt')}
            >
              Download Text
            </button>
            <button
              className="px-2 py-1 bg-purple-700 rounded"
              onClick={() => saveCanvas('image-ascii.png')}
            >
              Save Image
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <pre
            className="p-[6px] whitespace-pre overflow-auto font-mono leading-none"
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px`, color: fgColor, backgroundColor: bgColor }}
          >
            {imgOutput}
          </pre>
          <canvas
            ref={displayCanvasRef}
            className="mt-2"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  );
};

export default AsciiArtApp;
