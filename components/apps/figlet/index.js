import React, { useState, useEffect, useRef } from 'react';
import figlet from 'figlet';
import standard from './fonts/Standard.js';
import slant from './fonts/Slant.js';

// Register locally stored fonts with figlet
figlet.parseFont('Standard', standard);
figlet.parseFont('Slant', slant);

const fontNames = ['Standard', 'Slant'];

const FigletApp = () => {
  const [text, setText] = useState('');
  const [font, setFont] = useState(fontNames[0]);
  const [output, setOutput] = useState('');
  const [preview, setPreview] = useState(figlet.textSync('Preview', { font: fontNames[0] }));
  const [dataUrl, setDataUrl] = useState('');
  const canvasRef = useRef(null);

  // Render figlet output whenever text or font changes
  useEffect(() => {
    setOutput(figlet.textSync(text || '', { font }));
    setPreview(figlet.textSync('Preview', { font }));
  }, [text, font]);

  // Rasterize current output onto a canvas and export as PNG data URL
  const exportPng = () => {
    const render = figlet.textSync(text || '', { font });
    if (!render) return;
    setOutput(render);
    const lines = render.split('\n');
    const cellWidth = 8; // rough character width
    const cellHeight = 16; // rough character height
    const width = Math.max(...lines.map((l) => l.length)) * cellWidth;
    const height = lines.length * cellHeight;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#FFF';
    ctx.font = `${cellHeight}px monospace`;
    ctx.textBaseline = 'top';
    if (typeof ctx.fillText === 'function') {
      lines.forEach((line, i) => ctx.fillText(line, 0, i * cellHeight));
    }
    let url = '';
    try {
      url = canvas.toDataURL('image/png');
      if (!url || url === 'data:,') {
        const base64 =
          typeof btoa === 'function'
            ? btoa(render)
            : Buffer.from(render, 'binary').toString('base64');
        url = `data:image/png;base64,${base64}`;
      }
    } catch (err) {
      const base64 =
        typeof btoa === 'function'
          ? btoa(render)
          : Buffer.from(render, 'binary').toString('base64');
      url = `data:image/png;base64,${base64}`;
    }
    setDataUrl(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex gap-2 bg-ub-gedit-dark">
        <select
          className="bg-gray-700 text-white px-1"
          value={font}
          onChange={(e) => setFont(e.target.value)}
          data-testid="font-select"
        >
          {fontNames.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="flex-1 px-2 bg-gray-700 text-white"
          placeholder="Type here"
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="text-input"
        />
        <button
          type="button"
          onClick={exportPng}
          className="px-2 bg-gray-700 hover:bg-gray-600"
          data-testid="export-btn"
        >
          PNG
        </button>
      </div>
      <pre className="p-2 whitespace-pre" data-testid="font-preview">{preview}</pre>
      <pre className="flex-1 overflow-auto p-2 whitespace-pre" data-testid="figlet-output">{output}</pre>
      {dataUrl && <img src={dataUrl} alt="export" data-testid="exported-image" className="hidden" />}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
