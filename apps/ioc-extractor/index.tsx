import React, { useState } from 'react';

type Item = {
  type: 'url' | 'ip' | 'hash' | 'email';
  value: string;
};

const PATTERNS: Record<Item['type'], RegExp> = {
  url: /https?:\/\/[\w.-]+(?:\/[\w./?%&=-]*)?/gi,
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  hash: /\b[A-Fa-f0-9]{32}\b|\b[A-Fa-f0-9]{40}\b|\b[A-Fa-f0-9]{64}\b/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
};

const filters: ('all' | Item['type'])[] = ['all', 'url', 'ip', 'hash', 'email'];

const IocExtractor: React.FC = () => {
  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');

  const extract = () => {
    const results: Item[] = [];
    (Object.keys(PATTERNS) as Item['type'][]).forEach((type) => {
      const matches = text.match(PATTERNS[type]) || [];
      matches.forEach((value) => results.push({ type, value }));
    });
    setItems(results);
  };

  const counts = items.reduce<Record<string, number>>((acc, { value }) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  const filtered = items.filter((i) => filter === 'all' || i.type === filter);

  const copy = (value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
  };

  const exportCsv = () => {
    const rows = filtered.map((i) => `${i.type},${i.value}`);
    rows.unshift('Type,Value');
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iocs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste text here..."
        className="w-full h-32 text-black p-2"
      />
      <div className="space-x-2">
        <button type="button" onClick={extract} className="px-3 py-1 bg-blue-600 rounded">
          Extract
        </button>
        <button type="button" onClick={exportCsv} className="px-3 py-1 bg-green-600 rounded">
          Export CSV
        </button>
      </div>
      <div className="space-x-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded ${filter === f ? 'bg-gray-700' : 'bg-gray-600'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="overflow-auto max-h-[40vh]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border p-1">Type</th>
              <th className="border p-1">Value</th>
              <th className="border p-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={`${item.value}-${idx}`}
                className={counts[item.value] > 1 ? 'bg-red-200 text-black' : ''}
              >
                <td className="border p-1">{item.type.toUpperCase()}</td>
                <td className="border p-1 break-all">{item.value}</td>
                <td className="border p-1">
                  <button
                    type="button"
                    onClick={() => copy(item.value)}
                    className="px-2 py-0.5 bg-blue-500 rounded"
                  >
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IocExtractor;

