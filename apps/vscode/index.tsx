'use client';

import type { ReactNode } from 'react';

const DEFAULT_FILE = 'README.md';
const STACKBLITZ_BASE_URL =
  'https://stackblitz.com/~/github.com/Alex-Unnippillil/kali-linux-portfolio';

const STACKBLITZ_IFRAME_ALLOW =
  'clipboard-read; clipboard-write; fullscreen; geolocation; microphone; camera; display-capture';
const STACKBLITZ_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation';

const getStackBlitzEmbedUrl = (file: string) =>
  `${STACKBLITZ_BASE_URL}?embed=1&file=${encodeURIComponent(file)}`;

const getStackBlitzExternalUrl = (file: string) =>
  `${STACKBLITZ_BASE_URL}?file=${encodeURIComponent(file)}`;

type VsCodeProps = {
  file?: string;
  headerLeft?: ReactNode;
};

export default function VsCode({ file = DEFAULT_FILE, headerLeft }: VsCodeProps) {
  const embedUrl = getStackBlitzEmbedUrl(file);
  const externalUrl = getStackBlitzExternalUrl(file);

  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-xs">
        <div className="min-w-0">{headerLeft}</div>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold uppercase tracking-wide text-[color:var(--color-accent)] underline decoration-dotted underline-offset-4"
        >
          Open in StackBlitz
        </a>
      </div>
      <iframe
        key={file}
        src={embedUrl}
        title="Visual Studio Code (StackBlitz)"
        className="h-full w-full border-0"
        allow={STACKBLITZ_IFRAME_ALLOW}
        sandbox={STACKBLITZ_IFRAME_SANDBOX}
        allowFullScreen
        loading="lazy"
      />
      <a
        href={embedUrl}
        target="_blank"
        rel="noreferrer"
        className="sr-only"
      >
        Open in StackBlitz
      </a>
    </div>
  );
}
