import React, { useEffect, useState } from 'react';

interface Report {
  [key: string]: any;
}

const CspReporter: React.FC = () => {
  const [demoPage, setDemoPage] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);

  const fetchReports = () => {
    fetch('/api/csp-reporter')
      .then((res) => res.json())
      .then((data) => setReports(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    const id = setInterval(fetchReports, 5000);
    return () => clearInterval(id);
  }, []);

  const demoDoc = `\n<html>\n<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; report-uri /api/csp-reporter">\n</head>\n<body>\n<script src="https://example.com/evil.js"></script>\n</body>\n</html>`;

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <h1 className="text-xl mb-2">CSP Reporter</h1>
      <p className="mb-2">
        Use the snippets below to send Content Security Policy violation reports to this application.
      </p>

      <h2 className="mt-4 mb-1 font-semibold">report-uri</h2>
      <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto mb-4">
{`Content-Security-Policy: default-src 'self'; report-uri /api/csp-reporter`}
      </pre>

      <h2 className="mt-4 mb-1 font-semibold">report-to</h2>
      <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto mb-4">
{`Content-Security-Policy: default-src 'self'; report-to csp-endpoint\nReport-To: {"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"/api/csp-reporter"}]}`}
      </pre>

      <button
        type="button"
        onClick={() => setDemoPage((d) => !d)}
        className="px-3 py-1 bg-blue-600 rounded"
      >
        {demoPage ? 'Hide' : 'Show'} demo page
      </button>

      {demoPage && (
        <iframe
          sandbox="allow-scripts"
          srcDoc={demoDoc}
          className="w-full h-64 border mt-4"
        />
      )}

      <h2 className="mt-6 mb-2 text-lg">Received reports</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-700">
            <th className="pr-2">Document</th>
            <th className="pr-2">Violated</th>
            <th className="pr-2">Blocked</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => {
            const rep = r['csp-report'] || r;
            return (
              <tr key={i} className="border-b border-gray-800">
                <td className="pr-2">{rep['document-uri']}</td>
                <td className="pr-2">{rep['violated-directive'] || rep['effective-directive']}</td>
                <td className="pr-2 break-all">{rep['blocked-uri']}</td>
              </tr>
            );
          })}
          {reports.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-400">
                No reports yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CspReporter;
export const displayCspReporter = () => <CspReporter />;
