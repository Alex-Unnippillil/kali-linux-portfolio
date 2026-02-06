import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import presetsData from '../filters/presets.json';
import presets, { FilterPreset } from '../../../filters/presets';

interface FilterBuilderProps {
  value: string;
  onChange: (value: string) => void;
  onApply?: (value: string) => void;
}

type SuggestionSource = 'recent' | 'preset' | 'field';

interface SuggestionItem {
  id: string;
  label: string;
  value: string;
  description?: string;
  source: SuggestionSource;
}

const commonFields: SuggestionItem[] = [
  {
    id: 'field-ip.addr',
    label: 'ip.addr',
    value: 'ip.addr == ',
    description: 'Match packets by either source or destination IP address.',
    source: 'field',
  },
  {
    id: 'field-ip.src',
    label: 'ip.src',
    value: 'ip.src == ',
    description: 'Filter packets originating from a specific IP.',
    source: 'field',
  },
  {
    id: 'field-ip.dst',
    label: 'ip.dst',
    value: 'ip.dst == ',
    description: 'Filter packets destined to a specific IP.',
    source: 'field',
  },
  {
    id: 'field-tcp.port',
    label: 'tcp.port',
    value: 'tcp.port == ',
    description: 'Match packets communicating over a TCP port.',
    source: 'field',
  },
  {
    id: 'field-udp.port',
    label: 'udp.port',
    value: 'udp.port == ',
    description: 'Match packets communicating over a UDP port.',
    source: 'field',
  },
  {
    id: 'field-protocols',
    label: 'protocol',
    value: 'protocol == ',
    description: 'Quickly focus packets by decoded protocol name.',
    source: 'field',
  },
  {
    id: 'field-frame.len',
    label: 'frame.len',
    value: 'frame.len >= ',
    description: 'Filter packets by captured frame length.',
    source: 'field',
  },
];

