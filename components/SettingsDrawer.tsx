import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { getUnlockedThemes } from '../utils/theme';
import { useSettings, ACCENT_OPTIONS } from '../hooks/useSettings';
import useFocusTrap from '../hooks/useFocusTrap';

interface Props {
  highScore?: number;
}

const ACCENT_LABELS: Record<string, string> = {
  '#1793d1': 'Kali blue',
  '#e53e3e': 'Red',
  '#d97706': 'Orange',
  '#38a169': 'Green',
  '#805ad5': 'Purple',
  '#ed64a6': 'Pink',
};

type ThemeItemData = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

type AccentItemData = {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
};

const ITEM_HEIGHT = 40;

const ThemeRow = ({ index, style, data }: ListChildComponentProps<ThemeItemData>) => {
  const value = data.options[index];
  const isSelected = data.selected === value;
  return (
    <button
      type="button"
      onClick={() => data.onSelect(value)}
      role="option"
      aria-selected={isSelected}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
      className={`px-3 text-left ${isSelected ? 'bg-blue-600 text-white' : 'bg-transparent text-current'}`}
    >
      {value}
    </button>
  );
};

const AccentRow = ({ index, style, data }: ListChildComponentProps<AccentItemData>) => {
  const { value, label } = data.options[index];
  const isSelected = data.selected === value;
  return (
    <button
      type="button"
      onClick={() => data.onSelect(value)}
      role="radio"
      aria-checked={isSelected}
      aria-label={label}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        width: '100%',
      }}
      className={`px-3 text-left ${isSelected ? 'bg-blue-600 text-white' : 'bg-transparent text-current'}`}
    >
      <span
        aria-hidden="true"
        style={{
          backgroundColor: value,
          borderRadius: '9999px',
          width: '1.5rem',
          height: '1.5rem',
          border: isSelected ? '2px solid white' : '2px solid transparent',
        }}
      />
      <span>{label}</span>
    </button>
  );
};

const ScrollContainer = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={`border border-gray-700 rounded bg-black/60 backdrop-blur-sm ${className}`.trim()}
    />
  )
);

ScrollContainer.displayName = 'ScrollContainer';

const SettingsDrawer = ({ highScore = 0 }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const unlocked = getUnlockedThemes(highScore);
  const { accent, setAccent, theme, setTheme } = useSettings();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const themeListRef = useRef<HTMLDivElement>(null);
  const accentListRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();
  const themeLabelId = `${drawerId}-theme`;
  const accentLabelId = `${drawerId}-accent`;
  const searchLabelId = `${drawerId}-search-label`;

  useFocusTrap(drawerRef, open);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => {
      if (prev) {
        setSearch('');
      }
      return !prev;
    });
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  const accentOptions = useMemo(
    () =>
      ACCENT_OPTIONS.map((value) => ({
        value,
        label: ACCENT_LABELS[value] ?? value,
      })),
    []
  );

  const searchTerm = search.trim().toLowerCase();

  const filteredThemes = useMemo(
    () =>
      unlocked.filter((themeName) =>
        searchTerm ? themeName.toLowerCase().includes(searchTerm) : true
      ),
    [unlocked, searchTerm]
  );

  const filteredAccents = useMemo(
    () =>
      accentOptions.filter(({ value, label }) => {
        if (!searchTerm) return true;
        return (
          value.toLowerCase().includes(searchTerm) ||
          label.toLowerCase().includes(searchTerm)
        );
      }),
    [accentOptions, searchTerm]
  );

  useEffect(() => {
    if (!open) return;
    if (themeListRef.current) {
      themeListRef.current.setAttribute('role', 'listbox');
      themeListRef.current.setAttribute('aria-labelledby', themeLabelId);
    }
    if (accentListRef.current) {
      accentListRef.current.setAttribute('role', 'radiogroup');
      accentListRef.current.setAttribute('aria-labelledby', accentLabelId);
    }
  }, [open, themeLabelId, accentLabelId, filteredThemes.length, filteredAccents.length]);

  const themeListHeight = Math.min(filteredThemes.length, 6) * ITEM_HEIGHT || ITEM_HEIGHT;
  const accentListHeight = Math.min(filteredAccents.length, 6) * ITEM_HEIGHT || ITEM_HEIGHT;

  return (
    <div>
      <button
        type="button"
        ref={triggerRef}
        aria-label="settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={handleToggle}
      >
        Settings
      </button>
      {open && (
        <div
          id={drawerId}
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${drawerId}-title`}
          className="fixed inset-y-0 right-0 w-80 max-w-full bg-gray-900 text-white shadow-xl p-4 flex flex-col gap-4"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              handleClose();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h2 id={`${drawerId}-title`} className="text-lg font-semibold">
              Settings
            </h2>
            <button type="button" aria-label="Close settings" onClick={handleClose}>
              ×
            </button>
          </div>
          <div>
            <label
              id={searchLabelId}
              htmlFor={`${drawerId}-search`}
              className="block text-sm font-medium"
            >
              Search
            </label>
            <input
              id={`${drawerId}-search`}
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Filter themes or accents"
              aria-labelledby={searchLabelId}
            />
          </div>
          <section>
            <h3 id={themeLabelId} className="text-sm font-semibold uppercase tracking-wide">
              Theme
            </h3>
            {filteredThemes.length === 0 ? (
              <p className="mt-2 text-sm text-gray-300">No themes found.</p>
            ) : (
              <List
                height={themeListHeight}
                itemCount={filteredThemes.length}
                itemSize={ITEM_HEIGHT}
                itemData={{ options: filteredThemes, selected: theme, onSelect: setTheme }}
                width="100%"
                outerElementType={ScrollContainer}
                outerRef={themeListRef}
              >
                {ThemeRow}
              </List>
            )}
          </section>
          <section>
            <h3 id={accentLabelId} className="text-sm font-semibold uppercase tracking-wide">
              Accent
            </h3>
            {filteredAccents.length === 0 ? (
              <p className="mt-2 text-sm text-gray-300">No accent colors found.</p>
            ) : (
              <List
                height={accentListHeight}
                itemCount={filteredAccents.length}
                itemSize={ITEM_HEIGHT}
                itemData={{ options: filteredAccents, selected: accent, onSelect: setAccent }}
                width="100%"
                outerElementType={ScrollContainer}
                outerRef={accentListRef}
              >
                {AccentRow}
              </List>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default SettingsDrawer;
