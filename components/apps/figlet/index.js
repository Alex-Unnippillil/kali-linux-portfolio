import React, { useState, useEffect, useRef } from 'react';

const defaultFonts = ['Standard', 'Slant'];

const FigletApp = () => {
  const [text, setText] = useState('');
  const [fonts, setFonts] = useState(defaultFonts);
  const [font, setFont] = useState(defaultFonts[0]);
  const [output, setOutput] = useState('');
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { type, name, output } = e.data;
      if (type === 'render') {
        setOutput(output);
      } else if (type === 'fontParsed') {
        setFonts((prev) => [...prev, name]);
        setFont(name);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'render', text, font });
    }
  }, [text, font]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && workerRef.current) {
      const reader = new FileReader();
      const name = file.name.replace(/\.flf$/i, '');
      reader.onload = () => {
        workerRef.current.postMessage({
          type: 'parseFont',
          name,
          data: reader.result,
        });
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex gap-2 bg-ub-gedit-dark">
        <input
          type="file"
          accept=".flf"
          onChange={handleUpload}
          className="bg-gray-700 text-white"
        />
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
      </div>
      <pre className="flex-1 overflow-auto p-2 whitespace-pre">{output}</pre>
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;
