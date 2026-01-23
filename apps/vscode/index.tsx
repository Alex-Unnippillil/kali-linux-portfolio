'use client';

const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/~/github.com/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md';

const STACKBLITZ_IFRAME_ALLOW =
  'clipboard-read; clipboard-write; fullscreen; geolocation; microphone; camera; display-capture';
const STACKBLITZ_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-presentation';

export default function VsCode() {
  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]">
      <iframe
        src={STACKBLITZ_EMBED_URL}
        title="Visual Studio Code (StackBlitz)"
        className="h-full w-full border-0"
        allow={STACKBLITZ_IFRAME_ALLOW}
        sandbox={STACKBLITZ_IFRAME_SANDBOX}
        allowFullScreen
        loading="lazy"
      />
      <div className="border-t border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-2 text-xs text-[color:var(--kali-text-muted)]">
        <a
          href={STACKBLITZ_EMBED_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-[color:var(--color-accent)] hover:underline"
        >
          Open in StackBlitz
        </a>
      </div>
    </div>
  );
}
