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
  const [applied, setApplied] = usePersistentState<Record<string, boolean>>(
    'wireshark:applied-presets',
    {}
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

  const handlePresetClick = (expression: string) => {
    onChange(expression);
    setRecent((prev) => [expression, ...prev.filter((f) => f !== expression)].slice(0, 5));
    setApplied((prev) => ({ ...prev, [expression]: true }));
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {presets.map(({ label, expression, docUrl }) => (
          <div key={expression} className="flex items-center gap-1">
            <button
              onClick={() => handlePresetClick(expression)}
              className="px-2 py-1 bg-gray-800 rounded text-white text-xs"
              aria-label={`Apply ${label} filter`}
            >
              {label}
              {applied[expression] ? ' ✓' : ''}
            </button>
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline text-xs"
            >
              docs
            </a>
          </div>
        ))}
      </div>
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

