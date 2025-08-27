import React, { useState } from 'react';

const SNIPPET = [
  { pseudo: 'int square(int x) {', asm: 'square:' },
  { pseudo: '  return x * x;', asm: '  imul eax, edi, edi' },
  { pseudo: '}', asm: '  ret' },
];

export default function PseudoDisasmViewer() {
  const [hover, setHover] = useState(null);

  const handleCopy = (text) => {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const renderColumn = (key, label) => (
    <pre
      aria-label={label}
      className="w-1/2 overflow-auto p-2 whitespace-pre-wrap"
    >
      {SNIPPET.map((line, idx) => (
        <div
          key={`${key}-${idx}`}
          onMouseEnter={() => setHover(idx)}
          onMouseLeave={() => setHover(null)}
          onClick={() => handleCopy(line[key])}
          className={`cursor-pointer ${
            hover === idx ? 'bg-yellow-700' : ''
          }`}
        >
          {line[key]}
        </div>
      ))}
    </pre>
  );

  return (
    <div className="w-full h-48 flex border-t border-gray-700 bg-gray-800 text-sm text-gray-100">
      {renderColumn('pseudo', 'Pseudocode')}
      {renderColumn('asm', 'Disassembly')}
    </div>
  );
}

