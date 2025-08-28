import React, { useState, useEffect, useRef, useCallback } from 'react';

const FigletApp = () => {
  const [text, setText] = useState('');
  const [fonts, setFonts] = useState(['Standard']);
  const [font, setFont] = useState('Standard');
  const [output, setOutput] = useState('');
  const [inverted, setInverted] = useState(false);
  const [announce, setAnnounce] = useState('');
  const workerRef = useRef(null);
  const frameRef = useRef(null);
  const announceTimer = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === 'fonts') {
        setFonts(e.data.fonts);
        setFont(e.data.fonts[0]);
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
    if (workerRef.current) {
      workerRef.current.postMessage({ text, font });
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
        <pre
          className={`flex-1 overflow-auto p-2 whitespace-pre transition-colors motion-reduce:transition-none ${
            inverted ? 'bg-white text-black' : 'bg-black text-white'
          }`}
        >
          {output}
        </pre>
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
