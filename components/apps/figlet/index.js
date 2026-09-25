import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import AlignmentControls from '../../../apps/figlet/components/AlignmentControls';
import FontDropdown from '../../../apps/figlet/components/FontDropdown';

const FigletApp = () => {
  const [text, setText] = useState('');
  const [fonts, setFonts] = useState([]); // {name, preview, mono}
  const [font, setFont] = useState('');
  const [monoOnly, setMonoOnly] = useState(false);
  const [output, setOutput] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1);
  const [width, setWidth] = useState(80);
  const [layout, setLayout] = useState('default');
  const [kerning, setKerning] = useState(0); // letter spacing
  const [gradient, setGradient] = useState(0);
  const [align, setAlign] = useState('left');
  const [padding, setPadding] = useState(0);
  const [wrap, setWrap] = useState(false);
  const [announce, setAnnounce] = useState('');
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const announceTimer = useRef(null);
  const preRef = useRef(null);
  const uploadedFonts = useRef({});
  const [serverFontNames, setServerFontNames] = useState([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('text');
    if (t) setText(t);
    const f = params.get('font');
    if (f) setFont(f);
    const s = Number(params.get('size'));
    if (!Number.isNaN(s)) setFontSize(s);
    const l = Number(params.get('line'));
    if (!Number.isNaN(l)) setLineHeight(l);
    const w = Number(params.get('width'));
    if (!Number.isNaN(w)) setWidth(w);
    const la = params.get('layout');
    if (la) setLayout(la);
    const a = params.get('align');
    if (a) setAlign(a);
    const g = Number(params.get('gradient'));
    if (!Number.isNaN(g)) setGradient(g);
    const k = Number(params.get('kerning'));
    if (!Number.isNaN(k)) setKerning(k);
    const pd = Number(params.get('pad'));
    if (!Number.isNaN(pd)) setPadding(pd);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
      workerRef.current.onmessage = (e) => {
        if (e.data?.type === 'font') {
          setFonts((prev) => [...prev, { name: e.data.font, preview: e.data.preview, mono: e.data.mono }]);
        } else if (e.data?.type === 'render') {
          setRawOutput(e.data.output);
          setAnnounce('Preview updated');
          clearTimeout(announceTimer.current);
          announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
        }
      };

      (async () => {
        try {
          if (navigator?.storage?.getDirectory) {
            const dir = await navigator.storage.getDirectory();
            const handle = await dir.getFileHandle('figlet-last-font.json');
            const file = await handle.getFile();
            const saved = JSON.parse(await file.text());
            if (saved.data) {
              uploadedFonts.current[saved.font] = saved.data;
              workerRef.current.postMessage({ type: 'load', name: saved.font, data: saved.data });
            }
            if (saved.font) setFont(saved.font);
          }
        } catch {
          /* ignore */
        }

        try {
          const res = await fetch('/api/figlet/fonts');
          if (res.ok) {
            const { fonts: list } = await res.json();
            const names = [];
            list.forEach(({ name, data }) => {
              names.push(name);
              uploadedFonts.current[name] = data;
              workerRef.current.postMessage({ type: 'load', name, data });
            });
            if (names.length) setServerFontNames(names);
          }
        } catch {
          /* ignore */
        }
      })();

      return () => {
        workerRef.current?.terminate();
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        clearTimeout(announceTimer.current);
      };
    }
    return undefined;
  }, []);

  const updateFiglet = useCallback(() => {
    if (workerRef.current && font) {
      workerRef.current.postMessage({ type: 'render', text, font, width, layout });
    }
  }, [text, font, width, layout]);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateFiglet);
    return () => cancelAnimationFrame(frameRef.current);
  }, [updateFiglet]);

  useEffect(() => {
    if (!rawOutput) {
      setOutput('');
      return;
    }
    const lines = rawOutput.split('\n').map((l) => l.replace(/\s+$/, ''));
    const max = lines.reduce((m, l) => Math.max(m, l.length), 0);
    const transformed = lines
      .map((line) => {
        let result = line;
        if (align === 'right') {
          result = ' '.repeat(max - line.length) + line;
        } else if (align === 'center') {
          const space = Math.floor((max - line.length) / 2);
          result = ' '.repeat(space) + line;
        } else if (align === 'justify') {
          const words = line.trim().split(/ +/);
          if (words.length > 1) {
            const totalSpaces = max - words.reduce((sum, w) => sum + w.length, 0);
            const gaps = words.length - 1;
            const even = Math.floor(totalSpaces / gaps);
            const extra = totalSpaces % gaps;
            result = words
              .map((w, i) =>
                w + (i < gaps ? ' '.repeat(even + (i < extra ? 1 : 0)) : '')
              )
              .join('');
          }
        }
        return ' '.repeat(padding) + result;
      })
      .join('\n');
    setOutput(transformed);
  }, [rawOutput, align, padding]);

  const selectAll = () => {
    if (!preRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(preRef.current);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const copyAll = () => {
    if (!preRef.current) return;
    selectAll();
    navigator.clipboard.writeText(preRef.current.textContent || '');
    setAnnounce('Copied to clipboard');
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.flf$/i, '');
    const data = await file.text();
    uploadedFonts.current[name] = data;
    workerRef.current?.postMessage({ type: 'load', name, data });
    setFont(name);
    e.target.value = '';
  };

  const displayedFonts = fonts.filter((f) => !monoOnly || f.mono);

  useEffect(() => {
    if (fonts.length && !font) setFont(fonts[0].name);
  }, [fonts, font]);

  useEffect(() => {
    if (font && fonts.find((f) => f.name === font)) updateFiglet();
  }, [fonts, font, updateFiglet]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (text) params.set('text', text);
    if (font) params.set('font', font);
    if (fontSize !== 16) params.set('size', String(fontSize));
    if (lineHeight !== 1) params.set('line', String(lineHeight));
    if (width !== 80) params.set('width', String(width));
    if (layout !== 'default') params.set('layout', layout);
    if (align !== 'left') params.set('align', align);
    if (padding !== 0) params.set('pad', String(padding));
    if (gradient !== 0) params.set('gradient', String(gradient));
    if (kerning !== 0) params.set('kerning', String(kerning));
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
  }, [text, font, fontSize, lineHeight, width, layout, align, gradient, kerning, padding]);

  useEffect(() => {
    if (!font || !navigator?.storage?.getDirectory) return;
    (async () => {
      try {
        const dir = await navigator.storage.getDirectory();
        const handle = await dir.getFileHandle('figlet-last-font.json', { create: true });
        const writable = await handle.createWritable();
        const data = uploadedFonts.current[font]
          ? { font, data: uploadedFonts.current[font] }
          : { font };
        await writable.write(JSON.stringify(data));
        await writable.close();
      } catch {
        /* ignore */
      }
    })();
  }, [font]);

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
        <FontDropdown
          fonts={displayedFonts}
          value={font}
          onChange={setFont}
        />
        <input
          type="file"
          accept=".flf"
          onChange={handleUpload}
          className="text-sm"
          aria-label="Upload font"
        />
        {serverFontNames.length > 0 && (
          <select
            value=""
            onChange={(e) => setFont(e.target.value)}
            className="px-1 bg-gray-700 text-white"
            aria-label="Select uploaded font"
          >
            <option value="" disabled>
              Uploaded Fonts
            </option>
            {serverFontNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
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
        <label className="flex items-center gap-1 text-sm">
          Width
          <input
            type="number"
            min="20"
            max="200"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-16 px-1 bg-gray-700 text-white"
            aria-label="Width"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          Layout
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="px-1 bg-gray-700 text-white"
            aria-label="Layout"
          >
            <option value="default">Default</option>
            <option value="full">Full</option>
            <option value="fitted">Fitted</option>
            <option value="smush">Smush</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-sm">
          Gradient
          <input
            type="range"
            min="0"
            max="360"
            value={gradient}
            onChange={(e) => setGradient(Number(e.target.value))}
            aria-label="Gradient hue"
          />
        </label>
        <label className="flex items-center gap-1 text-sm">
          Kerning
          <input
            type="range"
            min="-2"
            max="10"
            step="0.1"
            value={kerning}
            onChange={(e) => setKerning(Number(e.target.value))}
            aria-label="Kerning"
          />
        </label>
        <AlignmentControls
          align={align}
          setAlign={setAlign}
          padding={padding}
          setPadding={setPadding}
        />
        <button
          onClick={() => setWrap((w) => !w)}
          className="px-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          aria-label="Toggle wrap"
        >
          {wrap ? 'No Wrap' : 'Wrap'}
        </button>
        <button
          onClick={copyAll}
          className="px-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Copy all"
        >
          Copy Output
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
          TXT
        </button>
        <label className="flex items-center gap-1 text-sm">
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="px-1 bg-gray-700 text-white"
            aria-label="Theme"
          >
            <option value="dark">Green on Black</option>
            <option value="light">Black on Green</option>
          </select>
        </label>
      </div>
      <div className="flex-1 overflow-auto">
        <pre
          ref={preRef}
          className={`min-w-full p-2 font-mono transition-colors motion-reduce:transition-none ${
            wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight,
            letterSpacing: `${kerning}px`,
            ...(theme === 'light'
              ? { backgroundColor: '#0f0', color: '#000' }
              : {
                  backgroundColor: '#000',
                  backgroundImage: `linear-gradient(to right, hsl(${gradient},100%,50%), hsl(${(gradient + 120) % 360},100%,50%))`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }),
          }}
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
