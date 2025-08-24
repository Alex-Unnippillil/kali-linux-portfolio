import React, { useState, useEffect } from 'react';

const transforms = {
  uppercase: (s) => s.toUpperCase(),
  lowercase: (s) => s.toLowerCase(),
  reverse: (s) => s.split('').reverse().join(''),
};

const TextTransform = ({ onConvert }) => {
  const [mode, setMode] = useState('uppercase');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!input) {
        setOutput('');
        setError("Please enter text, e.g., hello");
        return;
      }
      const result = transforms[mode](input);
      setOutput(result);
      setError('');
      if (onConvert) {
        onConvert(`${mode} "${input}"`, result);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, mode, onConvert]);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Text Transform</h2>
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="text-black p-1 rounded"
        >
          <option value="uppercase">Uppercase</option>
          <option value="lowercase">Lowercase</option>
          <option value="reverse">Reverse</option>
        </select>
      </div>
      <textarea
        className="text-black p-1 rounded"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Input"
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="flex flex-col gap-2">
        <textarea
          className="text-black p-1 rounded"
          value={output}
          readOnly
          placeholder="Result"
        />
        <button
          onClick={() => navigator.clipboard.writeText(output)}
          disabled={!output}
          className="bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
        >
          Copy
        </button>
      </div>
    </div>
  );
};

export default TextTransform;
