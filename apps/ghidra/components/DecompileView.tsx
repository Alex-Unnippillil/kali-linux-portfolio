'use client';

import React, { useEffect, useMemo, useState } from 'react';

type SymbolEntry = {
  id: string;
  name: string;
  code: string[];
};

type SearchResult = {
  symbolId: string;
  lineIndex: number;
  start: number;
  length: number;
};

const initialSymbols: SymbolEntry[] = [
  {
    id: 'start',
    name: 'start',
    code: ['start:', '  mov eax, 1', '  call check', '  ret'],
  },
  {
    id: 'check',
    name: 'check',
    code: ['check:', '  cmp eax, 2', '  jne end', '  call helper', '  ret'],
  },
  {
    id: 'helper',
    name: 'helper',
    code: ['helper:', '  ret'],
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DecompileView: React.FC = () => {
  const [symbols, setSymbols] = useState<SymbolEntry[]>(initialSymbols);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(
    initialSymbols[0]?.id ?? ''
  );
  const [renameDraft, setRenameDraft] = useState(initialSymbols[0]?.name ?? '');
  const [searchTerm, setSearchTerm] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const selectedSymbol = symbols.find((sym) => sym.id === selectedSymbolId);

  useEffect(() => {
    setRenameDraft(selectedSymbol?.name ?? '');
  }, [selectedSymbol?.name]);

  const searchResults: SearchResult[] = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }
    const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
    const results: SearchResult[] = [];
    symbols.forEach((symbol) => {
      symbol.code.forEach((line, index) => {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(line)) !== null) {
          results.push({
            symbolId: symbol.id,
            lineIndex: index,
            start: match.index,
            length: match[0].length,
          });
          if (match.index === regex.lastIndex) {
            regex.lastIndex += 1;
          }
        }
      });
    });
    return results;
  }, [symbols, searchTerm]);

  useEffect(() => {
    if (matchIndex >= searchResults.length) {
      setMatchIndex(searchResults.length ? searchResults.length - 1 : 0);
    }
  }, [matchIndex, searchResults.length]);

  useEffect(() => {
    setMatchIndex(0);
  }, [searchTerm, selectedSymbolId]);

  const matchLookup = useMemo(() => {
    const map = new Map<string, number[]>();
    searchResults.forEach((result, index) => {
      const key = `${result.symbolId}:${result.lineIndex}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(index);
      } else {
        map.set(key, [index]);
      }
    });
    return map;
  }, [searchResults]);

  const handleRename = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSymbol) return;
    const draft = renameDraft.trim();
    if (!draft || draft === selectedSymbol.name) return;

    const oldName = selectedSymbol.name;

    setSymbols((prev) =>
      prev.map((symbol) => {
        const regex = new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'g');
        const updatedCode = symbol.code.map((line) =>
          line.replace(regex, draft)
        );
        if (symbol.id === selectedSymbol.id) {
          return { ...symbol, name: draft, code: updatedCode };
        }
        return { ...symbol, code: updatedCode };
      })
    );
  };

  const goToNextMatch = () => {
    if (!searchResults.length) return;
    setMatchIndex((current) => (current + 1) % searchResults.length);
  };

  const goToPreviousMatch = () => {
    if (!searchResults.length) return;
    setMatchIndex((current) =>
      (current - 1 + searchResults.length) % searchResults.length
    );
  };

  const renderLine = (symbolId: string, line: string, lineIndex: number) => {
    if (!searchResults.length) {
      return line;
    }
    const lookupKey = `${symbolId}:${lineIndex}`;
    const indices = matchLookup.get(lookupKey);
    if (!indices || !indices.length) {
      return line;
    }

    let cursor = 0;
    const nodes: React.ReactNode[] = [];
    indices.forEach((resultIndex) => {
      const result = searchResults[resultIndex];
      if (result.start > cursor) {
        nodes.push(line.slice(cursor, result.start));
      }
      const end = result.start + result.length;
      const matchText = line.slice(result.start, end);
      const isActive = resultIndex === matchIndex;
      nodes.push(
        <mark
          key={`${lookupKey}-${resultIndex}`}
          data-testid="search-highlight"
          data-current={isActive ? 'true' : 'false'}
          className={
            isActive
              ? 'bg-yellow-300 text-black rounded px-0.5'
              : 'bg-yellow-700 text-black rounded px-0.5'
          }
        >
          {matchText}
        </mark>
      );
      cursor = end;
    });
    if (cursor < line.length) {
      nodes.push(line.slice(cursor));
    }
    return nodes;
  };

  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr] text-sm bg-gray-900 text-gray-100 p-4 rounded-lg border border-gray-700">
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-300">
          Symbols
        </h2>
        <ul className="space-y-1">
          {symbols.map((symbol) => (
            <li key={symbol.id}>
              <button
                type="button"
                onClick={() => setSelectedSymbolId(symbol.id)}
                className={`w-full text-left px-2 py-1 rounded transition-colors ${
                  symbol.id === selectedSymbolId
                    ? 'bg-yellow-600 text-black'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                aria-current={symbol.id === selectedSymbolId}
              >
                {symbol.name}
              </button>
            </li>
          ))}
        </ul>
        {selectedSymbol && (
          <form className="space-y-2" onSubmit={handleRename}>
            <label className="block text-xs uppercase tracking-wide" htmlFor="rename-symbol">
              Rename symbol
            </label>
            <input
              id="rename-symbol"
              className="w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
              value={renameDraft}
              onChange={(event) => setRenameDraft(event.target.value)}
              placeholder="New symbol name"
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 text-black font-semibold py-1 rounded disabled:opacity-50"
              disabled={!renameDraft.trim() || renameDraft.trim() === selectedSymbol.name}
            >
              Apply rename
            </button>
          </form>
        )}
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <label className="flex-1" htmlFor="decompile-search">
            <span className="block text-xs uppercase tracking-wide text-gray-300">
              Search decompiled code
            </span>
            <input
              id="decompile-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search decompiled code"
              className="mt-1 w-full rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
            />
          </label>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={goToPreviousMatch}
              disabled={!searchResults.length}
              className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            >
              Previous match
            </button>
            <button
              type="button"
              onClick={goToNextMatch}
              disabled={!searchResults.length}
              className="px-2 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            >
              Next match
            </button>
            <span aria-live="polite" className="text-gray-400">
              {searchResults.length
                ? `Match ${matchIndex + 1} of ${searchResults.length}`
                : 'No matches'}
            </span>
          </div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
          <pre
            aria-label="Decompiled output"
            className="p-4 whitespace-pre-wrap leading-relaxed font-mono text-xs"
          >
            {symbols.map((symbol) => (
              <div key={symbol.id} className="mb-3 last:mb-0">
                {symbol.code.map((line, index) => (
                  <div key={`${symbol.id}-${index}`}>
                    {renderLine(symbol.id, line, index)}
                  </div>
                ))}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DecompileView;
