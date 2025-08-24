import React, { useState, useEffect } from 'react';

const EncodingConverter = ({ onConvert }) => {
  const [mode, setMode] = useState('encode');
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
      try {
        let result;
        if (mode === 'encode') {
          result = btoa(unescape(encodeURIComponent(input)));
        } else {
          result = decodeURIComponent(escape(atob(input)));
        }
        setOutput(result);
        setError('');
        if (onConvert) {
          onConvert(
            `${mode === 'encode' ? 'b64 encode' : 'b64 decode'} "${input}"`,
            result
          );
        }
      } catch {
        setOutput('');
        setError("Invalid input, e.g., 'SGVsbG8='");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, mode, onConvert]);

  return (
    <div className="bg-gray-700 p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Encoding Converter</h2>
      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="text-black p-1 rounded"
        >
          <option value="encode">Base64 Encode</option>
          <option value="decode">Base64 Decode</option>
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

export default EncodingConverter;
