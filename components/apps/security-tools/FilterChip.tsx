import React from 'react';

interface FilterChipProps {
  label: string;
  value: string;
  selected: boolean;
  onToggle: (value: string) => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, value, selected, onToggle }) => {
  const handleClick = () => onToggle(value);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(value);
    }
  };

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`px-2 py-1 text-[0.65rem] rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-1 focus-visible:ring-offset-black ${
        selected
          ? 'bg-ub-orange text-black border-ub-orange'
          : 'bg-black/40 text-white border-white/10 hover:bg-black/55'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {label}
    </button>
  );
};

export default FilterChip;
