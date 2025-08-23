import React, { useMemo, useState } from 'react';

interface Finding {
  description: string;
  severity: string;
  type: string;
}

const ReportViewer: React.FC = () => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [trend, setTrend] = useState<{ date: string; counts: Record<string, number> }[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseReport(text);
      setFindings(parsed);
      const counts = parsed.reduce<Record<string, number>>((acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      }, {});
      setTrend((t) => [...t, { date: new Date().toLocaleString(), counts }]);
    };
    reader.readAsText(file);
  };

  const parseReport = (text: string): Finding[] => {
    if (/OWASPZAPReport/i.test(text)) return parseZap(text);
    if (/niktoscan|niktoreport/i.test(text)) return parseNikto(text);
    return parseHtml(text);
  };

  const parseNikto = (text: string): Finding[] => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const items = Array.from(xml.getElementsByTagName('item'));
    const severityMap: Record<string, string> = {
      '0': 'Info',
      '1': 'Low',
      '2': 'Medium',
      '3': 'High',
      '4': 'Critical',
      '5': 'Severe',
    };
    return items.map((item) => {
      const description =
        item.getElementsByTagName('description')[0]?.textContent?.trim() || '';
      const code = item.getElementsByTagName('severity')[0]?.textContent?.trim() || '';
      const severity = severityMap[code] || code;
      const type = item.getElementsByTagName('id')[0]?.textContent?.trim() || 'Nikto';
      return { description, severity, type };
    });
  };

  const parseZap = (text: string): Finding[] => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const items = Array.from(xml.getElementsByTagName('alertitem'));
    const severityMap: Record<string, string> = {
      '0': 'Info',
      '1': 'Low',
      '2': 'Medium',
      '3': 'High',
    };
    return items.map((item) => {
      const description = item.getElementsByTagName('desc')[0]?.textContent?.trim() || '';
      const risk = item.getElementsByTagName('riskcode')[0]?.textContent?.trim() || '';
      const severity = severityMap[risk] || item.getElementsByTagName('riskdesc')[0]?.textContent?.trim() || '';
      const type = item.getElementsByTagName('alert')[0]?.textContent?.trim() || 'ZAP';
      return { description, severity, type };
    });
  };

  const parseHtml = (text: string): Finding[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const rows = Array.from(doc.querySelectorAll('tr'));
    const findings: Finding[] = [];
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim() || '');
      if (cells.length >= 3) {
        const idx = cells.findIndex((c) => /(critical|high|medium|low|info)/i.test(c));
        if (idx !== -1) {
          const severity = cells[idx].match(/(Critical|High|Medium|Low|Info)/i)?.[0] || cells[idx];
          const type = cells[idx + 1] !== undefined ? cells[idx + 1] : 'Unknown';
          const description = cells[idx + 2] !== undefined ? cells[idx + 2] : '';
          findings.push({ description, severity, type });
        }
      }
    });
    return findings;
  };

  const severityOptions = useMemo(
    () => Array.from(new Set(findings.map((f) => f.severity))),
    [findings]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(findings.map((f) => f.type))),
    [findings]
  );

  const filtered = findings.filter(
    (f) =>
      (!severityFilter || f.severity === severityFilter) &&
      (!typeFilter || f.type === typeFilter)
  );

  const exportCSV = () => {
    try {
      const rows = [
        ['Type', 'Severity', 'Description'],
        ...filtered.map((f) => [f.type, f.severity, f.description]),
      ];
      const csv = rows
        .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'report.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV. Please try again or check your browser settings.');
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <div className="mb-4 flex flex-wrap items-center space-x-4">
        <input
          type="file"
          accept=".xml,.html"
          onChange={handleFileUpload}
          className="mb-2"
        />
        {findings.length > 0 && (
          <>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-black p-1"
            >
              <option value="">All Severities</option>
              {severityOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-black p-1"
            >
              <option value="">All Types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={exportCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
            >
              Export CSV
            </button>
          </>
        )}
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Type</th>
              <th className="border-b p-2">Severity</th>
              <th className="border-b p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={i} className="odd:bg-gray-800">
                <td className="p-2">{f.type}</td>
                <td className="p-2">{f.severity}</td>
                <td className="p-2">{f.description}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-2 text-center">
                  No findings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {trend.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg mb-2">Trend Summary</h2>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b p-1">Upload</th>
                {severityOptions.map((s) => (
                  <th key={s} className="border-b p-1">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.map((t, i) => (
                <tr key={i} className="odd:bg-gray-800">
                  <td className="p-1">{t.date}</td>
                  {severityOptions.map((s) => (
                    <td key={s} className="p-1">
                      {t.counts[s] || 0}
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

export default ReportViewer;

