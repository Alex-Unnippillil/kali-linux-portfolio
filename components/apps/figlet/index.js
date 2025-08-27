import React, { useState, useEffect, useRef } from 'react';
import fonts from './fonts.json';

const FigletApp = () => {
  const [text, setText] = useState('');
  const [font, setFont] = useState(fonts[0] || '');
  const [output, setOutput] = useState('');
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => setOutput(e.data);
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ text, font });
    }
  }, [text, font]);

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex gap-2 bg-ub-gedit-dark">
        <select
          className="bg-gray-700 text-white px-1"
          value={font}
          onChange={(e) => setFont(e.target.value)}
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
        />
        <button
          className="bg-gray-700 px-2"
          onClick={() => navigator.clipboard.writeText(output)}
        >
          Copy
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-2 whitespace-pre">{output}</pre>
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
