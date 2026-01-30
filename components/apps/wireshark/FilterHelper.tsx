import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import presets, { FilterPreset } from '../../../filters/presets';

interface FilterHelperProps {
  value: string;
  onChange: (value: string) => void;
}

const FilterHelper: React.FC<FilterHelperProps> = ({ value, onChange }) => {
  const [recent, setRecent] = usePersistentState<string[]>(
    'wireshark:recent-filters',
    []
  );
  const [customPresets, setCustomPresets] = usePersistentState<FilterPreset[]>(
    'wireshark:custom-presets',
    []
  );

  const allPresets = [...customPresets, ...presets];

  const suggestions = Array.from(
    new Set([
      ...recent,
      ...allPresets.map((p) => p.expression),
    ])
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

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const expression = e.target.value;
    if (!expression) return;
    onChange(expression);
    setRecent((prev) => [expression, ...prev.filter((f) => f !== expression)].slice(0, 5));
  };

  const handleSavePreset = () => {
    const expression = value.trim();
    if (!expression) return;
    const label = prompt('Preset name');
    if (!label) return;
    setCustomPresets((prev) => [
      ...prev.filter((p) => p.label !== label),
      { label, expression, docUrl: '' },
    ]);
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('filter', value);
    else url.searchParams.delete('filter');
    navigator.clipboard?.writeText(url.toString());
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
        {allPresets.map(({ label, expression }) => (
          <option key={label} value={expression}>
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
      <button
        onClick={handleSavePreset}
        aria-label="Save filter preset"
        className="px-2 py-1 bg-gray-700 rounded text-white"
        type="button"
      >
        Save
      </button>
      <button
        onClick={handleShare}
        aria-label="Share filter preset"
        className="px-2 py-1 bg-gray-700 rounded text-white"
        type="button"
      >
        Share
      </button>
      <datalist id="display-filter-suggestions">
        {suggestions.map((f) => (
          <option key={f} value={f} label={f}>
            {f}
          </option>
        ))}
      </datalist>
    </>
  );
};

export default FilterHelper;
