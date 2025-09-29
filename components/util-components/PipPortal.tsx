'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Toast from '../ui/Toast';

export type OSType = 'linux' | 'macos' | 'windows';

export interface PipPackageHint {
  name: string;
  description: string;
  docsUrl?: string;
  offlineNote?: string;
}

const OS_COMMAND_PREFIXES: Record<OSType, { label: string; prefix: string; note?: string }> = {
  linux: {
    label: 'Linux',
    prefix: 'sudo -H pip3 install',
    note: 'Uses system Python 3 with sudo for system-wide installs. Drop sudo for virtualenvs.',
  },
  macos: {
    label: 'macOS',
    prefix: 'pip3 install --user',
    note: 'Installs into the current user site-packages. Works for Homebrew Python 3.',
  },
  windows: {
    label: 'Windows',
    prefix: 'py -m pip install',
    note: 'Runs pip through the python launcher. Replace "py" with your interpreter if needed.',
  },
};

export const DEFAULT_PACKAGE_HINTS: PipPackageHint[] = [
  {
    name: 'requests',
    description: 'Human-friendly HTTP client for APIs and web scraping.',
    docsUrl: 'https://docs.python-requests.org/en/latest/',
  },
  {
    name: 'numpy',
    description: 'Fast array computations and linear algebra primitives.',
    docsUrl: 'https://numpy.org/doc/',
  },
  {
    name: 'pandas',
    description: 'Data analysis toolkit with DataFrame support and CSV/SQL helpers.',
    docsUrl: 'https://pandas.pydata.org/docs/',
  },
  {
    name: 'rich',
    description: 'Render beautiful terminal output with colors, tables, and markdown.',
    docsUrl: 'https://rich.readthedocs.io/en/stable/',
  },
  {
    name: 'pytest',
    description: 'Feature-rich testing framework with fixtures and parametrization.',
    docsUrl: 'https://docs.pytest.org/en/latest/',
  },
];

export const validatePackageName = (name: string) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name);

const buildInstallCommand = (os: OSType, packageName: string) => {
  const config = OS_COMMAND_PREFIXES[os];
  return `${config.prefix} ${packageName}`;
};

interface PipPortalProps {
  packages?: PipPackageHint[];
  title?: string;
}

const PipPortal: React.FC<PipPortalProps> = ({
  packages = DEFAULT_PACKAGE_HINTS,
  title = 'Python Package Quick Install',
}) => {
  const [toastMessage, setToastMessage] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOfflineState = () => {
      setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    };

    updateOfflineState();

    window.addEventListener('online', updateOfflineState);
    window.addEventListener('offline', updateOfflineState);

    return () => {
      window.removeEventListener('online', updateOfflineState);
      window.removeEventListener('offline', updateOfflineState);
    };
  }, []);

  const { validHints, invalidNames } = useMemo(() => {
    const valid = packages.filter((pkg) => validatePackageName(pkg.name));
    const invalid = packages
      .filter((pkg) => !validatePackageName(pkg.name))
      .map((pkg) => pkg.name);
    return { validHints: valid, invalidNames: invalid };
  }, [packages]);

  const copyToClipboard = useCallback(async (command: string) => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      setToastMessage('Clipboard is unavailable in this environment.');
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = command;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setToastMessage('Install command copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy command', error);
      setToastMessage('Unable to copy command. Copy it manually.');
    }
  }, []);

  const handleToastClose = useCallback(() => setToastMessage(''), []);

  return (
    <section className="w-full max-w-3xl space-y-6 rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-100 shadow-xl">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-cyan-300">{title}</h2>
        <p className="text-sm text-gray-300">
          Use these commands to install commonly used Python packages. Choose the line that matches your operating system and
          copy it directly into your terminal.
        </p>
        {isOffline && (
          <p className="text-sm text-amber-300" role="status">
            Offline mode detected. Showing local install hints so you can keep working without a connection.
          </p>
        )}
        {invalidNames.length > 0 && (
          <p className="text-xs text-red-400" role="alert">
            Skipped invalid package names: {invalidNames.join(', ')}.
          </p>
        )}
      </header>

      <div className="grid gap-4">
        {validHints.length === 0 ? (
          <p className="rounded-md border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            No valid package hints available. Add packages with names that match Python packaging rules (letters, numbers, dash,
            underscore, or dot).
          </p>
        ) : (
          validHints.map((pkg) => (
            <article
              key={pkg.name}
              className="space-y-3 rounded-md border border-gray-700 bg-gray-800 p-4 shadow-inner"
              aria-label={`Installation hints for ${pkg.name}`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">{pkg.name}</h3>
                {pkg.docsUrl && (
                  <a
                    href={pkg.docsUrl}
                    className="text-sm text-cyan-300 underline hover:text-cyan-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Documentation
                  </a>
                )}
              </div>
              <p className="text-sm text-gray-200">{pkg.description}</p>

              <div className="space-y-2">
                {(Object.keys(OS_COMMAND_PREFIXES) as OSType[]).map((osKey) => {
                  const config = OS_COMMAND_PREFIXES[osKey];
                  const command = buildInstallCommand(osKey, pkg.name);

                  return (
                    <div
                      key={osKey}
                      className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-900 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <span className="text-sm font-semibold text-cyan-200">{config.label}</span>
                        <pre className="mt-1 overflow-x-auto rounded bg-gray-950 px-3 py-2 text-sm text-green-200">
                          <code>{command}</code>
                        </pre>
                        {config.note && <p className="mt-1 text-xs text-gray-400">{config.note}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(command)}
                        className="inline-flex items-center justify-center rounded-md border border-cyan-400 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500 hover:text-gray-900"
                        aria-label={`Copy ${config.label} install command for ${pkg.name}`}
                      >
                        Copy
                      </button>
                    </div>
                  );
                })}
              </div>

              {pkg.offlineNote && <p className="text-xs text-amber-300">{pkg.offlineNote}</p>}
            </article>
          ))
        )}
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={handleToastClose} />}
    </section>
  );
};

export default PipPortal;
