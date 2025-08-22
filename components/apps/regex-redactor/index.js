import React, { useMemo, useState } from 'react';

const PRESETS = [
  { label: 'Email', pattern: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b' },
  { label: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b' },
  { label: 'Credit Card', pattern: '\\b(?:\\d[ -]*?){13,16}\\b' },
  { label: 'UUID', pattern: '\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b' },
];

const RegexRedactor = () => {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [redact, setRedact] = useState(false);
  const [error, setError] = useState('');

  const regex = useMemo(() => {
    if (!pattern) return null;
    try {
      setError('');
      return new RegExp(pattern, 'g');
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [pattern]);

  const highlighted = useMemo(() => {
    if (!regex || !text) return text;
    const parts = [];
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      if (start > last) parts.push(text.slice(last, start));
      parts.push(
        <mark key={start} className="bg-yellow-500 text-black">{m[0]}</mark>
      );
      last = start + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }, [regex, text]);

  const redacted = useMemo(() => {
    if (!regex || !text) return text;
    return text.replace(regex, (match) => '█'.repeat(match.length));
  }, [regex, text]);

  const download = () => {
    const blob = new Blob([redacted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redacted.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Enter regex"
          className="px-2 py-1 rounded text-black"
        />
        <select
          className="px-2 py-1 rounded text-black"
          defaultValue=""
          onChange={(e) => setPattern(e.target.value)}
        >
          <option value="" disabled>
            Presets
          </option>
          {PRESETS.map((p) => (
            <option key={p.label} value={p.pattern}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          className="px-3 py-1 bg-blue-600 rounded"
          onClick={() => setRedact(!redact)}
        >
          {redact ? 'Highlight' : 'Redact'}
        </button>
        {redact && (
          <button
            className="px-3 py-1 bg-green-600 rounded"
            onClick={download}
          >
            Download
          </button>
        )}
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Test text"
        className="w-full h-40 p-2 mb-2 rounded text-black"
      />
      <div className="flex-1 p-2 bg-gray-800 overflow-auto whitespace-pre-wrap rounded">
        {redact ? redacted : highlighted}
      </div>
    </div>
  );
};

export default RegexRedactor;

export const displayRegexRedactor = () => {
  return <RegexRedactor />;
};

