'use client';

import { useState, useEffect } from 'react';
import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import { useRouter } from 'next/router';
import ImageToAscii from './components/ImageToAscii';

// preload a small set of fonts
const fontData: Record<string, any> = {
  Standard,
  Slant,
  Big,
};
Object.entries(fontData).forEach(([name, data]) => figlet.parseFont(name, data));
const fontList = Object.keys(fontData);

function download(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AsciiArtApp = () => {
  const router = useRouter();
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [font, setFont] = useState('Standard');
  const [output, setOutput] = useState('');

  // load from query string on first render
  useEffect(() => {
    if (!router.isReady) return;
    const { t, f } = router.query;
    if (typeof t === 'string') setText(t);
    if (typeof f === 'string' && fontList.includes(f)) setFont(f);
  }, [router.isReady]);

  // update query string permalink
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (text) params.set('t', text);
    if (font && font !== 'Standard') params.set('f', font);
    const qs = params.toString();
    const url = qs ? `${router.pathname}?${qs}` : router.pathname;
    router.replace(url, undefined, { shallow: true });
  }, [text, font]);

  // render text ascii
  useEffect(() => {
    try {
      setOutput(figlet.textSync(text || '', { font }));
    } catch {
      setOutput('');
    }
  }, [text, font]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  };


  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-auto font-mono">
      <div className="mb-4 flex gap-2">
        <button
          className={`px-2 py-1 rounded ${tab === 'text' ? 'bg-blue-700' : 'bg-gray-700'}`}
          onClick={() => setTab('text')}
        >
          Text
        </button>
        <button
          className={`px-2 py-1 rounded ${tab === 'image' ? 'bg-blue-700' : 'bg-gray-700'}`}
          onClick={() => setTab('image')}
        >
          Image
        </button>
      </div>
      {tab === 'text' && (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            className="px-2 py-1 text-black rounded"
            placeholder="Enter text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            className="px-2 py-1 text-black rounded"
          >
            {fontList.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-blue-700 rounded"
              onClick={() => copy(output)}
            >
              Copy
            </button>
            <button
              className="px-2 py-1 bg-green-700 rounded"
              onClick={() => download(output, 'ascii-art.txt')}
            >
              Download
            </button>
          </div>
          <pre className="bg-black text-green-400 p-2 whitespace-pre overflow-auto">
            {output}
          </pre>
        </div>
      )}
      {tab === 'image' && <ImageToAscii />}
    </div>
  );
};

export default AsciiArtApp;
