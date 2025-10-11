import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  convertImageDataToAscii,
  renderTextToAscii,
  presetCharSets,
  palettes,
} from './asciiUtils';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PIXELS = 4_000_000;

export default function AsciiArt() {
  const [asciiHtml, setAsciiHtml] = useState('');
  const [plainAscii, setPlainAscii] = useState('');
  const [ansiAscii, setAnsiAscii] = useState('');
  const [charSet, setCharSet] = useState('');
  const [paletteName, setPaletteName] = useState('grayscale');
  const [cellSize, setCellSize] = useState(8);
  const [useColor, setUseColor] = useState(true);
  const [altText, setAltText] = useState('');
  const [mode, setMode] = useState('image');
  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [density, setDensity] = useState(presetCharSets.standard.length);
  const [imgSrc, setImgSrc] = useState(null);
  const [font, setFont] = useState('monospace');
  const [textInput, setTextInput] = useState('Kali Linux');
  const [textScale, setTextScale] = useState(1);
  const [colors, setColors] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSet = window.localStorage.getItem('ascii_char_set');
    const savedPalette = window.localStorage.getItem('ascii_palette');
    setCharSet(savedSet || presetCharSets.standard);
    setPaletteName(savedPalette || 'grayscale');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ascii_char_set', charSet || presetCharSets.standard);
      window.localStorage.setItem('ascii_palette', paletteName);
    }
  }, [charSet, paletteName]);

  useEffect(() => {
    setDensity((d) => Math.min(d, (charSet || presetCharSets.standard).length));
  }, [charSet]);

  useEffect(() => {
    if (document?.fonts) document.fonts.load('10px monospace');
  }, []);

  useEffect(() => {
    if (font !== 'monospace' && document?.fonts) {
      document.fonts.load(`10px ${font}`);
    }
  }, [font]);

  const resetAscii = useCallback((message = '') => {
    setPlainAscii('');
    setAsciiHtml('');
    setAnsiAscii('');
    setColors(null);
    setAltText(message);
  }, []);

  const applyResult = useCallback((result, description) => {
    setPlainAscii(result.plain);
    setAsciiHtml(DOMPurify.sanitize(result.html));
    setAnsiAscii(result.ansi);
    setColors(result.colors);
    setAltText(description);
  }, []);

  const processImage = useCallback(async () => {
    if (mode !== 'image') return;
    const file = fileRef.current;
    if (!file) {
      resetAscii('Upload an image to generate ASCII art.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      resetAscii('Image exceeds the 2MB upload limit.');
      setErrorMessage('The selected file is larger than 2MB.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > MAX_PIXELS) {
        resetAscii('Image exceeds the 4 million pixel conversion cap.');
        setErrorMessage('Choose a smaller image (under 4 million pixels).');
        return;
      }
      const width = Math.max(1, Math.floor(bitmap.width / cellSize));
      const height = Math.max(1, Math.floor(bitmap.height / cellSize));
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const result = convertImageDataToAscii(imageData, {
        charSet,
        density,
        contrast,
        brightness,
        useColor,
        palette: palettes[paletteName],
      });
      applyResult(result, `ASCII art ${width}x${height}`);
      setErrorMessage('');
    } catch (error) {
      resetAscii('Unable to process the selected image.');
      setErrorMessage('Image processing failed. Try another file.');
    }
  }, [mode, cellSize, charSet, density, contrast, brightness, useColor, paletteName, applyResult, resetAscii]);

  const processText = useCallback(async () => {
    if (mode !== 'text') return;
    if (!textInput.trim()) {
      resetAscii('Enter text to render ASCII art.');
      return;
    }
    try {
      const result = await renderTextToAscii(textInput, {
        charSet,
        density,
        contrast,
        brightness,
        useColor,
        palette: palettes[paletteName],
        scale: textScale,
      });
      applyResult(result, `ASCII text ${result.width}x${result.height}`);
      setErrorMessage('');
    } catch (error) {
      resetAscii('Unable to render text to ASCII art.');
      setErrorMessage('Text rendering failed.');
    }
  }, [mode, textInput, charSet, density, contrast, brightness, useColor, paletteName, textScale, applyResult, resetAscii]);

  const handleFile = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      fileRef.current = file;
      setImgSrc(URL.createObjectURL(file));
      setMode('image');
      processImage();
    },
    [processImage],
  );

  useEffect(() => {
    if (mode === 'image') {
      processImage();
    }
  }, [mode, processImage, contrast, brightness, density, cellSize, charSet, paletteName, useColor]);

  useEffect(() => {
    if (mode === 'text') {
      processText();
    }
  }, [mode, processText, textInput, textScale, charSet, density, contrast, brightness, paletteName, useColor]);

  const copyAscii = useCallback(() => {
    const text = useColor ? ansiAscii : plainAscii;
    if (text) navigator.clipboard.writeText(text);
  }, [useColor, ansiAscii, plainAscii]);

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
        const ch = lines[y]?.[x] || ' ';
        ctx.fillText(ch, x * cellSize, y * cellSize);
      }
    }
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'ascii-art.png';
    link.click();
  }, [plainAscii, colors, cellSize, useColor, font]);

  const playAltText = () => {
    if (!altText) return;
    const utter = new SpeechSynthesisUtterance(altText);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-2 flex flex-wrap gap-2 items-center">
        <input type="file" accept="image/*" onChange={handleFile} className="mb-2" />
        <label className="flex items-center gap-2">
          Charset:
          <input
            type="text"
            value={charSet}
            onChange={(e) => setCharSet(DOMPurify.sanitize(e.target.value).slice(0, 256))}
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
            max={(charSet || presetCharSets.standard).length || 2}
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
            {['monospace', 'Courier New', 'Fira Code'].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Color
          <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} />
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
          onClick={() => setMode(mode === 'text' ? 'image' : 'text')}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          {mode === 'text' ? 'Image Mode' : 'Text Mode'}
        </button>
        <button
          type="button"
          onClick={playAltText}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Alt
        </button>
      </div>
      {errorMessage && (
        <div className="mb-2 text-sm text-red-300" role="status">
          {errorMessage}
        </div>
      )}
      {imgSrc && mode === 'image' && (
        <img src={imgSrc} alt="original image preview" className="max-h-48 mb-2 object-contain" />
      )}
      {mode === 'text' && (
        <div className="mb-2 w-full flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span>Text input</span>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value.slice(0, 512))}
              className="font-mono bg-gray-800 text-white resize-y min-h-[100px]"
              maxLength={512}
            />
          </label>
          <label className="flex items-center gap-2">
            Text scale
            <input
              type="range"
              min="1"
              max="4"
              value={textScale}
              onChange={(e) => setTextScale(Number(e.target.value))}
              className="w-32"
            />
          </label>
        </div>
      )}
      <pre
        className="font-mono whitespace-pre overflow-auto flex-1"
        dangerouslySetInnerHTML={{ __html: asciiHtml }}
      />
      <canvas ref={canvasRef} className="hidden w-full h-full" />
      <div className="sr-only" aria-live="polite">
        {altText}
      </div>
    </div>
  );
}

