import { type ReactNode } from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}

export default function FilterChip({ label, active, onClick, icon }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
