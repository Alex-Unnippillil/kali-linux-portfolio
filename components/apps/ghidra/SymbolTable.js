import React, { useMemo, useState } from 'react';

export default function SymbolTable({
  symbols = [],
  selectedSymbol,
  onSelectSymbol,
  onNavigateFunction,
}) {
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return symbols;
    return symbols.filter((sym) => {
      return (
        sym.name.toLowerCase().includes(term) ||
        (sym.type || '').toLowerCase().includes(term) ||
        (sym.section || '').toLowerCase().includes(term)
      );
    });
  }, [filter, symbols]);

  const handleSelect = (sym) => {
    if (onSelectSymbol) {
      onSelectSymbol(sym.name);
    }
    if (sym.type === 'FUNCTION' && onNavigateFunction) {
      onNavigateFunction(sym.name);
    }
  };

  return (
    <div className="h-full w-full flex flex-col text-xs md:text-sm" aria-label="Symbol table">
      <label htmlFor="symbol-filter" className="sr-only">
        Filter symbols
      </label>
      <input
        id="symbol-filter"
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter symbols"
        aria-label="Filter symbols"
        className="mb-2 p-1 rounded text-black"
      />
      <div className="flex-1 overflow-auto border border-gray-700" role="list">
        {filtered.length === 0 ? (
          <p className="p-2 text-gray-300" role="listitem">
            No symbols match the current filter.
          </p>
        ) : (
          <ul className="divide-y divide-gray-800" aria-label="Symbol entries">
            {filtered.map((sym) => {
              const isSelected = selectedSymbol === sym.name;
              return (
                <li key={`${sym.name}-${sym.address}`} role="listitem">
                  <button
                    type="button"
                    onClick={() => handleSelect(sym)}
                    className={`w-full text-left px-2 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                      isSelected ? 'bg-gray-800' : 'hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-100">{sym.name}</span>
                      <span className="uppercase text-[0.65rem] text-gray-300">
                        {sym.type || 'symbol'}
                      </span>
                    </div>
                    <div className="text-[0.65rem] text-gray-400">
                      {sym.address}{' '}
                      {sym.section ? `• ${sym.section}` : ''}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
