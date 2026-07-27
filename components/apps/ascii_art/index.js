import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';

// Preset character sets and color palettes
const presetCharSets = {
  standard: '@#S%?*+;:,.',
  blocks: '█▓▒░ ',
  binary: '01',
};

const figletFonts = ['Standard', 'Slant', 'Big'];

const palettes = {
  grayscale: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
  ansi16: [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
  ],
};

export default function AsciiArt() {
  const [mode, setMode] = useState('image');
  const [figletText, setFigletText] = useState('');
  const [figletFont, setFigletFont] = useState(figletFonts[0]);
  const [figletOutput, setFigletOutput] = useState('');
  const [figletNotice, setFigletNotice] = useState('');
  const [asciiHtml, setAsciiHtml] = useState('');
  const [plainAscii, setPlainAscii] = useState('');
  const [ansiAscii, setAnsiAscii] = useState('');
  const [charSet, setCharSet] = useState('');
  const [paletteName, setPaletteName] = useState('grayscale');
  const [cellSize, setCellSize] = useState(8);
  const [useColor, setUseColor] = useState(true);
  const [altText, setAltText] = useState('');
  const [typingMode, setTypingMode] = useState(false);
  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [density, setDensity] = useState(presetCharSets.standard.length);
  const [imgSrc, setImgSrc] = useState(null);
  const [font, setFont] = useState('monospace');
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [colors, setColors] = useState(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const prefersReducedMotion = useRef(false);
  const fonts = ['monospace', 'Courier New', 'Fira Code'];

  // Load saved preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSet = window.localStorage.getItem('ascii_char_set');
    const savedPalette = window.localStorage.getItem('ascii_palette');
    setCharSet(savedSet || presetCharSets.standard);
    setPaletteName(savedPalette || 'grayscale');
    prefersReducedMotion.current = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;
  }, []);

  // Persist preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ascii_char_set', charSet);
      window.localStorage.setItem('ascii_palette', paletteName);
    }
  }, [charSet, paletteName]);

  // Update density when charset changes
  useEffect(() => {
    setDensity((d) => Math.min(d, charSet.length));
  }, [charSet]);

  // Preload default font
  useEffect(() => {
    if (document?.fonts) document.fonts.load('10px monospace');
  }, []);

  useEffect(() => {
    if (font !== 'monospace' && document?.fonts) {
      document.fonts.load(`10px ${font}`);
    }
  }, [font]);

  useEffect(() => {
    figlet.parseFont('Standard', Standard);
    figlet.parseFont('Slant', Slant);
    figlet.parseFont('Big', Big);
  }, []);

  useEffect(() => {
    try {
      setFigletOutput(figlet.textSync(figletText || '', { font: figletFont }));
    } catch {
      setFigletOutput('');
    }
  }, [figletText, figletFont]);

  // Canvas will be used for processing and exporting

  const processFile = useCallback(async () => {
    if (!fileRef.current) return;
    const file = fileRef.current;
    if (file.size > 2 * 1024 * 1024) return; // limit 2MB
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 4_000_000) return; // size limit

    const effectiveCharSet = (() => {
      const chars = charSet.split('');
      const step = chars.length / density;
      let result = '';
      for (let i = 0; i < density; i += 1) {
        result += chars[Math.floor(i * step)] || '';
      }
      return result;
    })();

    const width = Math.floor(bitmap.width / cellSize);
    const height = Math.floor(bitmap.height / cellSize);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const colorsArr = new Uint8ClampedArray(width * height * 3);
    const gray = new Float32Array(width * height);

    for (let i = 0; i < width * height; i += 1) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      let val = 0.299 * r + 0.587 * g + 0.114 * b;
      val += brightness;
      val = (val - 128) * contrast + 128;
      gray[i] = Math.max(0, Math.min(255, val));
    }

    const paletteArr = palettes[paletteName] || [];
    const mapToPalette = (r, g, b) => {
      if (!paletteArr.length) return [r, g, b];
      let best = paletteArr[0];
      let bestDist = Infinity;
      for (let i = 0; i < paletteArr.length; i += 1) {
        const p = paletteArr[i];
        const dr = r - p[0];
        const dg = g - p[1];
        const db = b - p[2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = p;
        }
      }
      return best;
    };

    setPlainAscii('');
    setAsciiHtml('');
    setAnsiAscii('');

    let y = 0;
    const step = () => {
      const start = performance.now();
      let plainChunk = '';
      let htmlChunk = '';
      let ansiChunk = '';
      while (y < height && performance.now() - start < 16) {
        let plainRow = '';
        let htmlRow = '';
        let ansiRow = '';
        for (let x = 0; x < width; x += 1) {
          const idx = y * width + x;
          const gx = gray[idx];
          const charIndex = Math.floor((gx / 255) * (effectiveCharSet.length - 1));
          const newPixel = (charIndex / (effectiveCharSet.length - 1)) * 255;
          const error = gx - newPixel;
          if (x + 1 < width) gray[idx + 1] += error * (7 / 16);
          if (y + 1 < height) {
            if (x > 0) gray[idx + width - 1] += error * (3 / 16);
            gray[idx + width] += error * (5 / 16);
            if (x + 1 < width) gray[idx + width + 1] += error * (1 / 16);
          }
          const pixelIndex = idx * 4;
          let r = data[pixelIndex];
          let g = data[pixelIndex + 1];
          let b = data[pixelIndex + 2];
          [r, g, b] = mapToPalette(r, g, b);
          const cIdx = idx * 3;
          colorsArr[cIdx] = r;
          colorsArr[cIdx + 1] = g;
          colorsArr[cIdx + 2] = b;
          const ch = effectiveCharSet[effectiveCharSet.length - 1 - charIndex];
          plainRow += ch;
          if (useColor) {
            htmlRow += `<span style="color: rgb(${r},${g},${b})">${ch}</span>`;
            ansiRow += `\u001b[38;2;${r};${g};${b}m${ch}`;
          } else {
            htmlRow += ch;
            ansiRow += ch;
          }
        }
        plainChunk += `${plainRow}\n`;
        htmlChunk += `${htmlRow}<br/>`;
        ansiChunk += `${ansiRow}\u001b[0m\n`;
        y += 1;
      }
      if (plainChunk) {
        setPlainAscii((p) => p + plainChunk);
        setAsciiHtml((h) => h + DOMPurify.sanitize(htmlChunk));
        setAnsiAscii((a) => a + ansiChunk);
      }
      if (y < height) {
        requestAnimationFrame(step);
      } else {
        const update = () => {
          setColors({ data: colorsArr, width, height });
          setAltText(`ASCII art ${width}x${height}`);
        };
        if (prefersReducedMotion.current) {
          update();
        } else {
          requestAnimationFrame(update);
        }
      }
    };
    requestAnimationFrame(step);
  }, [charSet, density, cellSize, paletteName, useColor, contrast, brightness]);

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      fileRef.current = file;
      setImgSrc(URL.createObjectURL(file));
      processFile();
    },
    [processFile],
  );

  useEffect(() => {
    processFile();
  }, [processFile, contrast, brightness, density, cellSize, charSet, paletteName, useColor]);

  const copyAscii = useCallback(() => {
    const text = useColor ? ansiAscii : plainAscii;
    if (text) navigator.clipboard.writeText(text);
  }, [useColor, ansiAscii, plainAscii]);

  const copyFiglet = useCallback(() => {
    if (!figletOutput) return;
    navigator.clipboard.writeText(figletOutput);
    setFigletNotice('Copied banner text');
    setTimeout(() => setFigletNotice(''), 2000);
  }, [figletOutput]);

  const downloadAnsi = useCallback(() => {
    if (!ansiAscii) return;
    const blob = new Blob([ansiAscii], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ascii-art.ans';
    link.click();
    URL.revokeObjectURL(url);
  }, [ansiAscii]);

  const downloadTxt = useCallback(() => {
    if (!plainAscii) return;
    const blob = new Blob([plainAscii], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ascii-art.txt';
    link.click();
    URL.revokeObjectURL(url);
  }, [plainAscii]);

  const downloadPng = useCallback(async () => {
    if (!plainAscii || !colors) return;
    const lines = plainAscii.trimEnd().split('\n');
    const width = colors.width;
    const height = colors.height;
    const canvas = canvasRef.current;
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (document?.fonts) {
      await document.fonts.load(`${cellSize}px ${font}`);
    }
    ctx.font = `${cellSize}px ${font}`;
    ctx.textBaseline = 'top';
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cIdx = (y * width + x) * 3;
        const r = colors.data[cIdx];
        const g = colors.data[cIdx + 1];
        const b = colors.data[cIdx + 2];
        ctx.fillStyle = useColor ? `rgb(${r},${g},${b})` : '#FFFFFF';
        const ch = lines[y][x];
        ctx.fillText(ch, x * cellSize, y * cellSize);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let x = 0; x <= width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, height * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(width * cellSize, y * cellSize + 0.5);
      ctx.stroke();
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'ascii-art.png';
    link.click();
  }, [plainAscii, colors, cellSize, useColor, font]);

  // Typing mode handlers
  const toggleTypingMode = () => {
    setTypingMode(!typingMode);
    setAltText('Custom ASCII art typing mode');
  };

  const handleEditorChange = (e) => {
    undoStack.current.push(plainAscii);
    redoStack.current = [];
    setPlainAscii(e.target.value);
    setAsciiHtml(DOMPurify.sanitize(e.target.value.replace(/\n/g, '<br/>')));
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(plainAscii);
    const prev = undoStack.current.pop();
    setPlainAscii(prev);
    setAsciiHtml(DOMPurify.sanitize(prev.replace(/\n/g, '<br/>')));
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(plainAscii);
    const next = redoStack.current.pop();
    setPlainAscii(next);
    setAsciiHtml(DOMPurify.sanitize(next.replace(/\n/g, '<br/>')));
  };

  const handleEditorKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
  };

  const playAltText = () => {
    if (!altText) return;
    const utter = new SpeechSynthesisUtterance(altText);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('image')}
          className={`px-2 py-1 rounded ${
            mode === 'image' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Image to ASCII
        </button>
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`px-2 py-1 rounded ${
            mode === 'text' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Text to ASCII
        </button>
      </div>
      {mode === 'text' && (
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2">
              Font
              <select
                value={figletFont}
                onChange={(e) => setFigletFont(e.target.value)}
                className="bg-gray-700 px-2 py-1"
              >
                {figletFonts.map((fontName) => (
                  <option key={fontName} value={fontName}>
                    {fontName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={copyFiglet}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Copy Output
            </button>
          </div>
          <textarea
            value={figletText}
            onChange={(e) => setFigletText(e.target.value)}
            className="min-h-[4rem] w-full resize-none rounded bg-gray-800 px-2 py-1 text-white"
            placeholder="Type text to convert with FIGlet"
          />
          <pre className="whitespace-pre overflow-auto rounded bg-gray-900 p-2">
            {figletOutput}
          </pre>
          <div className="sr-only" aria-live="polite">
            {figletNotice}
          </div>
        </div>
      )}
      {mode === 'image' && (
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="mb-2"
        />
        <label className="flex items-center gap-2">
          Charset:
          <input
            type="text"
            value={charSet}
            onChange={(e) =>
              setCharSet(DOMPurify.sanitize(e.target.value).slice(0, 256))
            }
            className="px-1 bg-gray-700"
          />
        </label>
        <label className="flex items-center gap-2">
          Preset:
          <select
            onChange={(e) => setCharSet(presetCharSets[e.target.value])}
            className="bg-gray-700"
            defaultValue="standard"
          >
            {Object.keys(presetCharSets).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Cell:
          <input
            type="number"
            min="4"
            max="32"
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
            className="w-16 px-1 bg-gray-700"
          />
        </label>
        <label className="flex items-center gap-2">
          Brightness:
          <input
            type="range"
            min="-100"
            max="100"
            step="10"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-24"
            aria-label="Brightness"
          />
        </label>
        <label className="flex items-center gap-2">
          Contrast:
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-24"
            aria-label="Contrast"
          />
        </label>
        <label className="flex items-center gap-2">
          Density:
          <input
            type="range"
            min="2"
            max={charSet.length || 2}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
            className="w-24"
            aria-label="Character density"
          />
        </label>
        <label className="flex items-center gap-2">
          Palette:
          <select
            value={paletteName}
            onChange={(e) => setPaletteName(e.target.value)}
            className="bg-gray-700"
          >
            {Object.keys(palettes).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Font:
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="bg-gray-700"
          >
            {fonts.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Color
          <input
            type="checkbox"
            checked={useColor}
            onChange={(e) => setUseColor(e.target.checked)}
          />
        </label>
        <button
          type="button"
          onClick={copyAscii}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Copy Text
        </button>
        <button
          type="button"
          onClick={downloadAnsi}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          ANSI
        </button>
        <button
          type="button"
          onClick={downloadTxt}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          TXT
        </button>
        <button
          type="button"
          onClick={downloadPng}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Export PNG
        </button>
        <button
          type="button"
          onClick={toggleTypingMode}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {typingMode ? 'Image Mode' : 'Typing Mode'}
        </button>
        {typingMode && (
          <>
            <button
              type="button"
              onClick={undo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redo}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Redo
            </button>
          </>
        )}
        <button
          type="button"
          onClick={playAltText}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Alt
        </button>
      </div>
      {imgSrc && !typingMode && (
        <img
          src={imgSrc}
          alt="original image preview"
          className="max-h-48 mb-2 object-contain"
        />
      )}
      {typingMode ? (
        <textarea
          ref={editorRef}
          value={plainAscii}
          onChange={handleEditorChange}
          onKeyDown={handleEditorKeyDown}
          className="flex-1 font-mono bg-gray-800 text-white resize-none"
          style={{
            lineHeight: `${cellSize}px`,
            fontSize: `${cellSize}px`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundImage:
              'linear-gradient(0deg, transparent calc(100% - 1px), rgba(255,255,255,0.1) calc(100% - 1px)), linear-gradient(90deg, transparent calc(100% - 1px), rgba(255,255,255,0.1) calc(100% - 1px))',
          }}
        />
      ) : (
        <pre
          className="font-mono whitespace-pre overflow-auto flex-1"
          dangerouslySetInnerHTML={{ __html: asciiHtml }}
        />
      )}
      <canvas ref={canvasRef} className="hidden w-full h-full" />
      <div className="sr-only" aria-live="polite">
        {altText}
      </div>
      )}
    </div>
  );
}
