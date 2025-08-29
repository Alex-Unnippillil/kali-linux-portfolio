import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import presets from '../../../filters/presets';

interface FilterHelperProps {
  value: string;
  onChange: (value: string) => void;
}

const FilterHelper: React.FC<FilterHelperProps> = ({ value, onChange }) => {
  const [recent, setRecent] = usePersistentState<string[]>(
    'wireshark:recent-filters',
    []
  );

  const suggestions = Array.from(
    new Set([...recent, ...presets.map((p) => p.expression)])
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (!val) return;
    setRecent((prev) => [val, ...prev.filter((f) => f !== val)].slice(0, 5));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (val) {
        setRecent((prev) => [val, ...prev.filter((f) => f !== val)].slice(0, 5));
      }
    }
  };

  const handlePresetSelect = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const val = e.target.value;
    if (!val) return;
    onChange(val);
    setRecent((prev) => [val, ...prev.filter((f) => f !== val)].slice(0, 5));
    e.target.selectedIndex = 0;
  };

  return (
    <>
      <select
        onChange={handlePresetSelect}
        defaultValue=""
        aria-label="Preset filters"
        className="px-2 py-1 bg-gray-800 rounded text-white"
      >
        <option value="">Preset filters...</option>
        {presets.map(({ label, expression }) => (
          <option key={expression} value={expression}>
            {label}
          </option>
        ))}
      </select>
      <input
        list="display-filter-suggestions"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Quick search (e.g. tcp)"
        aria-label="Quick search"
        className="px-2 py-1 bg-gray-800 rounded text-white"
      />
      <datalist id="display-filter-suggestions">
        {suggestions.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  );
};

export default FilterHelper;

