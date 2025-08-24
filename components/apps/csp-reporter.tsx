import React, { useEffect, useState } from 'react';
import { sendTelemetry } from '@lib/game';

interface Report {
  [key: string]: any;
}

interface TopOffender {
  uri: string;
  count: number;
}

interface TimelineEvent {
  type: string;
  time: number;
  directive: string;
  blockedURI: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}

const CspReporter: React.FC = () => {
  const [demoPage, setDemoPage] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [top, setTop] = useState<Record<string, TopOffender[]>>({});
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [policy, setPolicy] = useState('');
  const [simResult, setSimResult] = useState<{ directive: string; uri: string }[] | null>(
    null,
  );

  const fetchReports = () => {
    fetch('/api/csp-reporter')
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setTop(data.top || {});
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    const id = setInterval(fetchReports, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && e.data.type === 'csp-violation') {
        setTimeline((t) => [...t, e.data]);
        sendTelemetry({
          name: 'csp-violation',
          data: {
            directive: e.data.directive,
            blocked: e.data.blockedURI,
          },
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const demoDoc = `
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; report-uri /api/csp-reporter">
<script>
document.addEventListener('securitypolicyviolation', function(e){
  parent.postMessage({
    type: 'csp-violation',
    time: Date.now(),
    directive: e.effectiveDirective || e.violatedDirective,
    blockedURI: e.blockedURI,
    sourceFile: e.sourceFile,
    lineNumber: e.lineNumber,
    columnNumber: e.columnNumber
  }, '*');
});
</script>
</head>
<body>
<script src="https://example.com/evil.js"></script>
</body>
</html>`;

  const runSimulation = () => {
    if (!policy.trim()) return;
    fetch(`/api/csp-reporter?policy=${encodeURIComponent(policy)}`)
      .then((res) => res.json())
      .then((data) => {
        setSimResult(data.simulate?.blocked || []);
      })
      .catch(() => {});
  };

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

      {timeline.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg">Client timeline</h2>
          <ul className="text-sm">
            {timeline.map((e, i) => (
              <li key={i} className="mb-1">
                {new Date(e.time).toLocaleTimeString()} - {e.directive} blocked {e.blockedURI}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-6 mb-2 text-lg">Top offenders</h2>
      {Object.keys(top).length > 0 ? (
        Object.entries(top).map(([dir, list]) => (
          <div key={dir} className="mb-4">
            <h3 className="font-semibold">{dir}</h3>
            <ul className="pl-4 list-disc text-sm">
              {list.map((o) => (
                <li key={o.uri} className="break-all">
                  {o.uri} ({o.count})
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No data</p>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-lg">Policy simulation</h2>
        <textarea
          value={policy}
          onChange={(e) => setPolicy(e.target.value)}
          className="w-full h-24 p-2 text-black"
          placeholder="default-src 'self';"
        />
        <button
          type="button"
          onClick={runSimulation}
          className="mt-2 px-3 py-1 bg-blue-600 rounded"
        >
          Simulate
        </button>
        {simResult && (
          simResult.length === 0 ? (
            <p className="mt-2 text-green-500 text-sm">
              Policy allows all recorded requests; safe to enforce.
            </p>
          ) : (
            <ul className="mt-2 list-disc list-inside text-sm text-red-400">
              {simResult.map((b, i) => (
                <li key={i} className="break-all">
                  {b.directive} would block {b.uri}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

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

