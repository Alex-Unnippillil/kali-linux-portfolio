import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';

// Preset character sets and color palettes
const presetCharSets = {
  standard: '@#S%?*+;:,.',
  blocks: '█▓▒░ ',
  binary: '01',
};

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
  const [density, setDensity] = useState(presetCharSets.standard.length);
  const [imgSrc, setImgSrc] = useState(null);
  const undoStack = useRef([]);
  const [colors, setColors] = useState(null);
  const workerRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const prefersReducedMotion = useRef(false);

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

  // Setup worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { plain, html, ansi, colors: colorArr, width, height } = e.data;
        const update = () => {
          setPlainAscii(plain);
          setAsciiHtml(DOMPurify.sanitize(html));
          setAnsiAscii(ansi);
          setColors({ data: colorArr, width, height });
          setAltText(`ASCII art ${width}x${height}`);
        };
      if (prefersReducedMotion.current) {
        update();
      } else {
        requestAnimationFrame(update);
      }
    };
    return () => {
      workerRef.current.terminate();
    };
  }, []);

  const processFile = useCallback(async () => {
    if (!fileRef.current) return;
    const file = fileRef.current;
    const bitmap = await createImageBitmap(file);
    const effectiveCharSet = (() => {
      const chars = charSet.split('');
      const step = chars.length / density;
      let result = '';
      for (let i = 0; i < density; i += 1) {
        result += chars[Math.floor(i * step)] || '';
      }
      return result;
    })();
    if (workerRef.current && typeof OffscreenCanvas !== 'undefined') {
      workerRef.current.postMessage(
        {
          bitmap,
          charSet: effectiveCharSet,
          cellSize,
          useColor,
          palette: palettes[paletteName],
          contrast,
        },
        [bitmap]
      );
    } else {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = Math.floor(img.width / cellSize);
        const height = Math.floor(img.height / cellSize);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        let plain = '';
        let html = '';
        const chars = effectiveCharSet.split('');
        const colorArr = new Uint8ClampedArray(width * height * 3);
        for (let y = 0; y < height; y += 1) {
          let row = '';
          let htmlRow = '';
          for (let x = 0; x < width; x += 1) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const avg = ((r + g + b) / 3 - 128) * contrast + 128;
            const clamped = Math.max(0, Math.min(255, avg));
            const charIndex = Math.floor((clamped / 255) * (chars.length - 1));
            const ch = chars[chars.length - 1 - charIndex];
            row += ch;
            htmlRow += useColor
              ? `<span style="color: rgb(${r},${g},${b})">${ch}</span>`
              : ch;
            const cIdx = (y * width + x) * 3;
            colorArr[cIdx] = r;
            colorArr[cIdx + 1] = g;
            colorArr[cIdx + 2] = b;
          }
          plain += `${row}\n`;
          html += `${htmlRow}<br/>`;
        }
        setPlainAscii(plain);
        setAsciiHtml(DOMPurify.sanitize(html));
        setAnsiAscii(plain);
        setColors({ data: colorArr, width, height });
        setAltText(`ASCII art ${width}x${height}`);
      };
      img.src = URL.createObjectURL(file);
    }
  }, [charSet, density, cellSize, paletteName, useColor, contrast]);

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file) return;
      fileRef.current = file;
      setImgSrc(URL.createObjectURL(file));
      processFile();
    },
    [processFile],
  );

  useEffect(() => {
    processFile();
  }, [processFile, contrast, density, cellSize, charSet, paletteName, useColor]);

  const copyAscii = useCallback(() => {
    const text = useColor ? ansiAscii : plainAscii;
    if (text) navigator.clipboard.writeText(text);
  }, [useColor, ansiAscii, plainAscii]);

  const downloadAscii = useCallback(() => {
    const text = useColor ? ansiAscii : plainAscii;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ascii-art.txt';
    link.click();
    URL.revokeObjectURL(url);
  }, [useColor, ansiAscii, plainAscii]);

  const downloadPng = useCallback(() => {
    if (!plainAscii || !colors) return;
    const lines = plainAscii.trimEnd().split('\n');
    const width = colors.width;
    const height = colors.height;
    const canvas = canvasRef.current;
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${cellSize}px monospace`;
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
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ascii-art.png';
      link.click();
      URL.revokeObjectURL(url);
    });
  }, [plainAscii, colors, cellSize, useColor]);

  // Typing mode handlers
  const toggleTypingMode = () => {
    setTypingMode(!typingMode);
    setAltText('Custom ASCII art typing mode');
  };

  const handleEditorChange = (e) => {
    undoStack.current.push(plainAscii);
    setPlainAscii(e.target.value);
    setAsciiHtml(DOMPurify.sanitize(e.target.value.replace(/\n/g, '<br/>')));
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    setPlainAscii(prev);
    setAsciiHtml(DOMPurify.sanitize(prev.replace(/\n/g, '<br/>')));
  };

  const playAltText = () => {
    if (!altText) return;
    const utter = new SpeechSynthesisUtterance(altText);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white overflow-auto">
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
            onChange={(e) => setCharSet(e.target.value)}
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
          Copy
        </button>
        <button
          type="button"
          onClick={downloadAscii}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          TXT
        </button>
        <button
          type="button"
          onClick={downloadPng}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          PNG
        </button>
        <button
          type="button"
          onClick={toggleTypingMode}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {typingMode ? 'Image Mode' : 'Typing Mode'}
        </button>
        {typingMode && (
          <button
            type="button"
            onClick={undo}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Undo
          </button>
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
    </div>
  );
}

