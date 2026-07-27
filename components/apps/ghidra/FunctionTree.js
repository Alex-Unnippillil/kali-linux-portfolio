import React from 'react';

function FunctionNode({ func, funcMap, onSelect, selected }) {
  return (
    <li>
      <button
        onClick={() => onSelect(func.name)}
        className={`text-left w-full ${selected === func.name ? 'font-bold' : ''}`}
      >
        {func.displayName || func.name}
      </button>
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

export default function FunctionTree({ functions, onSelect, selected }) {
  const funcMap = React.useMemo(() => {
    const map = {};
    functions.forEach((f) => {
      map[f.name] = f;
    });
    return map;
  }, [functions]);

  const called = React.useMemo(() => {
    const set = new Set();
    functions.forEach((f) => f.calls && f.calls.forEach((c) => set.add(c)));
    return set;
  }, [functions]);

  const roots = functions.filter((f) => !called.has(f.name));

  return (
    <ul className="p-2 text-sm space-y-1">
      {roots.map((f) => (
        <FunctionNode
          key={f.name}
          func={f}
          funcMap={funcMap}
          onSelect={onSelect}
          selected={selected}
        />
      ))}
    </ul>
  );
}
