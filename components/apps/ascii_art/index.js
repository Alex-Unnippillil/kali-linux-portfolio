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
  const [font, setFont] = useState('monospace');
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [colors, setColors] = useState(null);
  const workerRef = useRef(null);
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

  // Setup worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./ascii.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'chunk') {
        const { plain, html, ansi } = e.data;
        setPlainAscii((p) => p + plain);
        setAsciiHtml((h) => h + DOMPurify.sanitize(html));
        setAnsiAscii((a) => a + ansi);
      } else if (type === 'done') {
        const { colors: colorArr, width, height } = e.data;
        const update = () => {
          setColors({ data: colorArr, width, height });
          setAltText(`ASCII art ${width}x${height}`);
        };
        if (prefersReducedMotion.current) {
          update();
        } else {
          requestAnimationFrame(update);
        }
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

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
    setPlainAscii('');
    setAsciiHtml('');
    setAnsiAscii('');
    workerRef.current?.postMessage(
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
  }, [charSet, density, cellSize, paletteName, useColor, contrast]);

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

  const downloadPng = useCallback(async () => {
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
    </div>
  );
}

