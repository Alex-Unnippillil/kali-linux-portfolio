import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import type { AnalyzerModel, FeatureRecord } from '../../lib/lexical';
import { getModel, models } from '../../lib/lexical';

interface BulkRow {
  row: number;
  features: FeatureRecord;
}

const STORAGE_KEY = 'lexical-analyzer-settings';

const LexicalAnalyzer: React.FC = () => {
  const [text, setText] = useState('');
  const [modelId, setModelId] = useState('basic');
  const [features, setFeatures] = useState<FeatureRecord | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkRow[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.modelId) setModelId(parsed.modelId);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ modelId }));
  }, [modelId]);

  const analyze = () => {
    const m = getModel(modelId);
    setFeatures(m.analyze(text));
  };

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkResults([]);
    Papa.parse<string[]>(file, {
      complete: (results) => {
        const rows = results.data.filter((r) => r && r[0]);
        rows.forEach((row, i) => {
          setTimeout(() => {
            const m = getModel(modelId);
            setBulkResults((prev) => [
              ...prev,
              { row: i + 1, features: m.analyze(row[0]) },
            ]);
          }, i * 200); // 5 rows per second
        });
      },
    });
  };

  return (
    <div className="p-4 text-white bg-gray-900 h-full overflow-auto space-y-4">
      <h1 className="text-xl font-bold">Lexical Analyzer</h1>
      <p className="text-xs text-gray-400">
        Uploading data implies acceptance of the Terms of Service. Do not
        submit sensitive information.
      </p>
      <textarea
        className="w-full h-32 text-black p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to analyze"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="text-black p-1"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-600 px-3 py-1 rounded"
          onClick={analyze}
        >
          Analyze
        </button>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsv}
          className="text-sm"
        />
      </div>
      {features && (
        <table className="mt-4 text-sm">
          <tbody>
            {Object.entries(features).map(([k, v]) => (
              <tr key={k}>
                <td className="pr-4 font-semibold">{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {bulkResults.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Bulk Analysis</h2>
          <table className="text-sm">
            <thead>
              <tr>
                <th className="pr-2 text-left">Row</th>
                {features &&
                  Object.keys(features).map((k) => (
                    <th key={k} className="pr-2 text-left">
                      {k}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {bulkResults.map(({ row, features: f }) => (
                <tr key={row}>
                  <td className="pr-2">{row}</td>
                  {features &&
                    Object.keys(features).map((k) => (
                      <td key={k} className="pr-2">
                        {f[k] ?? ''}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const displayLexicalAnalyzer = () => <LexicalAnalyzer />;

export default LexicalAnalyzer;
