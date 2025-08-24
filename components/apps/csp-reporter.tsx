import React, { useEffect, useState } from 'react';
import { sendTelemetry } from '@lib/game';

const BROWSER_SUPPORT = [
  { name: 'Chrome', support: true },
  { name: 'Edge', support: true },
  { name: 'Firefox', support: true },
  { name: 'Safari', support: false },
];

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
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [policy, setPolicy] = useState('');
  const [simResult, setSimResult] = useState<{ directive: string; uri: string }[] | null>(
    null,
  );
  const [reportUriConfig, setReportUriConfig] = useState('');
  const [reportToConfig, setReportToConfig] = useState('');
  const [eventSupported, setEventSupported] = useState(false);
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<{ name: string; policy: string }[]>([]);
  const [fixes, setFixes] = useState<
    { directive: string; uri: string; suggestion: string }[]
  >([]);

  const fetchReports = () => {
    const qs = search ? `?q=${encodeURIComponent(search)}` : '';
    fetch(`/api/csp-reporter${qs}`)
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setTop(data.top || {});
        setSummary(data.summary || {});
        setTemplates(data.templates || []);
        setFixes(data.fixes || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReports();
    const id = setInterval(fetchReports, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  useEffect(() => {
    const endpoint = `${window.location.origin}/api/csp-reporter`;
    setReportUriConfig(
      `Content-Security-Policy: default-src 'self'; report-uri ${endpoint}`,
    );
    setReportToConfig(
      `Content-Security-Policy: default-src 'self'; report-to csp-endpoint\\nReport-To: {"group":"csp-endpoint","max_age":10886400,"endpoints":[{"url":"${endpoint}"}]}`,
    );
    setEventSupported('SecurityPolicyViolationEvent' in window);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      setTimeline((t) => [
        ...t,
        {
          type: 'csp-violation',
          time: Date.now(),
          directive: e.effectiveDirective || e.violatedDirective,
          blockedURI: e.blockedURI,
          sourceFile: e.sourceFile,
          lineNumber: e.lineNumber,
          columnNumber: e.columnNumber,
        },
      ]);
    };
    document.addEventListener('securitypolicyviolation', handler);
    return () => document.removeEventListener('securitypolicyviolation', handler);
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
      <div className="mb-4 flex gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports"
          className="p-1 text-black flex-grow"
        />
        <a
          href={`/api/csp-reporter?download=json${
            search ? `&q=${encodeURIComponent(search)}` : ''
          }`}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Download logs
        </a>
      </div>
      <p className="mb-2">
        Use the snippets below to send Content Security Policy violation reports to this application.
      </p>

      <h2 className="mt-4 mb-1 font-semibold">report-uri</h2>
      <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto mb-4">
{reportUriConfig}
      </pre>

      <h2 className="mt-4 mb-1 font-semibold">report-to</h2>
      <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto mb-4">
{reportToConfig}
      </pre>

      <h2 className="mt-6 mb-2 text-lg">Browser support</h2>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left border-b border-gray-700">
            <th className="pr-2">Browser</th>
            <th>Support</th>
          </tr>
        </thead>
        <tbody>
          {BROWSER_SUPPORT.map((b) => (
            <tr key={b.name} className="border-b border-gray-800">
              <td className="pr-2">{b.name}</td>
              <td>{b.support ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm mb-4">
        This browser: {eventSupported ? '✅ supports' : '❌ does not support'}
        {' '}SecurityPolicyViolationEvent
      </p>

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

      <h2 className="mt-6 mb-2 text-lg">Summary</h2>
      {Object.keys(summary).length > 0 ? (
        <ul className="text-sm mb-4">
          {Object.entries(summary).map(([dir, count]) => (
            <li key={dir} className="break-all">
              {dir}: {count}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm mb-4">No data</p>
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

      {fixes.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg">Quick fixes</h2>
          <ul className="text-sm list-disc pl-4">
            {fixes.map((f, i) => (
              <li key={i} className="break-all">
                {f.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-lg">Policy templates</h2>
          <ul className="text-sm list-disc pl-4">
            {templates.map((t) => (
              <li key={t.name} className="break-all">
                <strong>{t.name}:</strong> <code>{t.policy}</code>
              </li>
            ))}
          </ul>
        </div>
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

