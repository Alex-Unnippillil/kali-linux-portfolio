import React from 'react';

interface Props {
  output: string;
  fontSize: number;
  lineHeight: number;
  align: 'left' | 'center' | 'right';
  kerning: number;
  gradient: number;
  inverted: boolean;
  onExport?: (msg: string) => void;
}

const BannerExporter: React.FC<Props> = ({
  output,
  fontSize,
  lineHeight,
  align,
  kerning,
  gradient,
  inverted,
  onExport,
}) => {
  const createCanvas = () => {
    const lines = output.split('\n');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.font = `${fontSize}px monospace`;
    const baseWidth = ctx.measureText('M').width;
    const advance = baseWidth + kerning;
    const maxLen = Math.max(...lines.map((l) => l.length));
    const width = Math.ceil(maxLen * advance);
    const lineHeightPx = fontSize * lineHeight;
    const height = Math.ceil(lines.length * lineHeightPx);
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = inverted ? '#fff' : '#000';
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, `hsl(${gradient},100%,50%)`);
    grad.addColorStop(1, `hsl(${(gradient + 120) % 360},100%,50%)`);
    ctx.fillStyle = grad;
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      const lineWidth = line.length * advance;
      let x = 0;
      if (align === 'center') x = (width - lineWidth) / 2;
      else if (align === 'right') x = width - lineWidth;
      const y = i * lineHeightPx;
      for (let j = 0; j < line.length; j += 1) {
        ctx.fillText(line[j], x + j * advance, y);
      }
    });

    return canvas;
  };

  const download = (href: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = href;
    link.click();
  };

  const exportPNG = () => {
    const canvas = createCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    download(dataUrl, 'figlet.png');
    onExport?.('Downloaded PNG');
  };

  const escapeXML = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const exportSVG = () => {
    const lines = output.split('\n');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = `${fontSize}px monospace`;
    const baseWidth = ctx.measureText('M').width;
    const advance = baseWidth + kerning;
    const maxLen = Math.max(...lines.map((l) => l.length));
    const width = Math.ceil(maxLen * advance);
    const lineHeightPx = fontSize * lineHeight;
    const height = Math.ceil(lines.length * lineHeightPx);

    const gradId = `grad-${Math.random().toString(36).slice(2, 7)}`;
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
    const xPos = align === 'center' ? width / 2 : align === 'right' ? width : 0;

    const texts = lines
      .map((line, i) => {
        const y = i * lineHeightPx + fontSize;
        return `<text x="${xPos}" y="${y}" font-family="monospace" font-size="${fontSize}" letter-spacing="${kerning}" text-anchor="${anchor}" fill="url(#${gradId})">${escapeXML(line)}</text>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="hsl(${gradient},100%,50%)"/><stop offset="100%" stop-color="hsl(${(gradient + 120) % 360},100%,50%)"/></linearGradient></defs><rect width="100%" height="100%" fill="${inverted ? '#fff' : '#000'}"/>${texts}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    download(url, 'figlet.svg');
    URL.revokeObjectURL(url);
    onExport?.('Downloaded SVG');
  };

  return (
    <>
      <button
        onClick={exportPNG}
        className="px-2 bg-green-700 hover:bg-green-600 rounded text-white"
        aria-label="Export PNG"
      >
        PNG
      </button>
      <button
        onClick={exportSVG}
        className="px-2 bg-yellow-700 hover:bg-yellow-600 rounded text-white"
        aria-label="Export SVG"
      >
        SVG
      </button>
    </>
  );
};

export default BannerExporter;
