'use client';

import { useState, useEffect, useCallback } from 'react';

interface FileItem {
  name: string;
  type: 'text' | 'image';
  content: string;
}

const HOME_FILES: FileItem[] = [
  {
    name: 'readme.txt',
    type: 'text',
    content: 'Welcome to the home directory.\nThis is a sample text file stored in memory.',
  },
  {
    name: 'red.png',
    type: 'image',
    content:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSJyZWQiLz48L3N2Zz4=',
  },
  {
    name: 'blue.png',
    type: 'image',
    content:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSJibHVlIi8+PC9zdmc+',
  },
  {
    name: 'notes.txt',
    type: 'text',
    content: 'Use arrow keys to navigate files.\nDouble-click to open them.',
  },
];

export default function FilesApp() {
  const [selected, setSelected] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (openIndex !== null) {
        if (e.key === 'ArrowRight') {
          setOpenIndex((i) => (i === null ? null : (i + 1) % HOME_FILES.length));
        } else if (e.key === 'ArrowLeft') {
          setOpenIndex((i) =>
            i === null ? null : (i - 1 + HOME_FILES.length) % HOME_FILES.length
          );
        } else if (e.key === 'Escape') {
          setOpenIndex(null);
        }
      } else {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % HOME_FILES.length);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          setSelected((s) => (s - 1 + HOME_FILES.length) % HOME_FILES.length);
        } else if (e.key === 'Enter') {
          setOpenIndex(selected);
        }
      }
    },
    [openIndex, selected]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div className="w-full h-full bg-ub-cool-grey text-white select-none p-4">
      <div className="grid grid-cols-4 gap-4">
        {HOME_FILES.map((file, idx) => (
          <div
            key={file.name}
            onClick={() => setSelected(idx)}
            onDoubleClick={() => setOpenIndex(idx)}
            className={`flex flex-col items-center p-2 rounded cursor-pointer ${
              idx === selected ? 'bg-black bg-opacity-20' : ''
            }`}
          >
            {file.type === 'image' ? (
              <img
                src={file.content}
                alt={file.name}
                className="w-16 h-16 object-cover"
              />
            ) : (
              <img
                src="/themes/Yaru/mimetypes/text-x-generic.svg"
                alt="text file"
                className="w-16 h-16 object-contain"
              />
            )}
            <span className="mt-2 text-xs text-center truncate w-full">
              {file.name}
            </span>
          </div>
        ))}
      </div>
      {openIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center"
          onClick={() => setOpenIndex(null)}
        >
          <div
            className="bg-ub-cool-grey p-4 max-w-[80vw] max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-bold">{HOME_FILES[openIndex].name}</div>
            {HOME_FILES[openIndex].type === 'text' ? (
              <pre className="whitespace-pre-wrap">
                {HOME_FILES[openIndex].content}
              </pre>
            ) : (
              <img
                src={HOME_FILES[openIndex].content}
                alt={HOME_FILES[openIndex].name}
                className="max-w-full max-h-[70vh]"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

