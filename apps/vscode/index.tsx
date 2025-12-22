'use client';

const STACKBLITZ_EMBED_URL =
  'https://stackblitz.com/~/github.com/Alex-Unnippillil/kali-linux-portfolio?embed=1&file=README.md&hidedevtools=1&terminalHeight=0&ctl=1';

export default function VsCode() {
  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)]">
      <iframe
        src={STACKBLITZ_EMBED_URL}
        title="StackBlitz - kali-linux-portfolio"
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write; fullscreen; geolocation; microphone; camera; display-capture; accelerometer; gyroscope"
        allowFullScreen
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
}
