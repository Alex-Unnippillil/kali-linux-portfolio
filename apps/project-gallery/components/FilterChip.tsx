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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        active
          ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          active
            ? 'border-white/30 bg-white/20 text-white'
            : 'border-gray-200 bg-gray-100 text-gray-500'
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
