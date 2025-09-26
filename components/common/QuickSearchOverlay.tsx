'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  QuickSearchAppItem,
  QuickSearchFileItem,
  QuickSearchIndex,
  QuickSearchItem,
  QuickSearchSection,
  QuickSearchSettingItem,
  filterQuickSearchIndex,
  getQuickSearchIndex,
  getSectionTitles,
  warmQuickSearchIndex,
} from '../../lib/quickSearch';

const SECTION_LABELS = getSectionTitles();

type HandlerMap = {
  app: (item: QuickSearchAppItem) => void;
  file: (item: QuickSearchFileItem) => void;
  setting: (item: QuickSearchSettingItem) => void;
};

type QuickSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  openApp: (id: string) => void;
  openFile?: (item: QuickSearchFileItem) => void;
  openSetting?: (item: QuickSearchSettingItem) => void;
  index?: QuickSearchIndex;
};

type FlattenedItem = {
  item: QuickSearchItem;
  section: QuickSearchSection;
  index: number;
};

const defaultFileHandler = (item: QuickSearchFileItem) => {
  if (typeof window === 'undefined') return;
  window.open(item.path, '_blank', 'noopener,noreferrer');
};

const defaultSettingHandler = (openApp: (id: string) => void) =>
  (_item: QuickSearchSettingItem) => {
    openApp('settings');
  };

const baseContainerClasses =
  'bg-[#222831] text-white shadow-xl border border-white/10 rounded-xl w-full max-w-xl';

const listItemClasses = (
  active: boolean,
) =>
  `w-full text-left px-3 py-2 rounded-lg transition-colors ${
    active ? 'bg-ub-orange text-black' : 'hover:bg-white/10'
  }`;

const sectionWrapperClasses = 'space-y-2';

const QuickSearchOverlay = ({
  open,
  onClose,
  openApp,
  openFile,
  openSetting,
  index: providedIndex,
}: QuickSearchOverlayProps) => {
  const [index, setIndex] = useState<QuickSearchIndex | null>(providedIndex ?? null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    warmQuickSearchIndex();
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    if (!providedIndex) {
      setIndex(getQuickSearchIndex());
    } else {
      setIndex(providedIndex);
    }
  }, [open, providedIndex]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sections = useMemo(() => {
    if (!index) return [] as QuickSearchSection[];
    return filterQuickSearchIndex(index, query);
  }, [index, query]);

  const { flatItems, idToPosition } = useMemo(() => {
    const items: FlattenedItem[] = [];
    const map = new Map<string, number>();
    let runningIndex = 0;
    sections.forEach((section) => {
      section.items.forEach((item) => {
        items.push({ item, section, index: runningIndex });
        map.set(item.id, runningIndex);
        runningIndex += 1;
      });
    });
    return { flatItems: items, idToPosition: map };
  }, [sections]);

  useEffect(() => {
    if (!flatItems.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(0);
  }, [flatItems.length]);

  const handlers: HandlerMap = useMemo(
    () => ({
      app: (item) => openApp(item.appId),
      file: openFile ?? defaultFileHandler,
      setting: openSetting ?? defaultSettingHandler(openApp),
    }),
    [openApp, openFile, openSetting],
  );

  const selectItem = (item: QuickSearchItem) => {
    switch (item.type) {
      case 'app':
        handlers.app(item);
        break;
      case 'file':
        handlers.file(item);
        break;
      case 'setting':
        handlers.setting(item);
        break;
      default:
        break;
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((prev) => (prev + 1) % flatItems.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) {
        selectItem(flatItems[activeIndex].item);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const scrollActiveItemIntoView = (position: number) => {
    const node = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-quick-item="${position}"]`,
    );
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  };

  useEffect(() => {
    if (activeIndex >= 0) {
      scrollActiveItemIntoView(activeIndex);
    }
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-28"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        className={`${baseContainerClasses} mx-4`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search apps, files, and settings"
            aria-label="Quick search input"
            className="w-full rounded-lg bg-black/20 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ub-orange"
          />
          <p className="mt-2 text-xs text-white/60">
            Use ↑ ↓ to navigate, Enter to open, Esc to close
          </p>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-4 space-y-6" role="listbox">
          {sections.length === 0 && (
            <div className="text-sm text-white/60" role="status">
              No matching results
            </div>
          )}
          {sections.map((section) => (
            <div key={section.type} className={sectionWrapperClasses}>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                {SECTION_LABELS[section.type]}
              </p>
              <ul className="space-y-1" role="none">
                {section.items.map((item) => {
                  const itemIndex = idToPosition.get(item.id) ?? -1;
                  const isActive = itemIndex === activeIndex;
                  return (
                    <li key={item.id} role="none">
                      <button
                        type="button"
                        data-quick-item={itemIndex}
                        role="option"
                        aria-selected={isActive}
                        className={listItemClasses(isActive)}
                        onMouseEnter={() => itemIndex >= 0 && setActiveIndex(itemIndex)}
                        onClick={() => selectItem(item)}
                      >
                        <span className="block text-sm font-medium">{item.title}</span>
                        {item.description && (
                          <span className="mt-1 block text-xs text-white/70">
                            {item.description}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickSearchOverlay;

