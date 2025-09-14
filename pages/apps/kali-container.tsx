import { useState } from 'react';

export default function KaliContainer() {
  const [tag, setTag] = useState('latest');
  const [flags, setFlags] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const runContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutput('');
    setError('');
    try {
      const res = await fetch('/api/kali-container/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag, flags: flags.trim().split(/\s+/).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start container');
      } else {
        setOutput(data.stdout || 'Container started');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 space-y-4 text-white bg-black h-full w-full overflow-auto">
      <form onSubmit={runContainer} className="space-y-4">
        <label className="block">
          <span className="text-sm">Tag</span>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full bg-black border border-gray-600 p-1 mt-1"
          >
            <option value="latest">latest</option>
            <option value="2024.1">2024.1</option>
            <option value="2023.4">2023.4</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Runtime Flags</span>
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="--rm -it"
            className="w-full bg-black border border-gray-600 p-1 mt-1"
          />
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-ub-orange text-black rounded"
        >
          Start
        </button>
      </form>
      {error && <pre className="text-red-500 whitespace-pre-wrap">{error}</pre>}
      {output && <pre className="whitespace-pre-wrap">{output}</pre>}
    </div>
  );
}