const debounceDelay = 150;

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  value,
  onChange,
  onApply,
}) => {
  const [recent, setRecent] = usePersistentState<string[]>(
    'wireshark:recent-filters',
    []
  );
  const [customPresets, setCustomPresets] = usePersistentState<FilterPreset[]>(
    'wireshark:custom-presets',
    []
  );
  const [inputValue, setInputValue] = useState(value);
  const [debouncedTerm, setDebouncedTerm] = useState(value.toLowerCase());
  const [highlighted, setHighlighted] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mergedPresets = useMemo(
    () => [...customPresets, ...presets, ...presetsData],
    [customPresets]
  );

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedTerm(inputValue.trim().toLowerCase());
    }, debounceDelay);
    return () => window.clearTimeout(handle);
  }, [inputValue]);

  const suggestionPool = useMemo(() => {
    const recentSuggestions: SuggestionItem[] = recent.map((expression, index) => ({
      id: `recent-${index}-${expression}`,
      label: expression,
      value: expression,
      source: 'recent',
    }));

    const presetSuggestions: SuggestionItem[] = mergedPresets.map((preset) => ({
      id: `preset-${preset.label}`,
      label: preset.label,
      value: preset.expression,
      description: preset.docUrl,
      source: 'preset',
    }));

    const unique = new Map<string, SuggestionItem>();
    [...commonFields, ...presetSuggestions, ...recentSuggestions].forEach(
      (item) => {
        if (!unique.has(item.value)) {
          unique.set(item.value, item);
        }
      }
    );
    return Array.from(unique.values());
  }, [mergedPresets, recent]);

  const filteredSuggestions = useMemo(() => {
    if (!debouncedTerm) {
      return suggestionPool.slice(0, 8);
    }
    return suggestionPool.filter((item) => {
      const haystack = `${item.label} ${item.value} ${item.description || ''}`.toLowerCase();
      return haystack.includes(debouncedTerm);
    });
  }, [debouncedTerm, suggestionPool]);

  useEffect(() => {
    setHighlighted(0);
  }, [debouncedTerm, suggestionPool]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setListOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const commitFilter = useCallback(
    (expression: string) => {
      const trimmed = expression.trim();
      if (!trimmed) return;
      setInputValue(trimmed);
      onChange(trimmed);
      onApply?.(trimmed);
      setRecent((prev) => [
        trimmed,
        ...prev.filter((f) => f !== trimmed),
      ].slice(0, 5));
      setListOpen(false);
    },
    [onApply, onChange, setRecent]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setInputValue(nextValue);
      onChange(nextValue);
      setListOpen(true);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!listOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        setListOpen(true);
      }
      if (!filteredSuggestions.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((idx) => (idx + 1) % filteredSuggestions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((idx) =>
          idx === 0 ? filteredSuggestions.length - 1 : idx - 1
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const selected = filteredSuggestions[highlighted];
        if (selected) {
          if (selected.source === 'field') {
            const template = selected.value;
            setInputValue(template);
            onChange(template);
            setListOpen(false);
          } else {
            commitFilter(selected.value);
          }
        } else {
          commitFilter(inputValue);
        }
      }
    },
    [
      commitFilter,
      filteredSuggestions,
      highlighted,
      inputValue,
      listOpen,
      onChange,
    ]
  );

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const trimmed = event.target.value.trim();
      if (trimmed) {
        setRecent((prev) => [
          trimmed,
          ...prev.filter((f) => f !== trimmed),
        ].slice(0, 5));
      }
    },
    [setRecent]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: SuggestionItem) => {
      if (suggestion.source === 'field') {
        setInputValue(suggestion.value);
        onChange(suggestion.value);
        setListOpen(false);
      } else {
        commitFilter(suggestion.value);
      }
    },
    [commitFilter, onChange]
  );

  const handlePresetSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const expression = event.target.value;
      if (!expression) return;
      setInputValue(expression);
      commitFilter(expression);
      event.target.value = '';
    },
    [commitFilter]
  );

  const handleSavePreset = useCallback(() => {
    const expression = inputValue.trim();
    if (!expression) return;
    const label = window.prompt('Preset name');
    if (!label) return;
    setCustomPresets((prev) => [
      ...prev.filter((p) => p.label !== label),
      { label, expression, docUrl: '' },
    ]);
  }, [inputValue, setCustomPresets]);

  const handleShare = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (inputValue) url.searchParams.set('filter', inputValue);
    else url.searchParams.delete('filter');
    window.navigator.clipboard?.writeText(url.toString());
  }, [inputValue]);

  return (
    <div
      ref={containerRef}
      data-testid="filter-builder"
      className="flex items-center space-x-2 relative"
    >
      <select
        onChange={handlePresetSelect}
        defaultValue=""
        aria-label="Preset filters"
        className="px-2 py-1 bg-gray-800 rounded text-white text-sm"
      >
        <option value="">Preset filters...</option>
        {mergedPresets.map(({ label, expression }) => (
          <option key={label} value={expression}>
            {label}
          </option>
        ))}
      </select>
      <div className="flex flex-col relative">
        <input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Quick search (e.g. tcp)"
          aria-label="Quick search"
          className="px-2 py-1 bg-gray-800 rounded text-white text-sm"
          onFocus={() => setListOpen(true)}
        />
        {listOpen && filteredSuggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-10 max-h-48 overflow-auto w-72"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={index === highlighted}
                className={`px-3 py-2 cursor-pointer text-xs ${
                  index === highlighted ? 'bg-gray-700' : ''
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionClick(suggestion)}
                data-testid={`suggestion-${suggestion.id}`}
              >
                <div className="font-mono text-amber-200">{suggestion.value}</div>
                {suggestion.description && (
                  <div className="text-[10px] text-gray-300">{suggestion.description}</div>
                )}
                <div className="uppercase tracking-wide text-[9px] text-gray-400">
                  {suggestion.source}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={handleSavePreset}
        aria-label="Save filter preset"
        className="px-2 py-1 bg-gray-700 rounded text-white text-xs"
        type="button"
      >
        Save
      </button>
      <button
        onClick={handleShare}
        aria-label="Share filter preset"
        className="px-2 py-1 bg-gray-700 rounded text-white text-xs"
        type="button"
      >
        Share
      </button>
    </div>
  );
};

export default React.memo(FilterBuilder);
