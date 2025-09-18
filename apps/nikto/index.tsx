'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { mockNiktoResolver, validateNiktoTarget } from '../../components/apps/nikto/validation';
import type { NormalizedTarget } from '../../components/apps/nikto/validation';
import HeaderLab from './components/HeaderLab';

interface NiktoFinding {
  path: string;
  finding: string;
  references: string[];
  severity: string;
  details: string;
}

const REQUIRED_TARGET_MESSAGE = 'Enter a hostname or URL before running the simulation.';

type ValidationState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'valid'; normalized: NormalizedTarget }
  | { status: 'invalid'; message: string };

const NiktoPage: React.FC = () => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [ssl, setSsl] = useState(false);
  const [findings, setFindings] = useState<NiktoFinding[]>([]);
  const [rawLog, setRawLog] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [hostDirty, setHostDirty] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });

  const trimmedHost = host.trim();
  const trimmedPort = port.trim();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nikto/report.json');
        const data = await res.json();
        setFindings(data);
      } catch {
        // ignore errors
      }
      try {
        const logRes = await fetch('/demo/nikto-output.txt');
        setRawLog(await logRes.text());
      } catch {
        // ignore errors
      }
    };
    load();
  }, []);

  const command = `nikto -h ${trimmedHost || 'TARGET'}${trimmedPort ? ` -p ${trimmedPort}` : ''}${
    ssl ? ' -ssl' : ''
  }`;

  const grouped = useMemo(() => {
    return findings.reduce<Record<string, NiktoFinding[]>>((acc, f) => {
      acc[f.severity] = acc[f.severity] || [];
      acc[f.severity].push(f);
      return acc;
    }, {});
  }, [findings]);

  const headers = useMemo(() => {
    return rawLog
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^\+\s*/, ''))
      .filter((l) => /^[A-Za-z-]+:/.test(l))
      .map((line) => {
        const idx = line.indexOf(':');
        return { name: line.slice(0, idx), value: line.slice(idx + 1).trim() };
      });
  }, [rawLog]);

  const url = useMemo(() => {
    if (!trimmedHost) return 'http://target';
    const proto = ssl ? 'https://' : 'http://';
    return `${proto}${trimmedHost}${trimmedPort ? `:${trimmedPort}` : ''}`;
  }, [trimmedHost, trimmedPort, ssl]);

  useEffect(() => {
    let cancelled = false;

    if (!trimmedHost) {
      if (hostDirty || Boolean(trimmedPort)) {
        setValidation((current) => {
          if (current.status === 'invalid' && current.message === REQUIRED_TARGET_MESSAGE) {
            return current;
          }
          return {
            status: 'invalid',
            message: REQUIRED_TARGET_MESSAGE,
          };
        });
      } else {
        setValidation((current) => (current.status === 'idle' ? current : { status: 'idle' }));
      }
      return;
    }

    setValidation((current) => (current.status === 'checking' ? current : { status: 'checking' }));

    validateNiktoTarget(trimmedHost, {
      port: trimmedPort,
      resolver: mockNiktoResolver,
    })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setValidation({ status: 'valid', normalized: result.normalized });
        } else {
          setValidation({ status: 'invalid', message: result.error });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValidation({
            status: 'invalid',
            message: 'Unable to validate target. Please try again.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedHost, trimmedPort, hostDirty]);

  const showValidation =
    validation.status !== 'idle' && (hostDirty || Boolean(trimmedPort));

  const validationMessage = (() => {
    if (!showValidation) {
      return undefined;
    }
    if (validation.status === 'invalid') {
      return validation.message;
    }
    if (validation.status === 'checking') {
      return 'Validating target…';
    }
    if (validation.status === 'valid') {
      const { hostLabel, port: resolvedPort, address } = validation.normalized;
      const displayTarget = resolvedPort ? `${hostLabel}:${resolvedPort}` : hostLabel;
      const addressLabel = address ? ` (${address})` : '';
      return `Target resolves to ${displayTarget}${addressLabel}. Simulation ready.`;
    }
    return undefined;
  })();

  const messageClass = (() => {
    if (!showValidation || !validationMessage) {
      return '';
    }
    if (validation.status === 'invalid') {
      return 'text-red-400';
    }
    if (validation.status === 'valid') {
      return 'text-green-300';
    }
    return 'text-yellow-300';
  })();

  const messageId = showValidation && validationMessage ? 'nikto-target-validation' : undefined;
  const scanDisabled = validation.status !== 'valid';
  const buttonLabel = validation.status === 'checking' ? 'Validating…' : 'Simulate Scan';

  const copySection = async (list: NiktoFinding[]) => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(list, null, 2));
    } catch {
      // ignore
    }
  };

  const exportSection = (list: NiktoFinding[], sev: string) => {
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nikto-${sev.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const colorMap: Record<string, string> = {
    High: 'bg-red-700',
    Medium: 'bg-yellow-700',
    Info: 'bg-blue-700',
  };

  const summary = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    rawLog
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (/vulnerability/i.test(line)) {
          counts.critical += 1;
        } else if (/not defined/i.test(line)) {
          counts.warning += 1;
        } else {
          counts.info += 1;
        }
      });
    return counts;
  }, [rawLog]);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl mb-4">Nikto Scanner</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Build a nikto command without running any scans. Data and reports are static and for learning only.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setHostDirty(true);
        }}
        className="grid gap-4 md:grid-cols-4 items-end"
      >
        <div>
          <label htmlFor="nikto-host" className="block text-sm mb-1">
            Host
          </label>
          <input
            id="nikto-host"
            className="w-full p-2 rounded text-black"
            value={host}
            onChange={(e) => {
              setHost(e.target.value);
              if (!hostDirty) {
                setHostDirty(true);
              }
            }}
            onBlur={() => setHostDirty(true)}
            aria-invalid={validation.status === 'invalid'}
            aria-describedby={messageId}
          />
          {validationMessage && (
            <p
              id={messageId}
              className={`mt-2 text-sm ${messageClass}`}
              role={validation.status === 'invalid' ? 'alert' : undefined}
              aria-live="polite"
            >
              {validationMessage}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="nikto-port" className="block text-sm mb-1">
            Port
          </label>
          <input
            id="nikto-port"
            type="number"
            className="w-full p-2 rounded text-black"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            min={1}
            max={65535}
          />
        </div>
        <div className="flex items-center mt-2 md:mt-0">
          <input
            id="nikto-ssl"
            type="checkbox"
            className="mr-2"
            checked={ssl}
            onChange={(e) => setSsl(e.target.checked)}
          />
          <label htmlFor="nikto-ssl" className="text-sm">
            SSL
          </label>
        </div>
        <div className="flex items-center">
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-blue-600 rounded text-sm font-semibold disabled:bg-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
            disabled={scanDisabled}
          >
            {buttonLabel}
          </button>
        </div>
      </form>
      <div>
        <h2 className="text-lg mb-2">Command Preview</h2>
        <pre className="bg-black text-green-400 p-2 rounded overflow-auto">{command}</pre>
      </div>
      <div className="relative bg-gray-800 p-4 rounded shadow space-y-4">
        <div className="absolute top-2 right-2 bg-gray-700 text-xs px-2 py-1 rounded-full">
          Phase 3 • {findings.length} results
        </div>
        <div>
          <h2 className="text-lg mb-2">Target</h2>
          <p className="mb-2">
            <span className="font-bold">URL:</span> {url}
          </p>
          {headers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-md mb-1">Headers</h3>
              <ul className="text-sm space-y-1 font-mono">
                {headers.map((h) => (
                  <li key={h.name}>
                    <span className="font-bold">{h.name}:</span> {h.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg mb-2">Vulnerabilities</h2>
          {Object.entries(grouped).map(([sev, list]) => {
            const open = openSections[sev];
            return (
              <div key={sev} className="mb-2 border border-gray-700 rounded">
                <div
                  className="flex justify-between items-center p-2 bg-gray-800 cursor-pointer"
                  onClick={() => setOpenSections((s) => ({ ...s, [sev]: !open }))}
                >
                  <span className="font-bold">{sev}</span>
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-600 rounded-full px-2 text-xs">{list.length}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copySection(list);
                      }}
                      className="text-xs bg-blue-600 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSection(list, sev);
                      }}
                      className="text-xs bg-blue-600 px-2 py-1 rounded"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
                {open && (
                  <ul className="p-2 space-y-1">
                    {list.map((f) => (
                      <li
                        key={f.path}
                        className={`p-2 rounded ${colorMap[f.severity] || 'bg-gray-700'}`}
                      >
                        <span className="font-mono">{f.path}</span>: {f.finding}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {rawLog && (
        <div>
          <h2 className="text-lg mb-2">Summary</h2>
          <div className="flex space-x-2 mb-4 text-sm">
            <div className="bg-red-700 px-2 py-1 rounded">Critical: {summary.critical}</div>
            <div className="bg-yellow-600 px-2 py-1 rounded">Warning: {summary.warning}</div>
            <div className="bg-blue-600 px-2 py-1 rounded">Info: {summary.info}</div>
          </div>
          <h2 className="text-lg mb-2">Raw Log</h2>
          <pre className="bg-black text-green-400 p-2 rounded overflow-auto">{rawLog}</pre>
        </div>
      )}
      <HeaderLab />
    </div>
  );
};

export default NiktoPage;

