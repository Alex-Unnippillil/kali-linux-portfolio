import React, { useEffect, useState } from 'react';
import cvss from 'cvss';

const CvssCalculator: React.FC = () => {
  const [vector, setVector] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [severity, setSeverity] = useState('');
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!vector) {
      setScore(null);
      setSeverity('');
      setMetrics({});
      return;
    }

    try {
      const base = cvss.getBase(vector);
      setScore(base.score);
      setSeverity(base.rating);

      const parts = vector.split('/');
      const start = parts[0].startsWith('CVSS') ? 1 : 0;
      const obj: Record<string, string> = {};
      parts.slice(start).forEach((p) => {
        const [k, v] = p.split(':');
        if (k && v) obj[k] = v;
      });
      setMetrics(obj);
    } catch {
      setScore(null);
      setSeverity('Invalid vector');
      setMetrics({});
    }
  }, [vector]);

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <input
        type="text"
        value={vector}
        onChange={(e) => setVector(e.target.value)}
        placeholder="Enter CVSS vector"
        className="w-full p-2 mb-4 rounded text-black"
      />
      <div className="mb-4">
        <div>Base Score: {score !== null ? score.toFixed(1) : '-'}</div>
        <div>Severity: {severity || '-'}</div>
      </div>
      {Object.keys(metrics).length > 0 && (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b pb-1">Metric</th>
              <th className="border-b pb-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics).map(([k, v]) => (
              <tr key={k}>
                <td className="py-1 pr-4">{k}</td>
                <td className="py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CvssCalculator;

export const displayCvssCalculator = () => <CvssCalculator />;

