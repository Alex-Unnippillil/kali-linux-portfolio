import React, { useState } from 'react';
import usePersistentState from '../../usePersistentState';

export const linkifyCVEs = (text) =>
  text
    .replace(
      /(CVE-\d{4}-\d+)/g,
      '<a href="https://cve.mitre.org/cgi-bin/cvename.cgi?name=$1" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\n/g, '<br/>');

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [options, setOptions] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledScans, setScheduledScans] = usePersistentState('niktoScheduledScans', []);
  const [templates, setTemplates] = usePersistentState('niktoTemplates', []);

  const runScan = async (t = target, o = options) => {
    if (!t) return;
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(
        `/api/nikto?target=${encodeURIComponent(t)}${o ? `&options=${encodeURIComponent(o)}` : ''}`,
      );
      const text = await res.text();
      setResult(text);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scheduleScan = () => {
    if (!target) return;
    setScheduledScans([...scheduledScans, { target, options }]);
    setTarget('');
    setOptions('');
  };

  const runScheduledScan = (idx) => {
    const scan = scheduledScans[idx];
    if (scan) {
      runScan(scan.target, scan.options);
      setScheduledScans(scheduledScans.filter((_, i) => i !== idx));
    }
  };

  const saveTemplate = () => {
    if (!target) return;
    const name = window.prompt('Template name');
    if (!name) return;
    const others = templates.filter((t) => t.name !== name);
    setTemplates([...others, { name, target, options }]);
  };

  const loadTemplate = (e) => {
    const name = e.target.value;
    const tpl = templates.find((t) => t.name === name);
    if (tpl) {
      setTarget(tpl.target);
      setOptions(tpl.options || '');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-lg mb-4 font-bold">Nikto Scanner</h1>
      <div className="flex mb-2 space-x-2">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="http://example.com"
          className="flex-1 p-2 rounded text-black"
        />
        <input
          type="text"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder="Options"
          className="flex-1 p-2 rounded text-black"
        />
        <button type="button" onClick={runScan} className="px-4 bg-ubt-blue rounded">
          Scan
        </button>
        <button type="button" onClick={scheduleScan} className="px-4 bg-gray-600 rounded">
          Schedule
        </button>
      </div>
      <div className="flex mb-4 space-x-2 items-center">
        <select
          data-testid="template-select"
          onChange={loadTemplate}
          className="text-black p-2 rounded flex-1"
          value=""
        >
          <option value="">Load Template</option>
          {templates.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={saveTemplate} className="px-2 bg-ubt-blue rounded">
          Save Template
        </button>
      </div>
      {scheduledScans.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold mb-2">Scheduled Scans</h2>
          <ul>
            {scheduledScans.map((s, idx) => (
              <li key={idx} className="mb-1">
                {s.target} {s.options && `(${s.options})`}{' '}
                <button
                  type="button"
                  onClick={() => runScheduledScan(idx)}
                  className="px-2 bg-ubt-blue rounded"
                >
                  Run
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading ? (
        <p>Running scan...</p>
      ) : (
        <div
          className="whitespace-pre-wrap flex-1 overflow-auto"
          dangerouslySetInnerHTML={{ __html: linkifyCVEs(result) }}
        />
      )}
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;

