import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const WindowSwitcher = ({ windows = [], onSelect, onClose }, ref) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(
    () =>
      windows.filter((w) =>
        w.title.toLowerCase().includes(query.toLowerCase())
      ),
    [windows, query]
  );
  const filteredLength = filtered.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!filteredLength && selected !== 0) {
      setSelected(0);
      return;
    }

    if (filteredLength && selected >= filteredLength) {
      setSelected(filteredLength - 1);
    }
  }, [filteredLength, selected]);

  const cycleSelection = useCallback(
    (delta) => {
      if (!filteredLength) return;
      setSelected((prev) => {
        const next = (prev + delta + filteredLength) % filteredLength;
        return next;
      });
    },
    [filteredLength]
  );

  const confirmSelection = useCallback(() => {
    if (filteredLength && typeof onSelect === 'function') {
      const index = Math.min(selected, filteredLength - 1);
      const win = filtered[index];
      if (win) {
        onSelect(win.id);
        return win;
      }
    }
    if (typeof onClose === 'function') {
      onClose();
    }
    return null;
  }, [filtered, filteredLength, selected, onSelect, onClose]);

  const resetSelection = useCallback(() => {
    setSelected(0);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      confirmSelection,
      resetSelection,
      stepSelection: cycleSelection,
    }),
    [confirmSelection, cycleSelection, resetSelection]
  );

  const handleKeyDown = (e) => {
    const stopEvent = () => {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    };

    if (e.key === 'Tab') {
      stopEvent();
      cycleSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowRight') {
      stopEvent();
      cycleSelection(1);
    } else if (e.key === 'ArrowLeft') {
      stopEvent();
      cycleSelection(-1);
    } else if (e.key === 'ArrowDown') {
      stopEvent();
      cycleSelection(1);
    } else if (e.key === 'ArrowUp') {
      stopEvent();
      cycleSelection(-1);
    } else if (e.key === 'Enter') {
      stopEvent();
      confirmSelection();
    } else if (e.key === 'Escape') {
      stopEvent();
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  const handlePointer = (index) => {
    if (index === selected) return;
    setSelected(index);
  };

  const handleClick = (win) => {
    if (typeof onSelect === 'function') {
      onSelect(win.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white">
      <div className="w-11/12 max-w-4xl rounded-xl bg-ub-grey bg-opacity-95 p-6 shadow-2xl backdrop-blur">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-3 py-2 rounded-md bg-black/30 focus:outline-none focus:ring-2 focus:ring-ub-orange"
          placeholder="Search windows"
        />
        <div className="flex items-stretch space-x-4 overflow-x-auto pb-1">
          {filteredLength ? (
            filtered.map((w, i) => (
              <button
                key={w.id}
                type="button"
                onMouseEnter={() => handlePointer(i)}
                onFocus={() => handlePointer(i)}
                onClick={() => handleClick(w)}
                className={`flex min-w-[8rem] max-w-[10rem] flex-col items-center gap-2 rounded-lg border border-transparent px-4 py-3 transition-all duration-150 focus:outline-none ${
                  i === selected
                    ? 'bg-ub-orange text-black shadow-lg'
                    : 'bg-black/40 text-white hover:bg-black/50'
                }`}
                aria-selected={i === selected}
              >
                <div className={`flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-black/30 ${
                  i === selected ? 'bg-black/20' : ''
                }`}>
                  {w.icon ? (
                    <img
                      src={w.icon}
                      alt=""
                      className="h-12 w-12 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-sm text-ub-grey-light">{w.title[0]}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-center leading-tight">
                  {w.title}
                </span>
              </button>
            ))
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-lg bg-black/30 text-sm text-ub-grey-light">
              No matching windows
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default forwardRef(WindowSwitcher);

