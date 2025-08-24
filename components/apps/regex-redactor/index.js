import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS } from './presets';

const RegexRedactor = () => {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [redact, setRedact] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [redacted, setRedacted] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [diffParts, setDiffParts] = useState([]);
  const [mask, setMask] = useState('full');
  const [activePreset, setActivePreset] = useState(null);
  const [unsafe, setUnsafe] = useState(false);
  const [engine, setEngine] = useState('js');


  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { redacted, highlights, diff, error, unsafe, warning } = e.data;
      setRedacted(redacted);
      setHighlights(highlights || []);
      setDiffParts(diff || []);
      setError(error || '');
      setUnsafe(unsafe);
      setWarning(warning || '');
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({
      text,
      pattern,
      preset: activePreset?.label,
      mask,
      engine,
    });
  }, [text, pattern, mask, activePreset, engine]);

  const highlighted = useMemo(() => {
    if (!highlights.length) return text;
    const parts = [];
    let last = 0;
    highlights.forEach(({ start, end }) => {
      if (start > last) parts.push(text.slice(last, start));
      parts.push(
        <mark key={start} className="bg-yellow-500 text-black">{text.slice(start, end)}</mark>
      );
      last = end;
    });
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }, [highlights, text]);

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
          onChange={(e) => {
            setPattern(e.target.value);
            setActivePreset(null);
          }}
          placeholder="Enter regex"
          className="px-2 py-1 rounded text-black"
        />
        <select
          className="px-2 py-1 rounded text-black"
          defaultValue=""
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.pattern === e.target.value);
            setPattern(e.target.value);
            setActivePreset(preset || null);
          }}
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
        <select
          className="px-2 py-1 rounded text-black"
          value={mask}
          onChange={(e) => setMask(e.target.value)}
        >
          <option value="full">Full Mask</option>
          <option value="partial">Partial Mask</option>
        </select>
        <select
          className="px-2 py-1 rounded text-black"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
        >
          <option value="js">JavaScript</option>
          <option value="re2">RE2</option>
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
      {warning && !error && (
        <div className="text-yellow-500 mb-2">{warning}</div>
      )}
      {unsafe && !error && (
        <div className="text-yellow-500 mb-2">
          Potential catastrophic regex detected. Consider using RE2-compatible
          patterns.
        </div>
      )}
      {useRe2 && (
        <div className="text-sm text-gray-300 mb-2">RE2 mode enabled.</div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Test text"
        className="w-full h-40 p-2 mb-2 rounded text-black"
      />
      <div className="flex-1 p-2 bg-gray-800 overflow-auto whitespace-pre-wrap rounded">
        {redact ? redacted : highlighted}
      </div>
      {redact && diffParts.length > 0 && (
        <div className="mt-2 p-2 bg-gray-700 overflow-auto whitespace-pre-wrap rounded">
          {diffParts.map((part, i) => {
            const cls = part.added
              ? 'bg-green-700'
              : part.removed
              ? 'bg-red-700 line-through'
              : '';
            return (
              <span key={i} className={cls}>
                {part.value}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RegexRedactor;

export const displayRegexRedactor = () => {
  return <RegexRedactor />;
};

export { PRESETS as SAFE_PATTERNS } from './presets';
