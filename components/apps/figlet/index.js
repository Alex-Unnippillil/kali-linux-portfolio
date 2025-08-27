import React, { useState, useEffect, useRef } from 'react';

const FONT_LIST_KEY = 'figlet-fonts';
const FONT_BASE_URL = 'https://unpkg.com/figlet@1.8.2/importable-fonts';

const FigletApp = () => {
  const [text, setText] = useState('');
  const [font, setFont] = useState('');
  const [fonts, setFonts] = useState([]);
  const [output, setOutput] = useState('');
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current.onmessage = (e) => setOutput(e.data);
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(FONT_LIST_KEY);
    if (stored) {
      const list = JSON.parse(stored);
      setFonts(list);
      setFont(list.includes('Standard') ? 'Standard' : list[0]);
      return;
    }
    fetch(`${FONT_BASE_URL}?meta`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.files
          .filter((f) => f.path.endsWith('.js'))
          .map((f) =>
            decodeURIComponent(
              f.path.replace('/importable-fonts/', '').replace('.js', '')
            )
          )
          .sort();
        localStorage.setItem(FONT_LIST_KEY, JSON.stringify(list));
        setFonts(list);
        setFont(list.includes('Standard') ? 'Standard' : list[0]);
      });
  }, []);

  useEffect(() => {
    if (workerRef.current && font) {
      workerRef.current.postMessage({ text, font, baseUrl: FONT_BASE_URL });
    }
  }, [text, font]);

  const exportText = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${text || 'figlet'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white font-mono">
      <div className="p-2 flex gap-2 bg-ub-gedit-dark items-center">
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
          className="bg-gray-700 text-white px-2 py-1 hover:bg-gray-600"
          onClick={exportText}
        >
          Export
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-2 whitespace-pre">{output}</pre>
    </div>
  );
};

export default FigletApp;
export const displayFiglet = () => <FigletApp />;

