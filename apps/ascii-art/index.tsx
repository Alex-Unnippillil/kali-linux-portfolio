'use client';

import { useState, useEffect, useRef, useCallback, ChangeEvent, ReactNode } from 'react';
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

type ControlPanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const ControlPanel = ({ title, children, className }: ControlPanelProps) => (
  <section
    className={`rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-3 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className ?? ''
      }`}
  >
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-kali-text opacity-70">
      {title}
    </h2>
    <div className="flex flex-col gap-2">{children}</div>
  </section>
);

type ControlRowProps = {
  children: ReactNode;
  className?: string;
};

const ControlRow = ({ children, className }: ControlRowProps) => (
  <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`}>{children}</div>
);

type ColorControlsProps = {
  fgColor: string;
  bgColor: string;
  onFgChange: (value: string) => void;
  onBgChange: (value: string) => void;
};

const ColorControls = ({ fgColor, bgColor, onFgChange, onBgChange }: ColorControlsProps) => (
  <ControlRow>
    <label className="flex items-center gap-1 text-kali-text">
      FG
      <input
        type="color"
        value={fgColor}
        onChange={(e) => onFgChange(e.target.value)}
        aria-label="Foreground color"
        className="w-10 h-6 p-0 border-0 bg-transparent"
      />
    </label>
    <label className="flex items-center gap-1 text-kali-text">
      BG
      <input
        type="color"
        value={bgColor}
        onChange={(e) => onBgChange(e.target.value)}
        aria-label="Background color"
        className="w-10 h-6 p-0 border-0 bg-transparent"
      />
    </label>
  </ControlRow>
);

type FontSizeSelectProps = {
  value: number;
  onChange: (value: number) => void;
};

const FontSizeSelect = ({ value, onChange }: FontSizeSelectProps) => (
  <label className="flex flex-col gap-1 text-sm text-kali-text">
    <span className="text-xs uppercase tracking-wide text-kali-text opacity-60">Font size</span>
    <select
      aria-label="Font size"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
    >
      {fontSizes.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  </label>
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
  /**
   * UI pain points worth tracking while iterating on the tool:
   * - Input editor: the auto-resizing textarea currently grows without a ceiling, so long payloads
   *   can push the preview pane below the fold and cause layout shift.
   * - Preview panel: the ASCII preview inherits its height from content, collapsing between runs
   *   and producing large jumps when the output length changes dramatically.
   * - Preset controls: the sample snippets act on hover only, leaving keyboard users without a
   *   clear affordance or feedback loop when tabbing through the grid.
   */
  const router = useRouter();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [font, setFont] = useState<string>('Standard');
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
    if (typeof f === 'string' && fontList.includes(f)) setFont(f);
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
      setOutput(figlet.textSync(text || '', { font: font as any }));
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

  const previewPaneClasses =
    'min-h-[12rem] whitespace-pre overflow-auto rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-[6px] font-mono leading-tight text-[color:var(--color-text)] shadow-inner shadow-[color:color-mix(in_srgb,var(--kali-panel-border)_65%,rgba(8,15,23,0.6))]';

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto bg-kali-background p-4 font-mono text-kali-text">
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={tab === 'text'}
          className={`rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${tab === 'text'
            ? 'border-[color:var(--color-primary)] bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)]'
            : 'border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:bg-[var(--kali-panel-highlight)]'
            }`}
          onClick={() => setTab('text')}
        >
          Text
        </button>
        <button
          type="button"
          aria-pressed={tab === 'image'}
          className={`rounded border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${tab === 'image'
            ? 'border-[color:var(--color-primary)] bg-kali-primary text-kali-inverse shadow-[0_0_0_1px_rgba(15,148,210,0.35)]'
            : 'border-[color:var(--kali-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] hover:bg-[var(--kali-panel-highlight)]'
            }`}
          onClick={() => setTab('image')}
        >
          Image
        </button>
      </div>
      {tab === 'text' && (
        <div className="flex flex-col gap-3">
          <ControlPanel title="Text styling">
            <textarea
              ref={textAreaRef}
              rows={1}
              aria-label="ASCII input editor"
              className="resize-none overflow-hidden rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono leading-none text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              style={{ fontFamily: 'monospace', lineHeight: '1', fontSize: `${fontSize}px` }}
              placeholder="Enter text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm text-kali-text">
                <span className="text-xs uppercase tracking-wide text-kali-text opacity-60">Font</span>
                <select
                  aria-label="Font selection"
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="rounded border border-[color:var(--kali-border)] bg-[color:var(--color-text)] px-2 py-1 font-mono text-[color:var(--color-inverse)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                >
                  {fontList.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <FontSizeSelect value={fontSize} onChange={setFontSize} />
            </div>
          </ControlPanel>
          <ControlPanel title="Color">
            <ColorControls
              fgColor={fgColor}
              bgColor={bgColor}
              onFgChange={setFgColor}
              onBgChange={setBgColor}
            />
          </ControlPanel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded border border-[color:var(--color-primary)] bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => copy(output)}
            >
              <CopyIcon />
              <span>Copy ASCII</span>
            </button>
            <button
              type="button"
              className="rounded border border-[color:var(--color-terminal)] bg-kali-terminal px-2 py-1 text-sm font-medium text-[color:var(--kali-terminal-text)] transition-colors hover:bg-kali-terminal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => download(wrapAnsi(output, fgColor, bgColor), 'ascii-art.txt')}
            >
              Download Text
            </button>
            <button
              type="button"
              className="rounded border border-[color:var(--color-accent)] bg-kali-accent px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => saveCanvas('ascii-art.png')}
            >
              Save Image
            </button>
          </div>
          <pre
            className={previewPaneClasses}
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px`, color: fgColor, backgroundColor: bgColor }}
          >
            {output}
          </pre>
          <canvas
            ref={displayCanvasRef}
            aria-hidden="true"
            className="mt-2"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {samples.map((s, i) => (
              <pre
                key={i}
                onMouseEnter={() => copy(s)}
                className="cursor-pointer whitespace-pre rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] p-2 font-mono leading-none text-[color:var(--color-text)] transition-colors hover:bg-[var(--kali-panel-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
                style={{ imageRendering: 'pixelated' }}
              >
                {s}
              </pre>
            ))}
          </div>
        </div>
      )}
      {tab === 'image' && (
        <div className="flex flex-col gap-3">
          <ControlPanel title="Image">
            <input
              type="file"
              accept="image/*"
              aria-label="Upload image for ASCII conversion"
              onChange={handleImage}
            />
            <ControlRow className="gap-4">
              <label className="flex items-center gap-2 text-sm text-kali-text">
                <span className="text-xs uppercase tracking-wide text-kali-text opacity-60">Brightness</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.1"
                  value={brightness}
                  aria-label="Adjust brightness"
                  onChange={(e) => setBrightness(Number(e.target.value))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-kali-text">
                <span className="text-xs uppercase tracking-wide text-kali-text opacity-60">Contrast</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={contrast}
                  aria-label="Adjust contrast"
                  onChange={(e) => setContrast(Number(e.target.value))}
                />
              </label>
            </ControlRow>
          </ControlPanel>
          <ControlPanel title="Color">
            <ColorControls
              fgColor={fgColor}
              bgColor={bgColor}
              onFgChange={setFgColor}
              onBgChange={setBgColor}
            />
          </ControlPanel>
          <ControlPanel title="Text styling">
            <FontSizeSelect value={fontSize} onChange={setFontSize} />
          </ControlPanel>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded border border-[color:var(--color-primary)] bg-kali-primary px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => copy(imgOutput)}
            >
              <CopyIcon />
              <span>Copy ASCII</span>
            </button>
            <button
              type="button"
              className="rounded border border-[color:var(--color-terminal)] bg-kali-terminal px-2 py-1 text-sm font-medium text-[color:var(--kali-terminal-text)] transition-colors hover:bg-kali-terminal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => download(wrapAnsi(imgOutput, fgColor, bgColor), 'image-ascii.txt')}
            >
              Download Text
            </button>
            <button
              type="button"
              className="rounded border border-[color:var(--color-accent)] bg-kali-accent px-2 py-1 text-sm font-medium text-kali-inverse transition-colors hover:bg-kali-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
              onClick={() => saveCanvas('image-ascii.png')}
            >
              Save Image
            </button>
          </div>
          <canvas ref={canvasRef} aria-hidden="true" className="hidden" />
          <pre
            className={previewPaneClasses}
            style={{ imageRendering: 'pixelated', fontSize: `${fontSize}px`, color: fgColor, backgroundColor: bgColor }}
          >
            {imgOutput}
          </pre>
          <canvas
            ref={displayCanvasRef}
            aria-hidden="true"
            className="mt-2"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  );
};

export default AsciiArtApp;
