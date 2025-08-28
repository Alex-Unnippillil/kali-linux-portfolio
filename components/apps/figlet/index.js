import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';

const FigletApp = () => {
  const [text, setText] = useState('');
  const [fonts, setFonts] = useState([]); // {name, preview, mono}
  const [font, setFont] = useState('');
  const [monoOnly, setMonoOnly] = useState(false);
  const [output, setOutput] = useState('');
  const [inverted, setInverted] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1);
  const [announce, setAnnounce] = useState('');
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const announceTimer = useRef(null);
  const preRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === 'font') {
        setFonts((prev) => {
          const next = [...prev, { name: e.data.font, preview: e.data.preview, mono: e.data.mono }];
          if (next.length === 1) setFont(e.data.font);
          return next;
        });
      } else if (e.data?.type === 'render') {
        setOutput(e.data.output);
        setAnnounce('Preview updated');
        clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
      }
    };
    return () => {
      workerRef.current?.terminate();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearTimeout(announceTimer.current);
    };
  }, []);

  const updateFiglet = useCallback(() => {
    if (workerRef.current && font) {
      workerRef.current.postMessage({ type: 'render', text, font });
    }
  }, [text, font]);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateFiglet);
    return () => cancelAnimationFrame(frameRef.current);
  }, [updateFiglet]);

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setAnnounce('Copied to clipboard');
      clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
    }
  };

  const exportPNG = () => {
    if (!preRef.current) return;
    toPng(preRef.current)
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'figlet.png';
        link.href = dataUrl;
        link.click();
        setAnnounce('Downloaded PNG');
        clearTimeout(announceTimer.current);
        announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
      })
      .catch(() => {
        /* ignore export errors */
      });
  };

  const exportText = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'figlet.txt';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setAnnounce('Downloaded text');
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
  };

  const displayedFonts = fonts.filter((f) => !monoOnly || f.mono);

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex flex-wrap gap-2 bg-ub-gedit-dark items-center">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={monoOnly}
            onChange={() => setMonoOnly((m) => !m)}
            aria-label="Show monospace fonts only"
          />
          Monospace only
        </label>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="px-1 bg-gray-700 text-white"
          aria-label="Select font"
        >
          {displayedFonts.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="flex-1 px-2 bg-gray-700 text-white"
          placeholder="Type here"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Text to convert"
        />
        <label className="flex items-center gap-1 text-sm">
          Size
          <input
            type="range"
            min="8"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            aria-label="Font size"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          Line
          <input
            type="range"
            min="0.8"
            max="2"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            aria-label="Line height"
          />
        </label>
        <button
          onClick={copyOutput}
          className="px-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Copy ASCII art"
        >
          Copy
        </button>
        <button
          onClick={exportPNG}
          className="px-2 bg-green-700 hover:bg-green-600 rounded text-white"
          aria-label="Export PNG"
        >
          PNG
        </button>
        <button
          onClick={exportText}
          className="px-2 bg-purple-700 hover:bg-purple-600 rounded text-white"
          aria-label="Export text file"
        >
          Text
        </button>
        <button
          onClick={() => setInverted((i) => !i)}
          className="px-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          aria-label="Invert colors"
        >
          Invert
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre
          ref={preRef}
          className={`min-w-full p-2 whitespace-pre font-mono transition-colors motion-reduce:transition-none ${
            inverted ? 'bg-white text-black' : 'bg-black text-white'
          }`}
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {output}
        </pre>
      </div>
      <div className="p-2 text-xs text-right">
        About this feature:{' '}
        <a
          href="http://www.figlet.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          FIGlet
        </a>
      </div>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
