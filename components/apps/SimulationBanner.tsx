import React from 'react';

interface SimulationBannerProps {
  toolName: string;
  message?: string;
  className?: string;
}

const SimulationBanner: React.FC<SimulationBannerProps> = ({
  toolName,
  message = 'Deterministic demo output. No live hosts, credentials, or network calls.',
  className = '',
}) => {
  return (
    <div
      className={`mb-3 flex items-start gap-3 rounded-md border border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-overlay)_12%)] px-3 py-2 text-sm text-[color:var(--color-text)] shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] text-base font-bold text-kali-accent shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_75%,transparent)]"
      >
        SIM
      </span>
      <div className="leading-snug">
        <p className="font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
          {toolName} Simulation
        </p>
        <p className="text-[color:var(--color-text)]">{message}</p>
      </div>
    </div>
  );
};

export default SimulationBanner;
