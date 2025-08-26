import React, { useState } from 'react';
import sampleReport from './sample-report.json';

const severityStyles = {
  high: 'bg-red-400',
  medium: 'bg-yellow-300',
  low: 'bg-green-400',
  info: 'bg-blue-300',
};

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = () => {
    if (!target) return;
    setLoading(true);
    setTimeout(() => {
      setReport({ ...sampleReport, target });
      setLoading(false);
    }, 500);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-lg mb-4 font-bold">Nikto Scanner</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="http://example.com"
          className="flex-1 p-2 rounded-l text-black"
        />
        <button
          type="button"
          onClick={loadReport}
          className="px-4 bg-ubt-blue rounded-r"
        >
          Load Report
        </button>
      </div>
      {loading && <p>Loading sample report...</p>}
      {!loading && report && (
        <div className="flex-1 overflow-auto">
          <p className="mb-4">Sample report for {report.target}</p>
          {report.sections.map((section) => (
            <div key={section.title} className="mb-4">
              <h2 className="font-bold mb-2">{section.title}</h2>
              <ul className="list-disc ml-6 space-y-1">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span
                      className={`capitalize mr-2 px-2 rounded text-black ${
                        severityStyles[item.severity] || 'bg-gray-400'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {!loading && !report && (
        <p>Enter a target URL to view the sample report.</p>
      )}
      <div className="mt-4">
        <h2 className="text-lg font-bold mb-2">Understanding Response Headers</h2>
        <p className="mb-2">
          Response headers can greatly improve the security of your application.
          Explore the resources below to learn more:
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy"
              target="_blank"
              rel="noreferrer"
              className="text-ubt-blue underline"
            >
              Content-Security-Policy
            </a>{' '}
            - restricts resources the browser is allowed to load.
          </li>
          <li>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options"
              target="_blank"
              rel="noreferrer"
              className="text-ubt-blue underline"
            >
              X-Content-Type-Options
            </a>{' '}
            - prevents MIME type sniffing.
          </li>
          <li>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options"
              target="_blank"
              rel="noreferrer"
              className="text-ubt-blue underline"
            >
              X-Frame-Options
            </a>{' '}
            - protects against clickjacking.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;

