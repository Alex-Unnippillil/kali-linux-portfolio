import React, { useState, useEffect, useRef } from 'react';
import Toast from '../../ui/Toast';

// Font list must match those parsed in worker.js
const fonts = ['Standard', 'Slant', 'Big', 'Ghost', 'Small'];

const FigletApp = () => {
  const [text, setText] = useState('');
  const [font, setFont] = useState(fonts[0]);
  const [output, setOutput] = useState('');
  const [inverted, setInverted] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [previews, setPreviews] = useState({});
  const [toastVisible, setToastVisible] = useState(false);
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const announceTimer = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { id, rendered } = e.data;
      if (id === 'main') setOutput(rendered);
      else setPreviews((p) => ({ ...p, [id]: rendered }));
    };
    fonts.forEach((f) => {
      workerRef.current?.postMessage({ text: 'Aa', font: f, id: f });
    });
    return () => {
      workerRef.current?.terminate();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearTimeout(announceTimer.current);
    };
  }, []);

  const updateFiglet = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ text, font, id: 'main' });
    }
  };

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateFiglet);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, font]);

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setToastVisible(true);
      setAnnounce('Copied to clipboard');
      clearTimeout(announceTimer.current);
      announceTimer.current = setTimeout(() => setAnnounce(''), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex gap-2 bg-ub-gedit-dark">
        <select
          className="bg-gray-700 text-white px-1"
          value={font}
          onChange={(e) => setFont(e.target.value)}
          aria-label="Select font"
        >
          {fonts.map((f) => (
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
          aria-label="Text to convert"
        />
        <button
          onClick={copyOutput}
          className="px-2 bg-blue-700 hover:bg-blue-600 rounded text-white"
          aria-label="Copy ASCII art"
        >
          Copy
        </button>
        <button
          onClick={() => setInverted((i) => !i)}
          className="px-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          aria-label="Invert colors"
        >
          Invert
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 overflow-auto max-h-40 bg-ub-gedit-dark">
        {fonts.map((f) => (
          <button
            key={f}
            onClick={() => setFont(f)}
            className={`bg-gray-700 p-2 rounded text-left whitespace-pre ${
              font === f ? 'ring-2 ring-blue-500' : ''
            }`}
            aria-label={`Use ${f} font`}
          >
            <pre className="text-xs leading-4">{previews[f] || f}</pre>
          </button>
        ))}
      </div>
      <pre
        aria-live="polite"
        className={`flex-1 overflow-auto p-2 whitespace-pre transition-colors motion-reduce:transition-none ${
          inverted ? 'bg-white text-black' : 'bg-black text-white'
        }`}
      >
        {output}
      </pre>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {toastVisible && (
        <Toast
          message="Copied"
          onClose={() => setToastVisible(false)}
          duration={1500}
        />
      )}
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
