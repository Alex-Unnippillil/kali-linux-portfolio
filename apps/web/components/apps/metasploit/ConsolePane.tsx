import React from 'react';

interface ConsolePaneProps {
  output: string;
}

const ConsolePane: React.FC<ConsolePaneProps> = ({ output }) => {
  const lines = output.split('\n');
  const copyLine = (line: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(line);
    }
  };
  return (
    <div className="flex-grow bg-black text-green-400 font-mono overflow-auto">
      {lines.map((line, idx) => (
        <div key={idx} className="group relative flex items-center h-9 px-2">
          <span className="flex-grow">{line || '\u00A0'}</span>
          <button
            type="button"
            aria-label="Copy line"
            onClick={() => copyLine(line)}
            className="absolute right-2 opacity-0 group-hover:opacity-100 text-xs px-1 rounded bg-gray-700 text-white"
          >
            Copy
          </button>
        </div>
      ))}
    </div>
  );
};

export default ConsolePane;
