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
          ? 'border-kali-control bg-kali-control text-slate-900 shadow-[0_0_18px_rgba(15,148,210,0.35)]'
          : 'border-white/15 bg-white/5 text-white/80 hover:border-kali-control hover:bg-white/10 hover:text-white'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          active
            ? 'border-black/10 bg-black/10 text-slate-900'
            : 'border-white/15 bg-white/10 text-white/70'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
