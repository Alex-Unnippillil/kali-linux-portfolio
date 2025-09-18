import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react';

export interface TabBarItem {
  id: string | number;
  label: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  closable?: boolean;
  closeLabel?: string;
  title?: string;
}

export interface TabBarProps {
  tabs: TabBarItem[];
  activeId: string | number;
  onSelect: (id: string | number) => void;
  onClose?: (id: string | number) => void;
  onReorder?: (sourceId: string | number, targetId: string | number) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  tabClassName?: string;
  focusable?: boolean;
  ariaLabel?: string;
  keyboardNavigation?: boolean;
}

const TabBar = forwardRef<HTMLDivElement, TabBarProps>(function TabBar(
  {
    tabs,
    activeId,
    onSelect,
    onClose,
    onReorder,
    onKeyDown,
    className = '',
    tabClassName = '',
    focusable = true,
    ariaLabel,
    keyboardNavigation = true,
  },
  forwardedRef,
) {
  const dragSource = useRef<string | number | null>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const assignRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const registerTabRef = useCallback((id: string | number) => {
    const key = String(id);
    return (node: HTMLDivElement | null) => {
      if (node) {
        tabRefs.current.set(key, node);
      } else {
        tabRefs.current.delete(key);
      }
    };
  }, []);

  const scrollToTab = useCallback((id: string | number) => {
    const node = tabRefs.current.get(String(id));
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, []);

  useEffect(() => {
    scrollToTab(activeId);
  }, [activeId, scrollToTab]);

  const handleDragStart = useCallback(
    (id: string | number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!onReorder) return;
      dragSource.current = id;
      event.dataTransfer.effectAllowed = 'move';
    },
    [onReorder],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onReorder) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [onReorder],
  );

  const handleDrop = useCallback(
    (targetId: string | number) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!onReorder) return;
      event.preventDefault();
      const sourceId = dragSource.current;
      dragSource.current = null;
      if (sourceId == null || sourceId === targetId) return;
      onReorder(sourceId, targetId);
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(() => {
    dragSource.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (!keyboardNavigation || event.defaultPrevented) return;
      if (tabs.length === 0) return;

      const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
      if (currentIndex === -1) return;

      const selectByIndex = (index: number) => {
        const tab = tabs[index];
        if (!tab) return;
        onSelect(tab.id);
        scrollToTab(tab.id);
      };

      if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') {
        event.preventDefault();
        const delta = event.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
        selectByIndex(nextIndex);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        selectByIndex(nextIndex);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        selectByIndex(nextIndex);
      }
    },
    [activeId, keyboardNavigation, onKeyDown, onSelect, scrollToTab, tabs],
  );

  return (
    <div
      ref={assignRef}
      className={`flex items-stretch gap-[1px] bg-gray-800 text-sm text-gray-200 overflow-x-auto select-none ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      tabIndex={focusable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const baseClasses = [
          'flex items-center gap-2 px-3 py-1 min-w-0 cursor-pointer transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-400',
          isActive
            ? 'bg-gray-700 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white',
          tabClassName,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            key={tab.id}
            ref={registerTabRef(tab.id)}
            role="tab"
            aria-selected={isActive}
            tabIndex={-1}
            className={baseClasses}
            title={tab.title ?? (typeof tab.label === 'string' ? tab.label : undefined)}
            draggable={Boolean(onReorder)}
            onClick={() => onSelect(tab.id)}
            onDragStart={handleDragStart(tab.id)}
            onDragOver={handleDragOver}
            onDrop={handleDrop(tab.id)}
            onDragEnd={handleDragEnd}
          >
            {tab.icon ? <span className="flex-shrink-0">{tab.icon}</span> : null}
            <span className="truncate">{tab.label}</span>
            {tab.meta ? <span className="flex-shrink-0">{tab.meta}</span> : null}
            {onClose && tab.closable !== false && (
              <button
                type="button"
                className="ml-1 flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.id);
                }}
                aria-label={tab.closeLabel ?? 'Close tab'}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});

TabBar.displayName = 'TabBar';

export default TabBar;
