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
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
