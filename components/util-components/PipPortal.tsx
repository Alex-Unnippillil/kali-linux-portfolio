import React, { useCallback, useEffect, useRef, useState } from 'react';
import copyToClipboard from '../../utils/clipboard';

type Step = {
  description: string;
  command?: string;
  note?: string;
};

type Resource = {
  label: string;
  href: string;
};

type Section = {
  os: string;
  summary: string;
  steps: Step[];
  resources?: Resource[];
};

const sections: Section[] = [
  {
    os: 'Kali & Debian-based Linux',
    summary: 'Install the system packages for Python 3 and keep pip isolated per user.',
    steps: [
      {
        description: 'Update package metadata to pick up the latest Python builds from the Kali repositories.',
        command: 'sudo apt update',
      },
      {
        description: 'Install Python 3 and pip. Kali ships Python 3 by default, but this command reinstalls any missing pieces.',
        command: 'sudo apt install python3 python3-pip',
      },
      {
        description:
          'Upgrade pip to the latest release and ensure user site-packages are created with the correct permissions.',
        command: 'python3 -m pip install --upgrade pip --user',
      },
      {
        description: 'Verify the installation and review the location of the user-level packages.',
        command: 'python3 -m pip --version',
      },
    ],
    resources: [
      {
        label: 'Python on Kali Linux',
        href: 'https://www.kali.org/docs/tools/kali-python/',
      },
      {
        label: 'pip installation docs',
        href: 'https://pip.pypa.io/en/stable/installation/',
      },
    ],
  },
  {
    os: 'macOS',
    summary: 'Use Homebrew to install Python 3, then upgrade pip in the user site-packages directory.',
    steps: [
      {
        description: 'Make sure Homebrew is up to date so you get the most recent Python formula.',
        command: 'brew update',
      },
      {
        description: 'Install Python 3. This also places the `python3` and `pip3` binaries under `/opt/homebrew/bin`.',
        command: 'brew install python@3',
      },
      {
        description: 'Upgrade pip using the Python launcher. The `--user` flag keeps packages in your home directory.',
        command: 'python3 -m pip install --upgrade pip --user',
      },
      {
        description: 'Confirm the binaries are on your shell PATH and report the pip version.',
        command: 'python3 -m pip --version',
      },
    ],
    resources: [
      {
        label: 'Homebrew Python formula',
        href: 'https://formulae.brew.sh/formula/python',
      },
      {
        label: 'pip user installs on macOS',
        href: 'https://pip.pypa.io/en/stable/user_guide/#user-installs',
      },
    ],
  },
  {
    os: 'Windows',
    summary: 'Install Python from the Microsoft Store or winget, then manage pip from the `py` launcher.',
    steps: [
      {
        description: 'Install Python 3.12 (or the latest available) with winget. This includes pip by default.',
        command: 'winget install -e --id Python.Python.3.12',
      },
      {
        description: 'Upgrade pip using the `py` launcher to avoid PATH issues.',
        command: 'py -m pip install --upgrade pip',
      },
      {
        description: 'Optionally set a per-user packages directory so installs do not require administrator access.',
        command: 'py -m pip config set global.target "%USERPROFILE%\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages"',
      },
      {
        description: 'Verify the installation and print the pip version.',
        command: 'py -m pip --version',
      },
    ],
    resources: [
      {
        label: 'Python for Windows documentation',
        href: 'https://docs.python.org/3/using/windows.html',
      },
      {
        label: 'pip user guide',
        href: 'https://pip.pypa.io/en/stable/user_guide/',
      },
    ],
  },
];

const CommandSnippet: React.FC<{ command: string }> = ({ command }) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const success = await copyToClipboard(command);
    if (success) {
      setStatus('copied');
      timeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      timeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
    }
  }, [command]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <div className="relative mt-3 w-full rounded-lg border border-kali-border bg-kali-dark/70 p-3 text-xs sm:text-sm">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-md border border-kali-border/80 bg-kali-surface px-3 py-1 text-xs font-medium text-kali-text transition hover:border-kali-primary/60 hover:text-kali-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        aria-label="Copy command to clipboard"
      >
        {status === 'copied' ? 'Copied' : status === 'error' ? 'Retry' : 'Copy'}
      </button>
      <pre className="whitespace-pre-wrap break-words pr-20 font-mono leading-relaxed text-kali-text/90">
        <code>{command}</code>
      </pre>
    </div>
  );
};

const PipPortal: React.FC = () => {
  return (
    <div className="space-y-6 text-sm leading-6 text-kali-text/90">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-kali-text">Install pip by operating system</h2>
        <p>
          Choose your platform to view the recommended installation commands. Each section keeps commands readable on
          small screens and includes a one-click copy button so you can quickly drop them into a terminal session.
        </p>
      </header>

      <div className="space-y-4">
        {sections.map((section) => (
          <details
            key={section.os}
            className="group rounded-xl border border-kali-border/70 bg-kali-surface/70 backdrop-blur-sm"
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-base font-medium text-kali-text"
              aria-label={`Toggle ${section.os} installation guide`}
            >
              <span>
                <span className="block text-sm uppercase tracking-wider text-kali-text/60">{section.summary}</span>
                <span className="text-lg font-semibold text-kali-text">{section.os}</span>
              </span>
              <svg
                className="h-5 w-5 flex-none text-kali-text transition-transform duration-200 group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="space-y-4 px-4 pb-5 pt-1">
              <ol className="space-y-4">
                {section.steps.map((step, index) => (
                  <li key={step.description} className="space-y-2">
                    <div className="flex items-start gap-3 text-left">
                      <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-kali-primary/20 text-xs font-semibold text-kali-primary">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-kali-text/90">{step.description}</p>
                    </div>
                    {step.command ? <CommandSnippet command={step.command} /> : null}
                    {step.note ? (
                      <p className="pl-9 text-xs text-kali-text/70 sm:text-sm">{step.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
              {section.resources ? (
                <div className="flex flex-wrap gap-3 border-t border-kali-border/60 pt-4 text-xs sm:text-sm">
                  {section.resources.map((resource) => (
                    <a
                      key={resource.href}
                      href={resource.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-kali-border/80 bg-kali-dark/40 px-3 py-2 font-medium text-kali-primary transition hover:border-kali-primary/60 hover:text-kali-text"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 9h6m-6 3h6m-6 3h6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {resource.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};

export default PipPortal;
