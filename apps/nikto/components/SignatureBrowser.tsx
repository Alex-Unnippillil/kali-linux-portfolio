'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface Signature {
  check: string;
  category: string;
  example: string;
}

const SignatureBrowser: React.FC = () => {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/nikto-signatures.json');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSignatures(
            data.filter(
              (s: any) =>
                typeof s.check === 'string' &&
                typeof s.category === 'string' &&
                typeof s.example === 'string'
            )
          );
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(signatures.map((s) => s.category))).filter(
      Boolean
    ) as string[];
    return ['All', ...cats];
  }, [signatures]);

  const filtered = useMemo(() => {
    return signatures.filter(
      (s) =>
        (category === 'All' || s.category === category) &&
        (s.check.toLowerCase().includes(query.toLowerCase()) ||
          s.example.toLowerCase().includes(query.toLowerCase()))
    );
  }, [signatures, query, category]);

  return (
    <div className="mt-4" data-testid="signature-browser">
      <h2 className="text-lg mb-2">Signature Browser</h2>
      <div className="flex space-x-2 mb-2">
        <input
          placeholder="Search"
          className="p-2 rounded text-black flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="p-2 rounded text-black"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2">Check</th>
            <th className="p-2">Category</th>
            <th className="p-2">Example</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((sig, idx) => (
            <tr key={idx} className="odd:bg-gray-800">
              <td className="p-2">{sig.check}</td>
              <td className="p-2">{sig.category}</td>
              <td className="p-2 break-all">{sig.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SignatureBrowser;

