import { ReactNode } from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}

export default function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
        active
          ? 'border-transparent bg-[var(--kali-control)] text-slate-900 shadow-[0_0_18px_rgba(15,148,210,0.35)]'
          : 'border-[color:var(--kali-panel-border)] bg-[var(--kali-panel-highlight)] text-white/80 hover:border-[color:var(--kali-control)] hover:bg-[var(--kali-control-surface)] hover:text-white'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          active
            ? 'border-transparent bg-[color-mix(in_srgb,var(--kali-control)_82%,#000000)] text-slate-900'
            : 'border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] text-white/70'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
