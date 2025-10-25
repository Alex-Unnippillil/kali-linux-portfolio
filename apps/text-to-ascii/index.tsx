'use client';

import { useState } from 'react';

const TextToAscii = () => {
  const [text, setText] = useState('');
  const ascii = text
    .split('')
    .map((ch) => ch.charCodeAt(0))
    .join(' ');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ascii);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 space-y-2 bg-ub-cool-grey text-white h-full overflow-auto">
      <textarea
        className="w-full p-2 rounded text-black"
        placeholder="Enter text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        onClick={copy}
        className="px-2 py-1 bg-blue-600 rounded"
      >
        Copy
      </button>
      <pre className="p-2 bg-black text-green-500 rounded min-h-[3rem] whitespace-pre-wrap break-all">{ascii}</pre>
    </div>
  );
};

export default TextToAscii;

