import React, { useState, useEffect } from 'react';
import figlet from 'figlet';
import standard from 'figlet/importable-fonts/Standard.js';
import slant from 'figlet/importable-fonts/Slant.js';
import big from 'figlet/importable-fonts/Big.js';
import graffiti from 'figlet/importable-fonts/Graffiti.js';

const fontData = {
  Standard: standard,
  Slant: slant,
  Big: big,
  Graffiti: graffiti,
};

const fonts = Object.keys(fontData);

const AsciiArt = () => {
  const [text, setText] = useState('Hello');
  const [font, setFont] = useState(fonts[0]);
  const [output, setOutput] = useState('');

  useEffect(() => {
    fonts.forEach((name) => {
      figlet.parseFont(name, fontData[name]);
    });
  }, []);

  useEffect(() => {
    setOutput(figlet.textSync(text || '', { font }));
  }, [text, font]);

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white font-mono p-2">
      <div className="flex gap-2 mb-2">
        <select
          className="ascii-font-select"
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type here"
        />
      </div>
      <pre className="flex-1 overflow-auto ascii-preview">{output}</pre>
    </div>
  );
};

export default AsciiArt;
export const displayAsciiArt = () => <AsciiArt />;

