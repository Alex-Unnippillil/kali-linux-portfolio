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

  const renderColumn = (key, label, descId) => (
    <pre
      aria-label={label}
      aria-describedby={descId}
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
      <p id="pseudo-desc" className="sr-only">
        Pseudocode pane. Lines highlight with matching assembly and copy on click.
      </p>
      <p id="asm-desc" className="sr-only">
        Disassembly pane. Lines highlight with matching pseudocode and copy on click.
      </p>
      {renderColumn('pseudo', 'Pseudocode', 'pseudo-desc')}
      {renderColumn('asm', 'Disassembly', 'asm-desc')}
    </div>
  );
}

