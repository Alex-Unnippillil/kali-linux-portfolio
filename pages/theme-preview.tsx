import { useState, useEffect, ChangeEvent } from 'react';
import colors from '../tokens/colors.json';

function luminance(hex: string): number {
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;
  const [R, G, B] = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export default function ThemePreview() {
  const [surface, setSurface] = useState(colors.surface);
  const [text, setText] = useState(colors.text);
  const [accent, setAccent] = useState(colors.accent);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--surface', surface);
    root.setProperty('--text', text);
    root.setProperty('--accent', accent);
    // Backwards compatibility with existing tokens
    root.setProperty('--color-bg', surface);
    root.setProperty('--color-text', text);
    root.setProperty('--color-ubt-blue', accent);
  }, [surface, text, accent]);

  const handle = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
    setter(e.target.value);

  const cSurfaceText = contrast(surface, text).toFixed(2);
  const cSurfaceAccent = contrast(surface, accent).toFixed(2);

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
      <h1 className="text-2xl mb-4">Theme Preview</h1>
      <div className="flex flex-col gap-4 max-w-xs">
        <label className="flex items-center justify-between">
          <span>Surface</span>
          <input type="color" value={surface} onChange={handle(setSurface)} />
        </label>
        <label className="flex items-center justify-between">
          <span>Text</span>
          <input type="color" value={text} onChange={handle(setText)} />
        </label>
        <label className="flex items-center justify-between">
          <span>Accent</span>
          <input type="color" value={accent} onChange={handle(setAccent)} />
        </label>
      </div>
      <p className="mt-4">Surface/Text contrast: {cSurfaceText}</p>
      <p>Surface/Accent contrast: {cSurfaceAccent}</p>
      <button
        className="mt-6 px-4 py-2 rounded"
        style={{ background: 'var(--accent)', color: 'var(--text)' }}
      >
        Accent Button
      </button>
    </div>
  );
}
