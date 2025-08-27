import React, { useState, useRef, useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

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
  const [charSet, setCharSet] = usePersistentState(
    'ascii_char_set',
    presetCharSets.standard
  );
  const [paletteName, setPaletteName] = usePersistentState(
    'ascii_palette',
    'grayscale'
  );
  const [cellSize, setCellSize] = useState(8);
  const [outputWidth, setOutputWidth] = useState(80);
  const [useColor, setUseColor] = useState(true);
  const [altText, setAltText] = useState('');
  const [typingMode, setTypingMode] = useState(false);
  const undoStack = useRef([]);
  const [colors, setColors] = useState(null);
  const workerRef = useRef(null);
  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const [presets, setPresets] = usePersistentState('ascii_presets', []);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  const savePreset = () => {
    if (!presetName) return;
    const newPreset = {
      name: presetName,
      charSet,
      paletteName,
      cellSize,
      outputWidth,
      useColor,
    };
    setPresets((prev) => {
      const others = prev.filter((p) => p.name !== presetName);
      return [...others, newPreset];
    });
    setPresetName('');
  };

  const loadPreset = (name) => {
    const p = presets.find((pr) => pr.name === name);
    if (!p) return;
    setCharSet(p.charSet);
    setPaletteName(p.paletteName);
    setCellSize(p.cellSize || 8);
    setOutputWidth(p.outputWidth || 80);
    setUseColor(p.useColor ?? true);
  };

  const deletePreset = (name) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
    if (selectedPreset === name) setSelectedPreset('');
  };

  // Setup worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { plain, html, ansi, colors: colorArr, width, height } = e.data;
      setPlainAscii(plain);
      setAsciiHtml(html);
      setAnsiAscii(ansi);
      setColors({ data: colorArr, width, height });
      setAltText(`ASCII art ${width}x${height}`);
    };
    return () => {
      workerRef.current.terminate();
    };
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const bitmap = await createImageBitmap(file);
    if (workerRef.current && typeof OffscreenCanvas !== 'undefined') {
      workerRef.current.postMessage(
        {
          bitmap,
          charSet,
          width: outputWidth,
          useColor,
          palette: palettes[paletteName],
        },
        [bitmap]
      );
    } else {
      // Fallback to processing on main thread
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = img.width / outputWidth;
        const width = outputWidth;
        const height = Math.round(img.height / scale);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);
        let plain = '';
        let html = '';
        const chars = charSet.split('');
        const colorArr = new Uint8ClampedArray(width * height * 3);
        for (let y = 0; y < height; y += 1) {
          let row = '';
          let htmlRow = '';
          for (let x = 0; x < width; x += 1) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const avg = (r + g + b) / 3;
            const charIndex = Math.floor((avg / 255) * (chars.length - 1));
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
        setAsciiHtml(html);
        setAnsiAscii(plain);
        setColors({ data: colorArr, width, height });
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const copyAscii = () => {
    const text = useColor ? ansiAscii : plainAscii;
    if (text) navigator.clipboard.writeText(text);
  };

  const downloadAscii = () => {
    const text = useColor ? ansiAscii : plainAscii;
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ascii-art.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
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
  };

  // Typing mode handlers
  const toggleTypingMode = () => {
    setTypingMode(!typingMode);
    setAltText('Custom ASCII art typing mode');
  };

  const handleEditorChange = (e) => {
    undoStack.current.push(plainAscii);
    setPlainAscii(e.target.value);
    setAsciiHtml(e.target.value.replace(/\n/g, '<br/>'));
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop();
    setPlainAscii(prev);
    setAsciiHtml(prev.replace(/\n/g, '<br/>'));
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
          Width:
          <input
            type="range"
            min="20"
            max="200"
            value={outputWidth}
            onChange={(e) => setOutputWidth(Number(e.target.value))}
            className="bg-gray-700"
          />
          <span>{outputWidth}</span>
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="px-1 bg-gray-700"
          />
          <button
            type="button"
            onClick={savePreset}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Save
          </button>
          <select
            value={selectedPreset}
            onChange={(e) => {
              const name = e.target.value;
              setSelectedPreset(name);
              if (name) loadPreset(name);
            }}
            className="bg-gray-700"
          >
            <option value="">Load</option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => deletePreset(selectedPreset)}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Delete
          </button>
        </div>
      </div>
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
        <div className="relative flex-1 overflow-auto">
          <button
            type="button"
            onClick={copyAscii}
            className="absolute right-2 top-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy
          </button>
          <pre
            className="font-mono whitespace-pre h-full w-full"
            dangerouslySetInnerHTML={{ __html: asciiHtml }}
          />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden w-full h-full" />
      <div className="sr-only" aria-live="polite">
        {altText}
      </div>
    </div>
  );
}

