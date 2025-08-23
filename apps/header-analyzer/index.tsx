import React, { useState } from 'react';

interface HeaderReport {
  header: string;
  value: string | null;
  grade: string;
  message: string;
}

interface ApiResponse {
  url: string;
  overallGrade: string;
  results: HeaderReport[];
}

const HeaderAnalyzer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [report, setReport] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch(`/api/headers?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error('Request failed');
      }
      const data = (await res.json()) as ApiResponse;
      setReport(data);
    } catch (err) {
      setError('Could not fetch headers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Analyze
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {report && (
        <div className="overflow-auto">
          <div className="mb-2 font-bold">Overall Grade: {report.overallGrade}</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1">Header</th>
                <th className="border px-2 py-1">Value</th>
                <th className="border px-2 py-1">Grade</th>
                <th className="border px-2 py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.header}>
                  <td className="border px-2 py-1">{r.header}</td>
                  <td className="border px-2 py-1 break-all">{r.value || '—'}</td>
                  <td className="border px-2 py-1">{r.grade}</td>
                  <td className="border px-2 py-1">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HeaderAnalyzer;
