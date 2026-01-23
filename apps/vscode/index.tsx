'use client';

export const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/~/github.com/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md';
const STACKBLITZ_EXTERNAL_URL =
  'https://stackblitz.com/~/github.com/Alex-Unnippillil/kali-linux-portfolio?file=README.md';

const STACKBLITZ_IFRAME_ALLOW =
  'clipboard-read; clipboard-write; fullscreen; geolocation; microphone; camera; display-capture';
const STACKBLITZ_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation';

export default function VsCode() {
  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]">
      <div className="flex items-center justify-end border-b border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-xs">
        <a
          href={STACKBLITZ_EXTERNAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold uppercase tracking-wide text-[color:var(--color-accent)] underline decoration-dotted underline-offset-4"
        >
          Open in StackBlitz
        </a>
      </div>
      <iframe
        src={STACKBLITZ_EMBED_URL}
        title="Visual Studio Code (StackBlitz)"
        className="h-full w-full border-0"
        allow={STACKBLITZ_IFRAME_ALLOW}
        sandbox={STACKBLITZ_IFRAME_SANDBOX}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
