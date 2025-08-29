import { useEffect, useRef, useState } from 'react';

interface Quote {
  content: string;
  author: string;
}

const hexToRgb = (hex: string) => {
  const parsed = hex.replace('#', '');
  const bigint = parseInt(parsed, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const a = [r, g, b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const contrastRatio = (c1: string, c2: string) => {
  const L1 = luminance(hexToRgb(c1));
  const L2 = luminance(hexToRgb(c2));
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
};

const STYLES = [
  { name: 'Classic', bg: '#000000', fg: '#ffffff', font: 'serif' },
  { name: 'Inverted', bg: '#ffffff', fg: '#000000', font: 'sans-serif' },
  { name: 'Retro', bg: '#1e3a8a', fg: '#fef3c7', font: 'monospace' },
];

export default function Posterizer({ quote }: { quote: Quote | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [styleIndex, setStyleIndex] = useState(0);
  const [bg, setBg] = useState(STYLES[0].bg);
  const [fg, setFg] = useState(STYLES[0].fg);
  const [font, setFont] = useState(STYLES[0].font);

  const cycleStyle = () => {
    const next = (styleIndex + 1) % STYLES.length;
    setStyleIndex(next);
    const s = STYLES[next];
    setBg(s.bg);
    setFg(s.fg);
    setFont(s.font);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !quote) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padding = 20;
    const maxWidth = width - padding * 2;

    const drawText = (text: string, y: number, size: number) => {
      ctx.font = `${size}px ${font}`;
      const words = text.split(' ');
      let line = '';
      let lines: string[] = [];
      words.forEach((word) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
      lines.push(line);
      const totalHeight = lines.length * size * 1.2;
      let currentY = y - totalHeight / 2 + size / 2;
      lines.forEach((l) => {
        ctx.fillText(l.trim(), width / 2, currentY);
        currentY += size * 1.2;
      });
      return currentY;
    };

    const nextY = drawText(quote.content, height / 2, 24);
    ctx.font = `20px ${font}`;
    ctx.fillText(`- ${quote.author}`, width / 2, nextY + 20);
  }, [quote, bg, fg, font]);

  const ratio = contrastRatio(bg, fg);
  const accessible = ratio >= 4.5;

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'quote.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <canvas ref={canvasRef} width={600} height={400} className="border" />
      <div className="flex flex-wrap gap-2 justify-center">
        <label className="flex items-center gap-1">
          BG
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
        </label>
        <label className="flex items-center gap-1">
          FG
          <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
        </label>
        <input
          type="text"
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="px-2 py-1 rounded text-black"
          placeholder="Font"
        />
        <span className={accessible ? 'text-green-400' : 'text-red-400'}>
          Contrast: {ratio.toFixed(2)}
        </span>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={cycleStyle}
        >
          Next Style
        </button>
        <span>Style: {STYLES[styleIndex].name}</span>
        <button
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={download}
          disabled={!accessible}
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}

