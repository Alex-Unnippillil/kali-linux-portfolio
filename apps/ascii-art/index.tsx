'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import { useRouter } from 'next/router';

const fontList = ['Standard', 'Slant', 'Big'];

const ramp = '@%#*+=-:. ';

const ESC = '\u001b';

const colorOptions = {
  green: { label: 'Green', ansi: `${ESC}[32m`, class: 'text-green-400' },
  red: { label: 'Red', ansi: `${ESC}[31m`, class: 'text-red-400' },
  yellow: { label: 'Yellow', ansi: `${ESC}[33m`, class: 'text-yellow-400' },
  blue: { label: 'Blue', ansi: `${ESC}[34m`, class: 'text-blue-400' },
  magenta: { label: 'Magenta', ansi: `${ESC}[35m`, class: 'text-fuchsia-400' },
  cyan: { label: 'Cyan', ansi: `${ESC}[36m`, class: 'text-cyan-400' },
  white: { label: 'White', ansi: `${ESC}[37m`, class: 'text-white' },
};

type ColorKey = keyof typeof colorOptions;

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
    const [font, setFont] = useState<figlet.Fonts>('Standard');
  const [output, setOutput] = useState('');
  const [color, setColor] = useState<ColorKey>('green');

  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  }, [text, font, brightness, contrast]);

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
        ? `${colorOptions[color].ansi}${value}${ESC}[0m`
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

  const renderImageAscii = () => {
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
  };

  useEffect(() => {
    renderImageAscii();
  }, [brightness, contrast]);

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
          <input
            type="text"
            className="px-2 py-1 text-black rounded"
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
            value={color}
            onChange={(e) => setColor(e.target.value as ColorKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(colorOptions).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-blue-700 rounded"
              onClick={() => copy(output)}
            >
              Copy
            </button>
            <button
              className="px-2 py-1 bg-green-700 rounded"
              onClick={() =>
                download(
                  `${colorOptions[color].ansi}${output}${ESC}[0m`,
                  'ascii-art.txt',
                )
              }
            >
              Download
            </button>
          </div>
          <pre
            className={`bg-black p-2 whitespace-pre overflow-auto ${colorOptions[color].class}`}
          >
            {output}
          </pre>
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
            value={color}
            onChange={(e) => setColor(e.target.value as ColorKey)}
            className="px-2 py-1 text-black rounded"
          >
            {Object.entries(colorOptions).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-blue-700 rounded"
              onClick={() => copy(imgOutput)}
            >
              Copy
            </button>
            <button
              className="px-2 py-1 bg-green-700 rounded"
              onClick={() =>
                download(
                  `${colorOptions[color].ansi}${imgOutput}${ESC}[0m`,
                  'image-ascii.txt',
                )
              }
            >
              Download
            </button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <pre
            className={`bg-black p-2 whitespace-pre overflow-auto ${colorOptions[color].class}`}
          >
            {imgOutput}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AsciiArtApp;
