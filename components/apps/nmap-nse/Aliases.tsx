import React, { useMemo, useRef, useState } from 'react';

export type AliasMap = Record<string, string>;

type FeedbackState = {
  kind: 'success' | 'error';
  message: string;
} | null;

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const hostRegex = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

export const parseHostsFile = (text: string): {
  map: AliasMap;
  errors: number[];
} => {
  const map: AliasMap = {};
  const errors: number[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const sanitized = line.replace(/#.*/, '').trim();
    if (!sanitized) return;
    const parts = sanitized.split(/\s+/);
    if (parts.length < 2) {
      errors.push(index + 1);
      return;
    }
    const [ip, hostname] = parts;
    if (!ipv4Regex.test(ip) || !hostRegex.test(hostname)) {
      errors.push(index + 1);
      return;
    }
    map[ip] = hostname;
  });

  return { map, errors };
};

type AliasesProps = {
  aliases: AliasMap;
  onChange: (next: AliasMap) => void;
};

const Aliases: React.FC<AliasesProps> = ({ aliases, onChange }) => {
  const [ipInput, setIpInput] = useState('');
  const [hostInput, setHostInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const aliasEntries = useMemo(
    () =>
      Object.entries(aliases).sort(([ipA], [ipB]) =>
        ipA.localeCompare(ipB, undefined, { numeric: true })
      ),
    [aliases]
  );

  const resetFeedbackLater = () => {
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const ip = ipInput.trim();
    const host = hostInput.trim();
    if (!ip || !host) {
      setFeedback({ kind: 'error', message: 'Both IP and host name are required.' });
      resetFeedbackLater();
      return;
    }
    if (!ipv4Regex.test(ip)) {
      setFeedback({ kind: 'error', message: 'Enter a valid IPv4 address.' });
      resetFeedbackLater();
      return;
    }
    if (!hostRegex.test(host)) {
      setFeedback({ kind: 'error', message: 'Host names may include letters, numbers, hyphens, and dots.' });
      resetFeedbackLater();
      return;
    }
    onChange({
      ...aliases,
      [ip]: host,
    });
    setIpInput('');
    setHostInput('');
    setFeedback({ kind: 'success', message: `Alias saved for ${ip}.` });
    resetFeedbackLater();
  };

  const handleRemove = (ip: string) => {
    const next = { ...aliases };
    delete next[ip];
    onChange(next);
    setFeedback({ kind: 'success', message: `Alias removed for ${ip}.` });
    resetFeedbackLater();
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImport: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { map, errors } = parseHostsFile(text);
      const importedCount = Object.keys(map).length;
      if (!importedCount && errors.length) {
        setFeedback({
          kind: 'error',
          message: `No aliases imported. Check line${
            errors.length > 1 ? 's' : ''
          } ${errors.join(', ')}.`,
        });
        resetFeedbackLater();
        return;
      }
      onChange({
        ...aliases,
        ...map,
      });
      if (errors.length) {
        setFeedback({
          kind: 'error',
          message: `Imported ${importedCount} alias${
            importedCount === 1 ? '' : 'es'
          }. Invalid line${errors.length > 1 ? 's' : ''}: ${errors.join(', ')}.`,
        });
      } else {
        setFeedback({
          kind: 'success',
          message: `Imported ${importedCount} alias${
            importedCount === 1 ? '' : 'es'
          } from hosts file.`,
        });
      }
      resetFeedbackLater();
    } catch (err) {
      setFeedback({ kind: 'error', message: 'Unable to read hosts file.' });
      resetFeedbackLater();
    } finally {
      // reset so the same file can be imported twice if needed
      event.target.value = '';
    }
  };

  const handleExport = () => {
    if (aliasEntries.length === 0) {
      setFeedback({ kind: 'error', message: 'Add an alias before exporting.' });
      resetFeedbackLater();
      return;
    }

    const lines = aliasEntries.map(([ip, host]) => `${ip}\t${host}`).join('\n');

    if (typeof window === 'undefined' || !window.URL?.createObjectURL) {
      setFeedback({
        kind: 'error',
        message: 'File export is not available in this environment.',
      });
      resetFeedbackLater();
      return;
    }

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nmap-host-aliases.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setFeedback({ kind: 'success', message: 'Aliases exported as hosts file.' });
    resetFeedbackLater();
  };

  return (
    <div className="bg-black border border-gray-700 rounded p-3 space-y-3">
      <p className="text-xs text-gray-300">
        Map discovered IP addresses to friendly names. The format matches
        <span className="ml-1 font-mono">/etc/hosts</span> entries.
      </p>
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2"
        aria-label="Add host alias"
      >
        <label className="flex-1 text-xs text-gray-200" htmlFor="alias-ip">
          IP address
          <input
            id="alias-ip"
            value={ipInput}
            onChange={(event) => setIpInput(event.target.value)}
            className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-white"
            placeholder="192.0.2.10"
            autoComplete="off"
          />
        </label>
        <label className="flex-1 text-xs text-gray-200" htmlFor="alias-host">
          Host name
          <input
            id="alias-host"
            value={hostInput}
            onChange={(event) => setHostInput(event.target.value)}
            className="mt-1 w-full rounded border border-gray-600 bg-gray-900 p-2 text-white"
            placeholder="web01.example"
            autoComplete="off"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded bg-ub-grey px-3 py-2 text-sm font-semibold text-black hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Add alias
          </button>
        </div>
      </form>
      {aliasEntries.length > 0 && (
        <ul className="max-h-32 space-y-1 overflow-y-auto text-sm">
          {aliasEntries.map(([ip, host]) => (
            <li
              key={ip}
              className="flex items-center justify-between rounded bg-gray-900 px-2 py-1"
            >
              <span className="font-mono text-gray-200">
                {host} ({ip})
              </span>
              <button
                type="button"
                className="text-xs text-red-400 hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => handleRemove(ip)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleImportClick}
          className="rounded bg-ub-grey px-3 py-2 text-sm font-semibold text-black hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Import hosts file
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-ub-grey px-3 py-2 text-sm font-semibold text-black hover:bg-ub-yellow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
        >
          Export aliases
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.conf,.hosts,text/plain"
          onChange={handleImport}
          className="sr-only"
        />
      </div>
      {feedback && (
        <div
          role="status"
          className={`text-xs ${
            feedback.kind === 'error' ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
};

export default Aliases;
