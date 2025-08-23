import React, { useState } from 'react';

export const encodeHTML = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const encodeJS = (str: string): string =>
  str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\x27')
    .replace(/"/g, '\\x22')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');

export const encodeURL = (str: string): string => encodeURIComponent(str);

export const encodeSQL = (str: string): string => str.replace(/'/g, "''");

const contexts = {
  html: {
    label: 'HTML',
    encode: encodeHTML,
    note:
      'Escapes <, >, &, " and \x27 so the browser renders text instead of interpreting markup.',
  },
  js: {
    label: 'JavaScript',
    encode: encodeJS,
    note:
      'Escapes quotes, backslashes and angle brackets so the string is safe inside a <script> block.',
  },
  url: {
    label: 'URL',
    encode: encodeURL,
    note: 'Uses encodeURIComponent to make the value safe for URLs and query strings.',
  },
  sql: {
    label: 'SQL',
    encode: encodeSQL,
    note:
      "Doubles single quotes to keep input within string literals. Parameterized queries are recommended.",
  },
};

const examples = [
  { label: 'Script tag', value: "<script>alert('xss')</script>" },
  { label: 'JS string', value: "'; alert('xss'); //" },
  { label: 'URL', value: "https://example.com/?q=<script>alert(1)</script>" },
  { label: 'SQL', value: "' OR 1=1; --" },
];

const SanitizationPlayground: React.FC = () => {
  const [input, setInput] = useState(examples[0].value);
  const [tab, setTab] = useState<keyof typeof contexts>('html');

  const ctx = contexts[tab];

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 overflow-auto">
      <h1 className="text-xl font-bold mb-2">Sanitization Playground</h1>
      <textarea
        className="w-full p-2 rounded text-black mb-2"
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {examples.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            onClick={() => setInput(ex.value)}
          >
            {ex.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        {Object.entries(contexts).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            className={`px-3 py-1 rounded ${tab === key ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setTab(key as keyof typeof contexts)}
          >
            {label}
          </button>
        ))}
      </div>
      <pre
        className="bg-gray-800 p-2 rounded text-sm whitespace-pre-wrap break-all"
        data-testid="output"
      >
        {ctx.encode(input)}
      </pre>
      <p className="text-sm mt-2" data-testid="note">
        {ctx.note}
      </p>
    </div>
  );
};

export default SanitizationPlayground;

