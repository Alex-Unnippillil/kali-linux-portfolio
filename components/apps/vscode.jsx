'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '../../hooks/useTheme';
import { isDarkTheme } from '../../utils/theme';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
];

export default function VsCode() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const { theme } = useTheme();

  useEffect(() => {
    fetch('/data/vscode-example/main.js')
      .then((res) => res.text())
      .then(setCode)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex gap-2 p-2 bg-gray-200">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-2 py-1 rounded"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={(value) => setCode(value || '')}
        theme={isDarkTheme(theme) ? 'vs-dark' : 'vs-light'}
        options={{ automaticLayout: true }}
      />
    </div>
  );
}

