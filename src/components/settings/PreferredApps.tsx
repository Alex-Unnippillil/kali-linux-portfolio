'use client';

import { useEffect, useState } from 'react';
import type { HelperType } from '../../lib/exo-open';

interface Option {
  id: string;
  name: string;
}

const TERMINAL_OPTIONS: Option[] = [
  { id: 'terminal', name: 'Terminal' },
  { id: 'serial-terminal', name: 'Serial Terminal' },
];

const BROWSER_OPTIONS: Option[] = [
  { id: 'chrome', name: 'Chrome' },
];

const FILE_OPTIONS: Option[] = [
  { id: 'file-explorer', name: 'Files' },
];

export default function PreferredApps() {
  const [values, setValues] = useState<Record<HelperType, string>>({
    TerminalEmulator: 'terminal',
    WebBrowser: 'chrome',
    FileManager: 'file-explorer',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { getPreferredApp } = await import('../../lib/exo-open');
      const [t, b, f] = await Promise.all([
        getPreferredApp('TerminalEmulator'),
        getPreferredApp('WebBrowser'),
        getPreferredApp('FileManager'),
      ]);
      if (mounted) {
        setValues({
          TerminalEmulator: t,
          WebBrowser: b,
          FileManager: f,
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (type: HelperType) =>
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [type]: value }));
      const { setPreferredApp } = await import('../../lib/exo-open');
      await setPreferredApp(type, value);
    };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center space-x-2">
        <label className="w-40 text-right">Terminal:</label>
        <select
          value={values.TerminalEmulator}
          onChange={handleChange('TerminalEmulator')}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {TERMINAL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <label className="w-40 text-right">File Manager:</label>
        <select
          value={values.FileManager}
          onChange={handleChange('FileManager')}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {FILE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <label className="w-40 text-right">Web Browser:</label>
        <select
          value={values.WebBrowser}
          onChange={handleChange('WebBrowser')}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          {BROWSER_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
