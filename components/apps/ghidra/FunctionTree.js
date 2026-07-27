import React from 'react';

function FunctionNode({
  func,
  funcMap,
  onSelect,
  selected,
  onTogglePin,
  pinned,
}) {
  const isPinned = pinned.has(func.name);

  return (
    <li>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSelect(func.name)}
          className={`flex-1 text-left ${selected === func.name ? 'font-bold' : ''}`}
        >
          {func.name}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(func.name);
          }}
          aria-pressed={isPinned}
          aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${func.name}`}
          className="text-xs"
        >
          {isPinned ? '★' : '☆'}
        </button>
      </div>
      {func.calls && func.calls.length > 0 && (
        <ul className="ml-4">
          {func.calls.map((c) =>
            funcMap[c] ? (
              <FunctionNode
                key={c}
                func={funcMap[c]}
                funcMap={funcMap}
                onSelect={onSelect}
                selected={selected}
                onTogglePin={onTogglePin}
                pinned={pinned}
              />
            ) : (
              <li key={c}>{c}</li>
            )
          )}
        </ul>
      )}
    </li>
  );
}

export default function FunctionTree({
  functions,
  onSelect,
  selected,
  pinned = [],
  onTogglePin = () => {},
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchTerm), 150);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const deferredQuery = React.useDeferredValue(debouncedQuery);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const funcMap = React.useMemo(() => {
    const map = {};
    functions.forEach((f) => {
      map[f.name] = f;
    });
    return map;
  }, [functions]);

  const pinnedSet = React.useMemo(() => new Set(pinned), [pinned]);

  const favorites = React.useMemo(
    () => pinned.filter((name) => funcMap[name]).map((name) => funcMap[name]),
    [pinned, funcMap]
  );

  const filteredFunctions = React.useMemo(() => {
    if (!normalizedQuery) return functions;
    const queryLower = normalizedQuery;
    return functions.filter((f) => f.name.toLowerCase().includes(queryLower));
  }, [functions, normalizedQuery]);

  const called = React.useMemo(() => {
    const set = new Set();
    functions.forEach((f) => f.calls && f.calls.forEach((c) => set.add(c)));
    return set;
  }, [functions]);

  const roots = React.useMemo(
    () => functions.filter((f) => !called.has(f.name)),
    [functions, called]
  );

  return (
    <div>
      <div className="p-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter functions"
          className="w-full p-1 rounded text-black"
          aria-label="Filter functions"
        />
      </div>
      {favorites.length > 0 && (
        <div className="px-2 mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">
            Favorites
          </h3>
          <ul className="text-sm space-y-1">
            {favorites.map((func) => {
              const isPinned = pinnedSet.has(func.name);
              return (
                <li key={`fav-${func.name}`}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(func.name)}
                      className={`flex-1 text-left ${
                        selected === func.name ? 'font-bold' : ''
                      }`}
                    >
                      {func.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(func.name);
                      }}
                      aria-pressed={isPinned}
                      aria-label={`Unpin ${func.name}`}
                      className="text-xs"
                    >
                      ★
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {normalizedQuery ? (
        <ul className="p-2 text-sm space-y-1">
          {filteredFunctions.map((func) => {
            const isPinned = pinnedSet.has(func.name);
            return (
              <li key={func.name}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(func.name)}
                    className={`flex-1 text-left ${
                      selected === func.name ? 'font-bold' : ''
                    }`}
                  >
                    {func.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(func.name);
                    }}
                    aria-pressed={isPinned}
                    aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${func.name}`}
                    className="text-xs"
                  >
                    {isPinned ? '★' : '☆'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="p-2 text-sm space-y-1">
          {roots.map((f) => (
            <FunctionNode
              key={f.name}
              func={f}
              funcMap={funcMap}
              onSelect={onSelect}
              selected={selected}
              onTogglePin={onTogglePin}
              pinned={pinnedSet}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
