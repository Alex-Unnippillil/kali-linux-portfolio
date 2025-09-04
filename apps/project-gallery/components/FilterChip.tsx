import { ReactNode } from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  color?: string;
}

export default function FilterChip({ label, active, onClick, icon, color }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 ${
        active ? 'text-white' : 'bg-gray-200 text-black'
      }`}
      style={active ? { backgroundColor: color } : undefined}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
