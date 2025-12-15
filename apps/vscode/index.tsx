'use client';

import Image from 'next/image';
import { useMemo, useRef } from 'react';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from '../../components/ToolbarIcons';
import { kaliTheme } from '../../styles/themes/kali';
import { SIDEBAR_WIDTH, ICON_SIZE } from './utils';

export const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/github/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md';

const STACKBLITZ_IFRAME_ALLOW = 'clipboard-read; clipboard-write; fullscreen';
const STACKBLITZ_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads';

const EDITOR_TABS = [
  { label: 'README.md', isActive: true },
  { label: 'apps/vscode/index.tsx', isActive: false },
  { label: 'package.json', isActive: false },
];

export default function VsCode() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const openInStackBlitzUrl = useMemo(() => {
    try {
      const url = new URL(STACKBLITZ_EMBED_URL);
      url.searchParams.delete('embed');
      return url.toString();
    } catch {
      return STACKBLITZ_EMBED_URL;
    }
  }, []);

  return (
    <div
      className="flex flex-col min-[1366px]:flex-row h-full w-full max-w-full"
      style={{ backgroundColor: kaliTheme.background, color: kaliTheme.text }}
    >
      <aside
        className="flex flex-col items-center gap-3 px-2 py-4 border-r border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]"
        style={{ width: SIDEBAR_WIDTH, backgroundColor: 'var(--kali-panel)' }}
      >
        <div
          className="rounded-md bg-[color:var(--color-primary)] opacity-80 shadow-inner shadow-black/40 transition-opacity hover:opacity-100"
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
        <div
          className="rounded-md bg-[color:var(--color-primary)] opacity-80 shadow-inner shadow-black/40 transition-opacity hover:opacity-100"
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
      </aside>
      <div className="flex-1 flex flex-col border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] rounded-md overflow-hidden">
        <div
          className="flex items-center justify-end gap-2 px-3 py-2 border-b border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]"
        >
          <button aria-label="Minimize">
            <MinimizeIcon />
          </button>
          <button aria-label="Maximize">
            <MaximizeIcon />
          </button>
          <button aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <nav className="flex items-center gap-1 border-b border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1">
          {EDITOR_TABS.map(({ label, isActive }) => (
            <button
              key={label}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-xs font-medium tracking-tight transition-colors ${
                isActive
                  ? 'border border-b-0 border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] shadow-[inset_0_-1px_0_var(--kali-panel-border)]'
                  : 'text-[color:var(--color-text)] opacity-70 hover:opacity-100 hover:bg-[var(--kali-panel-highlight)]'
              }`}
            >
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isActive ? 'var(--kali-terminal-green)' : 'var(--kali-panel-border)',
                  boxShadow: isActive ? '0 0 6px var(--kali-terminal-green)' : undefined,
                }}
              />
              {label}
            </button>
          ))}
          <span className="ml-auto px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--color-text)] opacity-60">
            Spaces: 2
          </span>
        </nav>
        <div className="relative flex-1" style={{ backgroundColor: kaliTheme.background }}>
          <iframe
            ref={frameRef}
            src={STACKBLITZ_EMBED_URL}
            title="Visual Studio Code (StackBlitz)"
            className="h-full w-full border-0"
            allow={STACKBLITZ_IFRAME_ALLOW}
            sandbox={STACKBLITZ_IFRAME_SANDBOX}
            loading="lazy"
          />
          <a
            href={openInStackBlitzUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[color-mix(in_srgb,var(--kali-panel)_82%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_78%,var(--kali-bg))] shadow-[0_12px_30px_-16px_var(--kali-blue-glow)] transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--kali-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
          >
            Open in StackBlitz
          </a>
          <div
            className="absolute top-4 left-4 flex items-center gap-4 rounded border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-4 shadow-kali-panel"
            style={{ backgroundColor: 'color-mix(in srgb, var(--kali-panel) 88%, transparent)' }}
          >
            <Image
              src="/themes/Yaru/system/view-app-grid-symbolic.svg"
              alt="Open Folder"
              width={64}
              height={64}
            />
            <span className="text-lg">Open Folder</span>
          </div>
        </div>
        <div
          className="flex items-center gap-3 px-3 py-2 border-t border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-[color:var(--color-text)] opacity-80"
        >
          <span className="flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1 text-[12px] uppercase text-[color:var(--color-text)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            MAIN
          </span>
          <span className="flex items-center gap-1 rounded-full border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] px-2 py-1 text-[12px] uppercase text-[color:var(--color-text)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            CHECKS
          </span>
        </div>
      </div>
    </div>
  );
}
