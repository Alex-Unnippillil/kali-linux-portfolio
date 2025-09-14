import { useState } from 'react';

const TAGS = ['latest', 'rolling', 'weekly'];

export default function KaliContainerPage() {
  const [tag, setTag] = useState<string>('latest');
  const [flags, setFlags] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const startContainer = async () => {
    setResult('');
    try {
      const res = await fetch('/api/kali-container/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, flags }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.id || 'started');
      } else {
        setResult(data.error || 'error');
      }
    } catch (err: any) {
      setResult(err.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label htmlFor="kali-tag" className="block text-sm font-medium mb-1">
          Tag
        </label>
        <select
          id="kali-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        >
          {TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="kali-flags"
          className="block text-sm font-medium mb-1"
        >
          Runtime Flags
        </label>
        <input
          id="kali-flags"
          type="text"
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          placeholder="--rm -it"
          aria-label="Runtime Flags"
          className="border rounded px-2 py-1 w-full"
        />
      </div>
      <button
        onClick={startContainer}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Start
      </button>
      {result && (
        <pre className="mt-4 bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
